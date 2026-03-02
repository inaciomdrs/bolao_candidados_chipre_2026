import { encrypt, decrypt, generateBackupCodes } from '@/lib/crypto';

// Set up a test SECRET_KEY
process.env.SECRET_KEY = 'test-secret-key-for-unit-tests-32b';

describe('Crypto Module', () => {
    describe('encrypt/decrypt', () => {
        it('encrypts and decrypts a string correctly', () => {
            const plaintext = 'JBSWY3DPEHPK3PXP';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('produces different ciphertext each time (random IV)', () => {
            const plaintext = 'same-secret';
            const enc1 = encrypt(plaintext);
            const enc2 = encrypt(plaintext);

            expect(enc1).not.toBe(enc2);
            expect(decrypt(enc1)).toBe(plaintext);
            expect(decrypt(enc2)).toBe(plaintext);
        });

        it('handles empty string', () => {
            const encrypted = encrypt('');
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe('');
        });

        it('handles unicode characters', () => {
            const plaintext = 'Olá, xadrez! ♚♔';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('generateBackupCodes', () => {
        it('generates default 8 codes', () => {
            const codes = generateBackupCodes();
            expect(codes).toHaveLength(8);
        });

        it('generates codes of correct format (8 hex chars uppercase)', () => {
            const codes = generateBackupCodes();
            for (const code of codes) {
                expect(code).toMatch(/^[A-F0-9]{8}$/);
            }
        });

        it('generates specified number of codes', () => {
            const codes = generateBackupCodes(4);
            expect(codes).toHaveLength(4);
        });

        it('generates unique codes', () => {
            const codes = generateBackupCodes(100);
            const unique = new Set(codes);
            // With 100 random codes, collisions are extremely unlikely
            expect(unique.size).toBe(100);
        });
    });
});
