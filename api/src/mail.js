import {env} from './config.js';
export async function sendAlert(subject,text){
 if(!env.brevoKey || !env.brevoSender || !env.alertEmail)return false;
 try{
  const abort=AbortSignal.timeout(7500);
  const response=await fetch('https://api.brevo.com/v3/smtp/email',{
   method:'POST', signal:abort,
   headers:{'api-key':env.brevoKey,'content-type':'application/json'},
   body:JSON.stringify({sender:{name:'Portal AMPM Paulicéia',email:env.brevoSender},to:[{email:env.alertEmail}],subject,textContent:text})
  });
  if(!response.ok)console.error('Brevo HTTP',response.status);
  return response.ok;
 }catch(e){console.error('Falha de envio Brevo:',e.name);return false;}
}
