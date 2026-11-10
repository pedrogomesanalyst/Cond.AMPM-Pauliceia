import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {env,verifyConfig} from './config.js';
import {query,tx,audit,db} from './db.js';
import {cookieName,csrfForToken,goodPassword,makeToken,newPassword,requireAuth,adminOnly,sessionCookie} from './security.js';
import {sendAlert} from './mail.js';
import {downloadPrivate,hasStorage,uploadPrivate} from './storage.js';
import {unitId,str,isoDate,clean,csvSafe,money} from './validation.js';

verifyConfig();
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'160kb'}));app.use(cookieParser());
app.use('/api/auth/login',rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api/auth/forgot',rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false}));
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const bad=(res,message='Dados inválidos.',status=400)=>res.status(status).json({error:message});
const take=(s,max=240)=>String(s??'').trim().slice(0,max);
const limit=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});
const viewer=a=>({username:a.username,role:a.role,unit:a.unit_number,mustChange:a.must_change});
const refreshCookie=(res,account)=>{const token=makeToken(account);sessionCookie(res,token);return csrfForToken(token);};

app.get('/api/health',asyncRoute(async(req,res)=>{await query('SELECT 1');res.json({status:'ok',service:'ampm-api'});}));
app.get('/api/version',(req,res)=>res.json({service:'ampm-api',version:'1.0.0'}));

app.post('/api/auth/login',asyncRoute(async(req,res)=>{
 const username=take(req.body?.unit,40);const password=req.body?.password;
 if(!username || typeof password!=='string')return bad(res);
 const r=await query('SELECT a.*,u.state FROM accounts a LEFT JOIN units u ON u.number=a.unit_number WHERE username=$1',[username]);
 const a=r.rows[0];const permitted=a && (a.role==='ADMIN'||a.state==='ATIVA');
 const valid=permitted && a.password_hash && (!a.locked_until || new Date(a.locked_until).getTime()<=Date.now()) && await bcrypt.compare(password,a.password_hash);
 if(!valid){
  if(a){await query("UPDATE accounts SET failed_count=CASE WHEN failed_count>=4 THEN 0 ELSE failed_count+1 END,locked_until=CASE WHEN failed_count>=4 THEN NOW()+INTERVAL '15 minutes' ELSE locked_until END WHERE id=$1",[a.id]);}
  return bad(res,'Credenciais inválidas ou acesso temporariamente bloqueado.',401);
 }
 await query('UPDATE accounts SET failed_count=0,locked_until=NULL WHERE id=$1',[a.id]);
 a.failed_count=0;a.locked_until=null;
 const csrf=refreshCookie(res,a);
 await audit(username,'LOGIN');
 res.json({user:viewer(a),csrf});
}));
app.post('/api/auth/forgot',asyncRoute(async(req,res)=>{
 const unit=take(req.body?.unit,24);
 if(unitId(unit)){
  const found=await query("SELECT 1 FROM accounts WHERE username=$1 AND role='MORADOR'",[unit]);
  if(found.rowCount){
   await query('INSERT INTO reset_requests(unit_number) VALUES($1)',[unit]);
   await audit(unit,'RECUPERACAO_SOLICITADA');
   await sendAlert('AMPM Paulicéia — solicitação de recuperação',`Solicitação de recuperação da unidade ${unit}. Verifique a identidade do solicitante no painel antes de emitir credencial temporária. Nenhuma senha foi alterada.`);
  }
 }
 res.json({message:'Se a unidade estiver cadastrada, a solicitação será encaminhada à administração.'});
}));
app.get('/api/auth/me',requireAuth,(req,res)=>res.json({user:viewer(req.account),csrf:csrfForToken(req.token)}));
app.post('/api/auth/logout',requireAuth,asyncRoute(async(req,res)=>{res.clearCookie(cookieName,{path:'/',sameSite:'lax',secure:env.production});res.json({ok:true});}));
app.post('/api/auth/change-password',requireAuth,asyncRoute(async(req,res)=>{
 const current=req.body?.currentPassword,next=req.body?.newPassword;
 if(!goodPassword(next))return bad(res,'A senha precisa ter pelo menos 12 caracteres, letras e números.');
 const r=await query('SELECT * FROM accounts WHERE id=$1',[req.account.id]);const account=r.rows[0];
 if(!account||typeof current!=='string'||!account.password_hash||!await bcrypt.compare(current,account.password_hash))return bad(res,'Senha atual incorreta.',403);
 if(await bcrypt.compare(next,account.password_hash))return bad(res,'Escolha uma senha diferente da anterior.');
 const hash=await bcrypt.hash(next,12);
 const u=await query('UPDATE accounts SET password_hash=$1,must_change=false,password_version=password_version+1,last_password_change=NOW() WHERE id=$2 RETURNING *',[hash,account.id]);
 await audit(req.account.username,'SENHA_ALTERADA');
 await sendAlert('AMPM Paulicéia — senha alterada',`A senha do acesso ${req.account.username} foi alterada. Se a alteração não foi autorizada, revise o acesso administrativo.`);
 const csrf=refreshCookie(res,u.rows[0]);res.json({ok:true,user:viewer(u.rows[0]),csrf});
}));

