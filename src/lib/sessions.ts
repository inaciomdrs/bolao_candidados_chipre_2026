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
 */
export async function createSession(userId: number): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_HOURS * 60 * 60 * 1000);

    await prisma.session.create({
        data: {
            id: sessionId,
            userId,
            expiresAt,
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
 * Returns null if no valid session found.
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

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        totpEnabled: session.user.totpEnabled,
    };
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
