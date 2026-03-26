import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from './prisma';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'bolao_session';
const SESSION_MAX_AGE_HOURS = 24;

export interface SessionUser {
    id: number;
    email: string;
    name: string;
    role: string;
    totpEnabled: boolean;
}

/**
 * Creates a new session in the DB and returns the session ID.
 * Optionally stores device metadata (userAgent, ipAddress).
 */
export async function createSession(
    userId: number,
    metadata?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_HOURS * 60 * 60 * 1000);

    await prisma.session.create({
        data: {
            id: sessionId,
            userId,
            expiresAt,
            userAgent: metadata?.userAgent ? metadata.userAgent.substring(0, 200) : null,
            ipAddress: metadata?.ipAddress
                ? crypto.createHash('sha256').update(metadata.ipAddress).digest('hex').substring(0, 16)
                : null,
            lastActiveAt: new Date(),
        },
    });

    return sessionId;
}

/**
 * Sets the session cookie in the response.
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_HOURS * 60 * 60,
        path: '/',
    });
}

/**
 * Gets the current session user from the request cookies.
 * Returns null if no valid session found or user is soft-deleted.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) return null;

    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
        // Session expired, clean up
        await prisma.session.delete({ where: { id: sessionId } }).catch(() => { });
        return null;
    }
    if (!session.user.isActive) return null;
    if (session.user.deletedAt) return null; // soft-deleted user

    // Update last active timestamp
    prisma.session.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
    }).catch(() => { });

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        totpEnabled: session.user.totpEnabled,
    };
}

/**
 * Returns the current raw session ID from cookies (without full validation).
 */
export async function getSessionId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Destroys the current session.
 */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
        await prisma.session.delete({ where: { id: sessionId } }).catch(() => { });
        cookieStore.delete(SESSION_COOKIE_NAME);
    }
}

/**
 * Lists all active sessions for a user.
 */
export async function listUserSessions(
    userId: number,
    currentSessionId: string | null
): Promise<Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    lastActiveAt: Date;
    createdAt: Date;
    isCurrent: boolean;
}>> {
    const sessions = await prisma.session.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() },
        },
        orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        isCurrent: s.id === currentSessionId,
    }));
}

/**
 * Revokes a specific session (only if it belongs to the given userId).
 * Will not revoke the current session.
 */
export async function revokeSession(
    sessionId: string,
    userId: number,
    currentSessionId: string | null
): Promise<{ success: boolean; error?: string }> {
    if (sessionId === currentSessionId) {
        return { success: false, error: 'Não é possível revogar a sessão atual. Use o logout.' };
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
        return { success: false, error: 'Sessão não encontrada.' };
    }

    await prisma.session.delete({ where: { id: sessionId } });
    return { success: true };
}

/**
 * Revokes all sessions for a user except (optionally) the current one.
 */
export async function revokeAllUserSessions(
    userId: number,
    exceptSessionId?: string
): Promise<void> {
    await prisma.session.deleteMany({
        where: {
            userId,
            ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        },
    });
}

/**
 * Soft-deletes a user account.
 */
export async function softDeleteUser(userId: number, actorId: number): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            deletedAt: new Date(),
            deletedById: actorId,
            isActive: false,
        },
    });
    // Revoke all sessions
    await revokeAllUserSessions(userId);
}

/**
 * Middleware helper to require authentication.
 */
export async function requireAuth(): Promise<SessionUser> {
    const user = await getSessionUser();
    if (!user) {
        throw new Error('UNAUTHORIZED');
    }
    return user;
}

/**
 * Middleware helper to require manager role.
 */
export async function requireManager(): Promise<SessionUser> {
    const user = await requireAuth();
    if (user.role !== 'gerente') {
        throw new Error('FORBIDDEN');
    }
    return user;
}
