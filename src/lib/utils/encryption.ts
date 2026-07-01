import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Derive a 32-byte key from the environment secret
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Please add a strong random key to your .env.local file.'
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts cleartext using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted text (format "iv:ciphertext")
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Malformed encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const ciphertext = Buffer.from(parts[1], 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    console.error('Decryption error:', err.message);
    return '';
  }
}
