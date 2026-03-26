import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';
import { logAuditEvent } from '@/lib/audit';
import { sendEmail, buildTotpDisabledEmail } from '@/lib/email';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const manager = await requireManager();
        const { id } = await params;
        const targetUserId = parseInt(id, 10);

        if (isNaN(targetUserId)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser || targetUser.deletedAt) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        // If TOTP wasn't enabled, it's a no-op
        if (!targetUser.totpEnabled) {
            return NextResponse.json({
                message: 'O usuário não tem verificação em duas etapas ativada.',
            });
        }

        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                totpEnabled: false,
                totpSecret: null,
                backupCodes: null,
            },
        });

        // Audit log
        await logAuditEvent({
            actorId: manager.id,
            targetId: targetUserId,
            action: 'totp_disabled',
            metadata: { managerName: manager.name, targetEmail: targetUser.email },
        });

        // In-app notification
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: 'security_alert',
                payload: JSON.stringify({
                    message: 'Sua verificação em duas etapas foi desativada por um gerente. Você precisará configurá-la novamente.',
                }),
            },
        });

        // Security alert email
        await sendEmail({
            to: targetUser.email,
            subject: 'Sua verificação em duas etapas foi desativada',
            html: buildTotpDisabledEmail(),
        });

        return NextResponse.json({ message: 'Verificação em duas etapas desativada com sucesso.' });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Manager disable TOTP error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
