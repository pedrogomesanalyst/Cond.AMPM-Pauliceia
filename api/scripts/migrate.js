import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {db} from '../src/db.js';
import {verifyConfig} from '../src/config.js';
verifyConfig();
try{const sql=await readFile(resolve('sql/001_initial.sql'),'utf8');await db.query(sql);console.log('Migração concluída');}
finally{await db.end();}
