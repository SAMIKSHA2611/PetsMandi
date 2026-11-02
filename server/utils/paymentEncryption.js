const crypto = require('crypto');

const key = crypto
  .createHash('sha256')
  .update(process.env.PAYMENT_DATA_KEY || process.env.JWT_SECRET || 'petsmandi-payment-key')
  .digest();

function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(value) {
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length !== 3) return value;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'hex'));
    decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

module.exports = { encrypt, decrypt };
