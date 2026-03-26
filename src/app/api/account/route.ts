import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {
    getSessionUser,
    getSessionId,
    revokeAllUserSessions,
} from '@/lib/sessions';
import {
    sendEmail,
    buildPasswordChangedEmail,
    buildEmailChangedEmail,
} from '@/lib/email';

export async function PUT(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { email, currentPassword, newPassword } = body;

        // ── Change Email ──────────────────────────────────────────────────────
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
            }

            const normalised = email.toLowerCase();

            // Block if email is taken (including soft-deleted accounts)
            const existing = await prisma.user.findUnique({ where: { email: normalised } });
            if (existing && existing.id !== user.id) {
                return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 409 });
            }

            const oldEmail = user.email;

            await prisma.user.update({
                where: { id: user.id },
                data: { email: normalised },
            });

            // Security alert to OLD email
            await sendEmail({
                to: oldEmail,
                subject: 'Seu e-mail foi alterado',
                html: buildEmailChangedEmail(normalised),
            });

            return NextResponse.json({ message: 'E-mail atualizado com sucesso.' });
        }

        // ── Change Password ───────────────────────────────────────────────────
        if (currentPassword !== undefined && newPassword !== undefined) {
            if (!currentPassword || !newPassword) {
                return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias.' }, { status: 400 });
            }

            // Complexity check
            if (newPassword.length < 8) {
                return NextResponse.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
            }
            if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                return NextResponse.json(
                    { error: 'A nova senha deve conter letras maiúsculas, minúsculas e números.' },
                    { status: 400 }
                );
            }

            // Verify current password
            const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
            if (!dbUser) {
                return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
            }

            const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
            if (!valid) {
                return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
            }

            const newHash = await bcrypt.hash(newPassword, 12);

            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newHash },
            });

            // Revoke all OTHER sessions
            const currentSessionId = await getSessionId();
            await revokeAllUserSessions(user.id, currentSessionId ?? undefined);

            // Security alert email
            await sendEmail({
                to: user.email,
                subject: 'Sua senha foi alterada',
                html: buildPasswordChangedEmail(),
            });

            return NextResponse.json({ message: 'Senha alterada com sucesso. Outras sessões foram encerradas.' });
        }

        return NextResponse.json({ error: 'Nenhuma operação válida especificada.' }, { status: 400 });
    } catch (error) {
        console.error('Account update error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