app.use('/api',requireAuth);
app.get('/api/overview',asyncRoute(async(req,res)=>{
 const a=req.account;
 if(a.role==='ADMIN'){
  const [units,open,resets,bookings]=await Promise.all([
   query('SELECT COUNT(*)::int AS n FROM units'),query("SELECT COUNT(*)::int AS n FROM tickets WHERE status!='CONCLUIDO'"),
   query("SELECT COUNT(*)::int AS n FROM reset_requests WHERE status='PENDENTE'"),query("SELECT COUNT(*)::int AS n FROM reservations WHERE status='SOLICITADA'")]);
  return res.json({units:units.rows[0].n,openTickets:open.rows[0].n,resetRequests:resets.rows[0].n,openBookings:bookings.rows[0].n});
 }
 const [unit,charges,tickets,reservations]=await Promise.all([
  query('SELECT number,floor,owner_name,resident_name,email,phone,state FROM units WHERE number=$1',[a.unit_number]),
  query('SELECT COUNT(*)::int AS n FROM charges WHERE unit_number=$1',[a.unit_number]),
  query('SELECT COUNT(*)::int AS n FROM tickets WHERE unit_number=$1',[a.unit_number]),
  query('SELECT COUNT(*)::int AS n FROM reservations WHERE unit_number=$1',[a.unit_number])
 ]);
 res.json({unit:unit.rows[0],charges:charges.rows[0].n,tickets:tickets.rows[0].n,reservations:reservations.rows[0].n});
}));
app.get('/api/announcements',asyncRoute(async(req,res)=>{const r=await query('SELECT id,title,content,created_at FROM announcements ORDER BY created_at DESC LIMIT 100');res.json(r.rows);}));
app.get('/api/charges',asyncRoute(async(req,res)=>{
 const a=req.account;const r=await query(a.role==='ADMIN'?'SELECT * FROM charges ORDER BY due_date DESC LIMIT 400':'SELECT * FROM charges WHERE unit_number=$1 ORDER BY due_date DESC LIMIT 100',a.role==='ADMIN'?[]:[a.unit_number]);res.json(r.rows);
}));
app.get('/api/reservations',asyncRoute(async(req,res)=>{const a=req.account;const r=await query(a.role==='ADMIN'?'SELECT * FROM reservations ORDER BY booking_date DESC LIMIT 250':'SELECT * FROM reservations WHERE unit_number=$1 ORDER BY booking_date DESC LIMIT 100',a.role==='ADMIN'?[]:[a.unit_number]);res.json(r.rows);}));
app.post('/api/reservations',asyncRoute(async(req,res)=>{
 if(req.account.role==='ADMIN')return bad(res,'Use uma unidade de morador.',403);
 const date=req.body?.date,area=take(req.body?.area,100);
 if(!isoDate(date)||area!=='Salão de festas'||date<new Date().toISOString().slice(0,10))return bad(res);
 const conflict=await query("SELECT 1 FROM reservations WHERE area=$1 AND booking_date=$2 AND status='APROVADA'",[area,date]);if(conflict.rowCount)return bad(res,'Esta data já está reservada.',409);
 const r=await query('INSERT INTO reservations(unit_number,area,booking_date) VALUES($1,$2,$3) RETURNING *',[req.account.unit_number,area,date]);await audit(req.account.username,'RESERVA_SOLICITADA',date);res.status(201).json(r.rows[0]);
}));
app.get('/api/tickets',asyncRoute(async(req,res)=>{const a=req.account;const r=await query(a.role==='ADMIN'?'SELECT * FROM tickets ORDER BY created_at DESC LIMIT 300':'SELECT * FROM tickets WHERE unit_number=$1 ORDER BY created_at DESC LIMIT 100',a.role==='ADMIN'?[]:[a.unit_number]);res.json(r.rows);}));
app.post('/api/tickets',asyncRoute(async(req,res)=>{
 if(req.account.role==='ADMIN')return bad(res,'Use uma unidade de morador.',403);
 const subject=take(req.body?.subject,121),description=take(req.body?.description,2501);if(!str(subject,120)||!str(description,2500))return bad(res);
 const r=await query('INSERT INTO tickets(unit_number,subject,description) VALUES($1,$2,$3) RETURNING *',[req.account.unit_number,subject,description]);await audit(req.account.username,'CHAMADO_CRIADO');res.status(201).json(r.rows[0]);
}));
app.get('/api/visitors',asyncRoute(async(req,res)=>{const a=req.account;const r=await query(a.role==='ADMIN'?'SELECT * FROM visitors ORDER BY visit_date DESC LIMIT 300':'SELECT * FROM visitors WHERE unit_number=$1 ORDER BY visit_date DESC LIMIT 100',a.role==='ADMIN'?[]:[a.unit_number]);res.json(r.rows);}));
app.post('/api/visitors',asyncRoute(async(req,res)=>{
 if(req.account.role==='ADMIN')return bad(res,'Use uma unidade de morador.',403);
 const name=take(req.body?.name,121),date=req.body?.date;if(!str(name,120)||!isoDate(date)||date<new Date().toISOString().slice(0,10))return bad(res);
 const r=await query('INSERT INTO visitors(unit_number,visitor_name,visit_date) VALUES($1,$2,$3) RETURNING *',[req.account.unit_number,name,date]);await audit(req.account.username,'VISITANTE_CADASTRADO');res.status(201).json(r.rows[0]);
}));
app.get('/api/meetings',asyncRoute(async(req,res)=>{const r=await query('SELECT id,title,scheduled_for,access_url,notes FROM meetings ORDER BY scheduled_for DESC LIMIT 100');res.json(r.rows);}));
app.get('/api/documents',asyncRoute(async(req,res)=>{const r=await query(req.account.role==='ADMIN'?'SELECT id,title,content_type,size_bytes,created_at,visibility FROM documents ORDER BY created_at DESC LIMIT 100':"SELECT id,title,content_type,size_bytes,created_at,visibility FROM documents WHERE visibility='TODOS' ORDER BY created_at DESC LIMIT 100");res.json(r.rows);}));
app.get('/api/documents/:id/download',asyncRoute(async(req,res)=>{
 const r=await query('SELECT * FROM documents WHERE id=$1',[req.params.id]);const doc=r.rows[0];if(!doc||doc.visibility==='ADMIN'&&req.account.role!=='ADMIN')return bad(res,'Arquivo não encontrado.',404);
 const obj=await downloadPrivate(doc.storage_key);res.setHeader('Content-Type',doc.content_type);res.setHeader('Content-Disposition',`attachment; filename="documento-${doc.id}"`);res.setHeader('Cache-Control','private, no-store');obj.Body.on('error',()=>res.destroy());obj.Body.pipe(res);
}));

