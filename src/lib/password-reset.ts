import crypto from 'crypto';
import prisma from './prisma';

const DEFAULT_TTL_MINUTES = 30;

function hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getTtlMinutes(): number {
    const env = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
    const parsed = env ? parseInt(env, 10) : NaN;
    return isNaN(parsed) ? DEFAULT_TTL_MINUTES : parsed;
}

/**
 * Generates a secure random token, invalidates any previous tokens for the user,
 * stores the SHA-256 hash, and returns the raw token (to be sent via email).
 */
export async function generateResetToken(userId: number): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const ttl = getTtlMinutes();
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    // Invalidate previous unused tokens (mark as used)
    await prisma.passwordResetToken.updateMany({
        where: {
            userId,
            usedAt: null,
        },
        data: {
            usedAt: new Date(),
        },
    });

    await prisma.passwordResetToken.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
        },
    });

    return rawToken;
}

export interface TokenValidationResult {
    valid: boolean;
    error?: string;
    token?: { id: string; userId: number };
}

/**
 * Validates a raw token. Returns the token record if valid.
 */
export async function validateResetToken(rawToken: string): Promise<TokenValidationResult> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.passwordResetToken.findFirst({
        where: { tokenHash },
        include: { user: true },
    });

    if (!record) {
        return { valid: false, error: 'Este link é inválido.' };
    }
    if (record.usedAt) {
        return { valid: false, error: 'Este link já foi utilizado.' };
    }
    if (record.expiresAt < new Date()) {
        return { valid: false, error: 'Este link expirou. Solicite uma nova recuperação de senha.' };
    }
    if (!record.user.isActive || record.user.deletedAt) {
        return { valid: false, error: 'Esta conta não está disponível.' };
    }

    return { valid: true, token: { id: record.id, userId: record.userId } };
}

/**
 * Marks the token as used.
 */
export async function consumeResetToken(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
    });
}
