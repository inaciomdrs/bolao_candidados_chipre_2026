import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { createSession, setSessionCookie } from '@/lib/sessions';
import { consumeRateLimit, loginRateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // Rate limit
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const allowed = await consumeRateLimit(loginRateLimiter, ip);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios.' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user || !user.isActive || user.deletedAt) {
            return NextResponse.json(
                { error: 'Email ou senha incorretos.' },
                { status: 401 }
            );
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return NextResponse.json(
                { error: 'Email ou senha incorretos.' },
                { status: 401 }
            );
        }

        // If TOTP is enabled, require verification
        if (user.totpEnabled) {
            // Create a temporary session that requires TOTP
            const userAgent = request.headers.get('user-agent') || undefined;
            const ipAddress = request.headers.get('x-forwarded-for') || undefined;
            const sessionId = await createSession(user.id, { userAgent, ipAddress });

            // Store that this session needs TOTP verification
            await prisma.session.update({
                where: { id: sessionId },
                data: { data: JSON.stringify({ totpPending: true }) },
            });

            await setSessionCookie(sessionId);

            return NextResponse.json({
                requireTotp: true,
                message: 'Verificação de dois fatores necessária.',
            });
        }

        // Create full session
        const userAgent = request.headers.get('user-agent') || undefined;
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;
        const sessionId = await createSession(user.id, { userAgent, ipAddress });
        await setSessionCookie(sessionId);

        return NextResponse.json({
            message: 'Login realizado com sucesso!',
            user: { id: user.id, name: user.name, role: user.role },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
