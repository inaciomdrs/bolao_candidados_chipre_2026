import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'bolao_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a CSRF token, stores it in a cookie, and returns it.
 */
export async function generateCsrfToken(): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60, // 1 hour
    });
    return token;
}

/**
 * Validates a CSRF token from the request header against the cookie.
 */
export async function validateCsrfToken(headerToken: string | null): Promise<boolean> {
    if (!headerToken) return false;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    if (!cookieToken) return false;

    // Constant-time comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(headerToken),
            Buffer.from(cookieToken)
        );
    } catch {
        return false;
    }
}