const admin=express.Router();admin.use(adminOnly);
admin.get('/units',asyncRoute(async(req,res)=>{const r=await query("SELECT u.*,a.must_change,a.password_hash IS NOT NULL AS credential_issued,a.last_password_change FROM units u JOIN accounts a ON a.unit_number=u.number ORDER BY u.floor,u.number LIMIT 5000");res.json(r.rows);}));
admin.patch('/units/:unit',asyncRoute(async(req,res)=>{
 const unit=req.params.unit;const u=req.body||{};if(!unitId(unit)||!['ATIVA','INATIVA'].includes(u.state))return bad(res);
 const r=await query('UPDATE units SET owner_name=$1,resident_name=$2,email=$3,phone=$4,state=$5 WHERE number=$6 RETURNING *',[take(u.owner_name,200),take(u.resident_name,200),take(u.email,200),take(u.phone,40),u.state,unit]);if(!r.rowCount)return bad(res,'Unidade não encontrada.',404);
 await audit(req.account.username,'UNIDADE_ATUALIZADA',unit);res.json(r.rows[0]);
}));
admin.post('/provision',asyncRoute(async(req,res)=>{
 const unit=take(req.body?.unit,24);if(!unitId(unit))return bad(res);
 const row=await query("SELECT a.id FROM accounts a JOIN units u ON u.number=a.unit_number WHERE a.username=$1 AND u.state='ATIVA'",[unit]);if(!row.rowCount)return bad(res,'Unidade não encontrada.',404);
 const password=newPassword();const hash=await bcrypt.hash(password,12);
 await query('UPDATE accounts SET password_hash=$1,must_change=true,password_version=password_version+1,failed_count=0,locked_until=NULL WHERE id=$2',[hash,row.rows[0].id]);
 await audit(req.account.username,'CREDENCIAL_TEMPORARIA_EMITIDA',unit);
 res.json({unit,temporaryPassword:password,message:'Exibida apenas uma vez. Entregue após confirmar a identidade do morador.'});
}));
admin.get('/reset-requests',asyncRoute(async(req,res)=>{const r=await query("SELECT * FROM reset_requests ORDER BY created_at DESC LIMIT 200");res.json(r.rows);}));
admin.post('/reset-requests/:id/resolve',asyncRoute(async(req,res)=>{
 if(req.body?.identityVerified!==true)return bad(res,'Confirme a identidade antes de emitir a credencial.');
 const result=await tx(async c=>{
  const rr=await c.query("SELECT * FROM reset_requests WHERE id=$1 AND status='PENDENTE' FOR UPDATE",[req.params.id]);if(!rr.rowCount)return null;
  const password=newPassword(),hash=await bcrypt.hash(password,12),unit=rr.rows[0].unit_number;
  await c.query('UPDATE accounts SET password_hash=$1,must_change=true,password_version=password_version+1,failed_count=0,locked_until=NULL WHERE username=$2',[hash,unit]);
  await c.query("UPDATE reset_requests SET status='RESOLVIDA',resolved_at=NOW() WHERE id=$1",[req.params.id]);
  return {unit,temporaryPassword:password};
 });if(!result)return bad(res,'Pedido não encontrado ou já resolvido.',404);
 await audit(req.account.username,'RECUPERACAO_CONCLUIDA',result.unit);res.json(result);
}));
admin.post('/announcements',asyncRoute(async(req,res)=>{const title=take(req.body?.title,141),content=take(req.body?.content,6001);if(!str(title,140)||!str(content,6000))return bad(res);const r=await query('INSERT INTO announcements(title,content) VALUES($1,$2) RETURNING *',[title,content]);await audit(req.account.username,'COMUNICADO_PUBLICADO');res.status(201).json(r.rows[0]);}));
admin.post('/charges',asyncRoute(async(req,res)=>{
 const unit=take(req.body?.unit,24),competence=take(req.body?.competence,7),amount=money(req.body?.amount),date=req.body?.dueDate;
 if(!unitId(unit)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)||amount===null||!isoDate(date))return bad(res);
 const found=await query('SELECT 1 FROM units WHERE number=$1',[unit]);if(!found.rowCount)return bad(res,'Unidade não encontrada.',404);
 const r=await query('INSERT INTO charges(unit_number,competence,due_date,amount) VALUES($1,$2,$3,$4) RETURNING *',[unit,competence,date,amount]);await audit(req.account.username,'COBRANCA_CADASTRADA',unit);res.status(201).json(r.rows[0]);
}));
admin.patch('/charges/:id',asyncRoute(async(req,res)=>{
 if(!['PENDENTE','PAGO','VENCIDO'].includes(req.body?.status))return bad(res);
 const r=await query('UPDATE charges SET status=$1 WHERE id=$2 RETURNING *',[req.body.status,req.params.id]);if(!r.rowCount)return bad(res,'Cobrança não encontrada.',404);
 await audit(req.account.username,'STATUS_FINANCEIRO_ALTERADO',String(req.params.id));res.json(r.rows[0]);
}));
admin.patch('/reservations/:id',asyncRoute(async(req,res)=>{
 const status=req.body?.status;if(!['APROVADA','NEGADA','CANCELADA'].includes(status))return bad(res);
 try{const r=await query('UPDATE reservations SET status=$1 WHERE id=$2 RETURNING *',[status,req.params.id]);if(!r.rowCount)return bad(res,'Reserva não encontrada.',404);await audit(req.account.username,'RESERVA_REVISADA',String(req.params.id));res.json(r.rows[0]);}
 catch(e){if(e.code==='23505')return bad(res,'Outra reserva já foi aprovada para esta área e data.',409);throw e;}
}));
admin.patch('/tickets/:id',asyncRoute(async(req,res)=>{
 const status=req.body?.status;if(!['ABERTO','EM_ANDAMENTO','CONCLUIDO'].includes(status))return bad(res);const r=await query('UPDATE tickets SET status=$1 WHERE id=$2 RETURNING *',[status,req.params.id]);if(!r.rowCount)return bad(res,'Chamado não encontrado.',404);await audit(req.account.username,'CHAMADO_REVISADO',String(req.params.id));res.json(r.rows[0]);
}));
admin.patch('/visitors/:id',asyncRoute(async(req,res)=>{
 const status=req.body?.status;if(!['APROVADO','NEGADO'].includes(status))return bad(res);const r=await query('UPDATE visitors SET status=$1 WHERE id=$2 RETURNING *',[status,req.params.id]);if(!r.rowCount)return bad(res,'Visitante não encontrado.',404);await audit(req.account.username,'VISITANTE_REVISADO',String(req.params.id));res.json(r.rows[0]);
}));
admin.post('/meetings',asyncRoute(async(req,res)=>{
 const title=take(req.body?.title,141),date=req.body?.scheduledFor,url=take(req.body?.url,1000),notes=take(req.body?.notes,1500);
 if(!str(title,140)||!date||Number.isNaN(Date.parse(date))||(url&&(!/^https:\/\//.test(url)||url.length>500)))return bad(res);
 const r=await query('INSERT INTO meetings(title,scheduled_for,access_url,notes) VALUES($1,$2,$3,$4) RETURNING *',[title,new Date(date),url||null,notes]);await audit(req.account.username,'ASSEMBLEIA_CADASTRADA');res.status(201).json(r.rows[0]);
}));
const allowedFile={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
function safeMime(filename,buffer){const name=filename.toLowerCase(),ext=Object.keys(allowedFile).find(e=>name.endsWith(e));if(!ext)return null;
 const h=buffer.subarray(0,12);
 if(ext==='.pdf'&&h.subarray(0,5).toString()!=='%PDF-')return null;
 if(ext==='.png'&&h.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return null;
 if(['.jpg','.jpeg'].includes(ext)&&h.subarray(0,3).toString('hex')!=='ffd8ff')return null;
 if(ext==='.webp'&&!(h.subarray(0,4).toString()==='RIFF'&&h.subarray(8,12).toString()==='WEBP'))return null;
 if(['.docx','.xlsx'].includes(ext)&&h.subarray(0,4).toString('hex')!=='504b0304')return null;
 return allowedFile[ext];}
admin.post('/documents',limit.single('file'),asyncRoute(async(req,res)=>{
 if(!hasStorage())return bad(res,'Configure armazenamento privado S3/R2 para ativar documentos.',503);
 if(!req.file||!str(req.body?.title,140))return bad(res);
 const contentType=safeMime(req.file.originalname,req.file.buffer);if(!contentType)return bad(res,'Formato ou conteúdo do arquivo não permitido.');
 const visibility=req.body.visibility==='ADMIN'?'ADMIN':'TODOS';const key='documents/'+crypto.randomUUID();
 await uploadPrivate(key,req.file.buffer,contentType);
 const r=await query('INSERT INTO documents(title,storage_key,content_type,size_bytes,visibility) VALUES($1,$2,$3,$4,$5) RETURNING id,title,visibility',[take(req.body.title,140),key,contentType,req.file.size,visibility]);
 await audit(req.account.username,'DOCUMENTO_ENVIADO',r.rows[0].id);res.status(201).json(r.rows[0]);
}));
admin.post('/import-units',limit.single('file'),asyncRoute(async(req,res)=>{
 if(!req.file||!req.file.originalname.toLowerCase().endsWith('.xlsx'))return bad(res,'Envie um arquivo .xlsx válido.');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(req.file.buffer);}catch{return bad(res,'Planilha inválida.');}
 const sheet=book.worksheets[0];if(!sheet||sheet.rowCount>5001)return bad(res,'A planilha deve conter até 5.000 unidades.');
 const expected=['Unidade','Andar','Proprietário','Morador','E-mail','Telefone','Status'];
 const header=sheet.getRow(1).values.slice(1).map(x=>String(x||'').trim());
 if(expected.some((x,i)=>x!==header[i]))return bad(res,'Cabeçalhos inválidos. Consulte a planilha mestre.');
 const rows=[];const ids=new Set();
 for(let i=2;i<=sheet.rowCount;i++){
  const v=sheet.getRow(i).values.slice(1);if(v.every(x=>x==null||x===''))continue;
  const n=take(v[0],24),floor=Number(v[1]);if(!unitId(n)||ids.has(n)||!Number.isInteger(floor)||floor<0||floor>200||!['ATIVA','INATIVA'].includes(take(v[6],10)))return bad(res,`Dados inválidos na linha ${i}.`);
  ids.add(n);rows.push({n,floor,owner:take(v[2],180),resident:take(v[3],180),email:take(v[4]?.text||v[4],180),phone:take(v[5],40),state:take(v[6],10)});
 }
 await tx(async c=>{for(const u of rows){await c.query(`INSERT INTO units(number,floor,owner_name,resident_name,email,phone,state) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(number) DO UPDATE SET floor=EXCLUDED.floor,owner_name=EXCLUDED.owner_name,resident_name=EXCLUDED.resident_name,email=EXCLUDED.email,phone=EXCLUDED.phone,state=EXCLUDED.state`,[u.n,u.floor,u.owner,u.resident,u.email,u.phone,u.state]);await c.query("INSERT INTO accounts(username,unit_number,role) VALUES($1,$2,'MORADOR') ON CONFLICT(username) DO NOTHING",[u.n,u.n]);}});
 await audit(req.account.username,'UNIDADES_IMPORTADAS',String(rows.length));res.json({imported:rows.length,note:'Nenhuma senha ou histórico foi sobrescrito.'});
}));
admin.get('/export-units',asyncRoute(async(req,res)=>{
 const records=await query('SELECT u.number,u.floor,u.owner_name,u.resident_name,u.email,u.phone,u.state,a.must_change,a.last_password_change FROM units u JOIN accounts a ON u.number=a.unit_number ORDER BY u.floor,u.number');
 const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Unidades');const columns=['Unidade','Andar','Proprietário','Morador','E-mail','Telefone','Status','Primeiro Acesso','Última troca'];ws.addRow(columns);
 records.rows.forEach(r=>ws.addRow([csvSafe(r.number),r.floor,csvSafe(r.owner_name),csvSafe(r.resident_name),csvSafe(r.email),csvSafe(r.phone),r.state,r.must_change?'SIM':'NÃO',r.last_password_change||'']));
 ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF103B65'}};ws.columns.forEach(c=>c.width=22);
 res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="AMPM_Unidades_Export.xlsx"');await wb.xlsx.write(res);res.end();
}));
admin.get('/export-summary.pdf',asyncRoute(async(req,res)=>{
 const [units,tickets,reservations,charges]=await Promise.all([
  query('SELECT COUNT(*)::int AS n FROM units'),
  query("SELECT COUNT(*)::int AS n FROM tickets WHERE status!='CONCLUIDO'"),
  query("SELECT COUNT(*)::int AS n FROM reservations WHERE status='SOLICITADA'"),
  query("SELECT COUNT(*)::int AS n FROM charges WHERE status='PENDENTE'")
 ]);
 res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="AMPM_Relatorio_Gerencial.pdf"');
 const pdf=new PDFDocument({size:'A4',margin:55,info:{Title:'AMPM Paulicéia - Relatório Gerencial'}});pdf.pipe(res);
 pdf.fontSize(22).fillColor('#0b2c53').text('AMPM Paulicéia');
 pdf.fontSize(13).fillColor('#55718f').text('Relatório gerencial · '+new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}));
 pdf.moveDown(2).fontSize(13).fillColor('#163753');
 for(const [label,r] of [['Unidades cadastradas',units],['Chamados em aberto',tickets],['Reservas solicitadas',reservations],['Cobranças pendentes',charges]])pdf.text(label+': '+r.rows[0].n,{lineGap:12});
 pdf.moveDown().fontSize(10).fillColor('#61778e').text('Dados extraídos do banco PostgreSQL no momento da geração. Situações financeiras são registradas pela administração.');
 pdf.end();
}));
admin.get('/audit',asyncRoute(async(req,res)=>{const r=await query('SELECT actor,action,detail,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 250');res.json(r.rows);}));
app.use('/api/admin',admin);
app.use((req,res)=>res.status(404).json({error:'Rota não encontrada.'}));
app.use((error,req,res,next)=>{console.error('Erro na API:',error.code||error.name||'Unknown');if(error instanceof multer.MulterError)return res.status(400).json({error:'Arquivo excedeu o limite ou envio inválido.'});res.status(500).json({error:'Erro interno. Consulte os logs técnicos.'});});
const server=app.listen(env.port,'0.0.0.0',()=>console.log(`AMPM API na porta ${env.port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>db.end().finally(()=>process.exit(0)));setTimeout(()=>process.exit(1),8000).unref();});
