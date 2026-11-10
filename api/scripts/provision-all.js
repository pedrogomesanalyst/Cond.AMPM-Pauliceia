/** Emite credenciais INDIVIDUAIS para unidades ainda não provisionadas.
 *  Uso: ALLOW_BULK_PROVISION=yes node scripts/provision-all.js /pasta/PRIVADA/credenciais.csv
 *  Nunca coloque o CSV no GitHub; apague após distribuição segura.
 */
import {open,chmod,mkdir,unlink} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import bcrypt from 'bcryptjs';
import {db,tx} from '../src/db.js';
import {verifyConfig} from '../src/config.js';
import {newPassword} from '../src/security.js';
verifyConfig();
if(process.env.ALLOW_BULK_PROVISION!=='yes'||!process.argv[2])throw Error('Defina ALLOW_BULK_PROVISION=yes e caminho privado de saída CSV.');
const output=resolve(process.argv[2]);if(output.includes('/api/')||output.includes('/web/'))throw Error('Não salve credenciais dentro do código-fonte.');
const rows=['Unidade;Senha_Temporaria_Individual'];
await mkdir(dirname(output),{recursive:true});
const handle=await open(output,'wx',0o600);
let completed=false;
try{
 await tx(async c=>{
  const r=await c.query("SELECT a.id,a.username FROM accounts a JOIN units u ON u.number=a.unit_number WHERE a.password_hash IS NULL AND a.role='MORADOR' AND u.state='ATIVA' ORDER BY a.username FOR UPDATE OF a");
  for(const a of r.rows){const password=newPassword();await c.query('UPDATE accounts SET password_hash=$1,must_change=true,password_version=password_version+1 WHERE id=$2',[await bcrypt.hash(password,12),a.id]);rows.push(a.username+';'+password);}
  await handle.writeFile(rows.join('\n')+'\n');
 });
 await chmod(output,0o600);completed=true;
 console.log('Credenciais individuais geradas:',rows.length-1,'(nunca compartilhe o arquivo inteiro)');
}finally{await handle.close();if(!completed)await unlink(output).catch(()=>{});await db.end();}
