import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
import {env} from './config.js';
const ready=!!(env.s3Bucket&&env.s3Endpoint&&env.s3Key&&env.s3Secret);
const client=ready?new S3Client({region:env.s3Region,endpoint:env.s3Endpoint,forcePathStyle:true,credentials:{accessKeyId:env.s3Key,secretAccessKey:env.s3Secret}}):null;
export function hasStorage(){return ready;}
export async function uploadPrivate(key,body,contentType){if(!client)throw Error('Armazenamento privado não configurado');await client.send(new PutObjectCommand({Bucket:env.s3Bucket,Key:key,Body:body,ContentType:contentType}));}
export async function downloadPrivate(key){if(!client)throw Error('Armazenamento privado não configurado');return client.send(new GetObjectCommand({Bucket:env.s3Bucket,Key:key}));}
