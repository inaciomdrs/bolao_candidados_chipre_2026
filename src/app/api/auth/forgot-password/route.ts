import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { consumeRateLimit, forgotPasswordRateLimiter } from '@/lib/rate-limit';
import { generateResetToken } from '@/lib/password-reset';
import { sendEmail, buildMagicLinkEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
        }

        const normalised = email.toLowerCase();

        // Find active, non-deleted user
        const user = await prisma.user.findUnique({ where: { email: normalised } });

        if (!user || !user.isActive || user.deletedAt) {
            return NextResponse.json({ error: 'E-mail não encontrado.' }, { status: 404 });
        }

        // Rate limit by email
        const allowed = await consumeRateLimit(forgotPasswordRateLimiter, normalised);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Muitas solicitações. Tente novamente em 30 minutos.' },
                { status: 429 }
            );
        }

        // Generate token and send email
        const rawToken = await generateResetToken(user.id);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: 'Recuperação de senha — Bolão 2026',
            html: buildMagicLinkEmail(resetUrl),
        });

        return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
