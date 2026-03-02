import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
    const secret = process.env.SECRET_KEY;
    if (!secret) throw new Error('SECRET_KEY env variable is required');
    // Derive a 32-byte key from the secret using SHA-256
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64 string of: IV (12 bytes) + ciphertext + auth tag (16 bytes)
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Pack: IV + encrypted + tag
    const result = Buffer.concat([iv, encrypted, tag]);
    return result.toString('base64');
}

/**
 * Decrypts a base64 string encrypted with encrypt().
 */
export function decrypt(encryptedBase64: string): string {
    const key = getKey();
    const data = Buffer.from(encryptedBase64, 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(data.length - TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

/**
 * Generate random backup codes (8 codes, 8 chars each)
 */
export function generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}
