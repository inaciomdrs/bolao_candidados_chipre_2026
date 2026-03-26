import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { requireManager, revokeAllUserSessions } from '@/lib/sessions';
import { logAuditEvent } from '@/lib/audit';
import { sendEmail, buildPasswordForcedEmail } from '@/lib/email';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const manager = await requireManager();
        const { id } = await params;
        const targetUserId = parseInt(id, 10);

        if (isNaN(targetUserId)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 });
        }

        const body = await request.json();
        const { newPassword } = body;

        if (!newPassword) {
            return NextResponse.json({ error: 'Nova senha é obrigatória.' }, { status: 400 });
        }

        // Password complexity
        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'A senha deve conter letras maiúsculas, minúsculas e números.' },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser || targetUser.deletedAt) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: targetUserId },
            data: { passwordHash: newHash },
        });

        // Revoke all sessions for the target user
        await revokeAllUserSessions(targetUserId);

        // Audit log
        await logAuditEvent({
            actorId: manager.id,
            targetId: targetUserId,
            action: 'password_reset_forced',
            metadata: { managerName: manager.name, targetEmail: targetUser.email },
        });

        // In-app notification
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: 'security_alert',
                payload: JSON.stringify({
                    message: 'Sua senha foi redefinida por um gerente. Por favor, faça login com a nova senha.',
                }),
            },
        });

        // Security alert email
        await sendEmail({
            to: targetUser.email,
            subject: 'Sua senha foi redefinida por um gerente',
            html: buildPasswordForcedEmail(),
        });

        return NextResponse.json({ message: 'Senha redefinida com sucesso. O usuário foi desconectado.' });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Manager force reset error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
