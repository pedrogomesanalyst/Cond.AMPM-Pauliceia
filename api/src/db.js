import pg from 'pg';
import {env} from './config.js';
const {Pool}=pg;
export const db=new Pool({connectionString:env.databaseUrl, ssl:env.pgSsl ? {rejectUnauthorized:true} : undefined, max:10, idleTimeoutMillis:30000});
export const query=(sql,params=[])=>db.query(sql,params);
export async function tx(fn) {
 const client=await db.connect();
 try {await client.query('BEGIN');const v=await fn(client);await client.query('COMMIT');return v;}
 catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function audit(actor,action,detail='') {
 await query('INSERT INTO audit_logs(actor,action,detail) VALUES($1,$2,$3)',[String(actor),action,String(detail).slice(0,240)]);
}
