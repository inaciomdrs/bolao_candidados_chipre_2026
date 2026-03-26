import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getSessionUser, softDeleteUser, destroySession } from '@/lib/sessions';
import { sendEmail, buildAccountDeletedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json({ error: 'Confirmação de senha é obrigatória.' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const valid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!valid) {
            return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
        }

        // Soft-delete and revoke all sessions
        await softDeleteUser(user.id, user.id);

        // Send confirmation email
        await sendEmail({
            to: dbUser.email,
            subject: 'Sua conta foi excluída',
            html: buildAccountDeletedEmail(),
        });

        // Clear cookie
        await destroySession();

        return NextResponse.json({ message: 'Conta excluída com sucesso.' });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
