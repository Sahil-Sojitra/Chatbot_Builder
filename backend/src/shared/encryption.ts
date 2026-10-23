import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM
const PREFIX = 'enc:v1:';

/**
 * Derives a strictly 32-byte (256-bit) buffer key from the configured secret.
 */
const getEncryptionKey = (): Buffer => {
  const secret = env.LLM_ENCRYPTION_SECRET || env.JWT_ACCESS_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a sensitive string (such as an LLM API key) using AES-256-GCM.
 * Returns a versioned string in the format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export const encryptSecret = (plainText: string): string => {
  if (!plainText) {
    return plainText;
  }

  // If already encrypted, don't re-encrypt
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts a sensitive string that was encrypted with encryptSecret.
 * If the string does not match the encrypted format (e.g., legacy unencrypted data),
 * it returns the string as-is for backward compatibility.
 */
export const decryptSecret = (cipherTextOrPlain: string): string => {
  if (!cipherTextOrPlain) {
    return cipherTextOrPlain;
  }

  if (!cipherTextOrPlain.startsWith(PREFIX)) {
    // Unencrypted legacy key
    return cipherTextOrPlain;
  }

  try {
    const payload = cipherTextOrPlain.slice(PREFIX.length);
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Malformed encrypted secret format');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // Prevent sensitive error leakage
    throw new Error('Failed to decrypt sensitive credential: verification tag mismatch or corrupt payload');
  }
};

/**
 * Safely masks an API key (plain or encrypted) for display in responses.
 * Leaves only the first 4 and last 4 characters visible, e.g. "sk-a••••••••99ab".
 * Returns null if no key is present.
 */
export const maskApiKey = (rawOrEncryptedKey: string | null | undefined): string | null => {
  if (!rawOrEncryptedKey) {
    return null;
  }

  try {
    const plain = decryptSecret(rawOrEncryptedKey).trim();
    if (!plain) {
      return null;
    }
    if (plain.length <= 8) {
      return '••••••••';
    }
    return `${plain.slice(0, 4)}••••••••${plain.slice(-4)}`;
  } catch {
    return '••••••••';
  }
};
