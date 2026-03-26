import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for login attempts: max 5 per minute per IP
export const loginRateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 60, // seconds
    keyPrefix: 'login',
});

// Rate limiter for registration: max 3 per 15 minutes per IP
export const registerRateLimiter = new RateLimiterMemory({
    points: 3,
    duration: 900,
    keyPrefix: 'register',
});

// Rate limiter for forgot-password: max 5 per 30 minutes per email
export const forgotPasswordRateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 1800, // 30 minutes in seconds
    keyPrefix: 'forgot_password',
});

// General API rate limiter: max 60 per minute per IP
export const apiRateLimiter = new RateLimiterMemory({
    points: 60,
    duration: 60,
    keyPrefix: 'api',
});

/**
 * Consume a rate limit point. Returns true if allowed, false if rate limited.
 */
export async function consumeRateLimit(
    limiter: RateLimiterMemory,
    key: string
): Promise<boolean> {
    try {
        await limiter.consume(key);
        return true;
    } catch {
        return false;
    }
}
