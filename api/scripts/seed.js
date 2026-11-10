import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import {db,tx} from '../src/db.js';
import {verifyConfig} from '../src/config.js';
verifyConfig();
const d=JSON.parse(fs.readFileSync(new URL('../seed-data.json',import.meta.url),'utf-8'));
const a=process.env.AMPM_ADMIN_INITIAL_PASSWORD;
try{
 const res=await tx(async c=>{
  for(const u of d.units){const n=String(u.Unidade).trim();await c.query('INSERT INTO units(number,floor,state) VALUES($1,$2,$3) ON CONFLICT(number) DO NOTHING',[n,u.Andar||null,u.Situacao_Unidade==='INATIVA'?'INATIVA':'ATIVA']);await c.query("INSERT INTO accounts(username,unit_number,role) VALUES($1,$2,'MORADOR') ON CONFLICT(username) DO NOTHING",[n,n]);}
  const existing=await c.query("SELECT id FROM accounts WHERE username='__admin__'");
  if(!existing.rowCount){if(!a||a.length<16)throw Error('Defina AMPM_ADMIN_INITIAL_PASSWORD (16+ caracteres) antes da primeira execução');await c.query("INSERT INTO accounts(username,role,password_hash,must_change) VALUES('__admin__','ADMIN',$1,true)",[await bcrypt.hash(a,12)]);}
  return d.units.length;
 });console.log('Unidades importadas:',res);
}finally{await db.end();}
