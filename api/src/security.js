import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {env} from './config.js';
import {query} from './db.js';
export const cookieName='ampm_session';
export function newPassword(){return crypto.randomBytes(24).toString('base64url');}
export function goodPassword(s){return typeof s==='string' && s.length>=12 && s.length<=128 && /[a-zA-Z]/.test(s) && /\d/.test(s) && !['123456','123456789','password123','senha123456'].includes(s.toLowerCase());}
export function makeToken(account){return jwt.sign({aid:String(account.id),pv:account.password_version,role:account.role},env.jwtSecret,{issuer:'ampm-portal',audience:'ampm-web',expiresIn:'6h'});}
export function csrfForToken(token){return crypto.createHmac('sha256',env.jwtSecret).update(`csrf:${token}`).digest('hex');}
export function checkCsrf(token,provided){if(typeof provided!=='string')return false;const expected=Buffer.from(csrfForToken(token));const actual=Buffer.from(provided);return actual.length===expected.length && crypto.timingSafeEqual(expected,actual);}
export function sessionCookie(res,token){res.cookie(cookieName,token,{httpOnly:true,secure:env.production,sameSite:'lax',path:'/',maxAge:6*3600*1000});}
export async function requireAuth(req,res,next){
 try{
  const token=req.cookies[cookieName];if(!token)return res.status(401).json({error:'Faça login.'});
  const p=jwt.verify(token,env.jwtSecret,{issuer:'ampm-portal',audience:'ampm-web'});
  const r=await query('SELECT id,username,role,unit_number,must_change,password_version FROM accounts WHERE id=$1',[p.aid]);
  const a=r.rows[0];if(!a || a.password_version!==p.pv)return res.status(401).json({error:'Sessão inválida.'});
  req.account=a;req.token=token;
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && !checkCsrf(token,req.get('x-csrf-token')))return res.status(403).json({error:'Token de segurança inválido.'});
  if(a.must_change && !req.path.startsWith('/auth/'))return res.status(403).json({error:'Troca de senha obrigatória.',mustChange:true});
  next();
 }catch(e){return res.status(401).json({error:'Sessão expirada.'});}
}
export function adminOnly(req,res,next){if(req.account.role!=='ADMIN')return res.status(403).json({error:'Acesso restrito.'});next();}
export function tenantFilter(a){return a.role==='ADMIN'?null:a.unit_number;}
