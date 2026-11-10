export function unitId(s){return typeof s==='string'&& /^[0-9]{2,6}$/.test(s.trim());}
export function str(s,max=255){return typeof s==='string'&&s.trim().length>0&&s.trim().length<=max;}
export function isoDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().startsWith(s);}
export function clean(s,max=250){return String(s??'').trim().slice(0,max);}
export function csvSafe(s){const v=String(s??'');return /^[=+@\-\t\r]/.test(v)?"'"+v:v;}
export function money(s){const n=Number(s);return Number.isFinite(n)&&n>=0&&n<=100000000?n:null;}
