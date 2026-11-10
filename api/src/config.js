import 'dotenv/config';
export const env = {
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  pgSsl: process.env.PG_SSL === '1',
  alertEmail: process.env.AMPM_ALERT_EMAIL || '',
  brevoKey: process.env.BREVO_API_KEY || '',
  brevoSender: process.env.BREVO_SENDER_EMAIL || '',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'auto',
  s3Key: process.env.S3_ACCESS_KEY_ID || '',
  s3Secret: process.env.S3_SECRET_ACCESS_KEY || '',
};
export function verifyConfig() {
  if (!env.databaseUrl) throw Error('Configure DATABASE_URL');
  if (env.jwtSecret.length < 48) throw Error('Configure JWT_SECRET com pelo menos 48 caracteres aleatórios');
}
