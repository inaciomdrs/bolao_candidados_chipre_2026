import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { validateResetToken, consumeResetToken } from '@/lib/password-reset';
import { revokeAllUserSessions } from '@/lib/sessions';
import { sendEmail, buildPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token e nova senha são obrigatórios.' },
                { status: 400 }
            );
        }

        // Password complexity check
        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'A senha deve conter letras maiúsculas, minúsculas e números.' },
                { status: 400 }
            );
        }

        // Validate token
        const result = await validateResetToken(token);
        if (!result.valid || !result.token) {
            return NextResponse.json({ error: result.error ?? 'Token inválido.' }, { status: 400 });
        }

        const { id: tokenId, userId } = result.token;

        // Update password
        const newHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        // Mark token as used
        await consumeResetToken(tokenId);

        // Revoke all sessions
        await revokeAllUserSessions(userId);

        // Security alert
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            await sendEmail({
                to: user.email,
                subject: 'Sua senha foi redefinida',
                html: buildPasswordResetEmail(),
            });
        }

        return NextResponse.json({ message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
