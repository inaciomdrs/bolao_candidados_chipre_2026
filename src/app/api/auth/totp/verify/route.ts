import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'otplib';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const SESSION_COOKIE_NAME = 'bolao_session';

/**
 * POST /api/auth/totp/verify — Verify TOTP code during login
 */
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionId) {
            return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 401 });
        }

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { user: true },
        });

        if (!session) {
            return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
        }

        // Check if this session is pending TOTP verification
        const sessionData = session.data ? JSON.parse(session.data) : {};
        if (!sessionData.totpPending) {
            return NextResponse.json(
                { error: 'Verificação TOTP não necessária.' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { token, backupCode } = body;

        const user = session.user;
        if (!user.totpEnabled || !user.totpSecret) {
            return NextResponse.json(
                { error: 'TOTP não está habilitado.' },
                { status: 400 }
            );
        }

        let verified = false;

        if (token) {
            // Verify TOTP token
            const secret = decrypt(user.totpSecret);
            const { valid } = await verify({ token, secret });
            verified = valid;
        } else if (backupCode) {
            // Verify backup code
            if (user.backupCodes) {
                const hashedCodes: string[] = JSON.parse(user.backupCodes);
                for (let i = 0; i < hashedCodes.length; i++) {
                    const match = await bcrypt.compare(backupCode.toUpperCase(), hashedCodes[i]);
                    if (match) {
                        verified = true;
                        // Remove used backup code
                        hashedCodes.splice(i, 1);
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { backupCodes: JSON.stringify(hashedCodes) },
                        });
                        break;
                    }
                }
            }
        } else {
            return NextResponse.json(
                { error: 'Forneça o código TOTP ou um código de backup.' },
                { status: 400 }
            );
        }

        if (!verified) {
            return NextResponse.json(
                { error: 'Código inválido.' },
                { status: 401 }
            );
        }

        // Mark session as fully authenticated
        await prisma.session.update({
            where: { id: sessionId },
            data: { data: JSON.stringify({ totpPending: false }) },
        });

        return NextResponse.json({
            message: 'Login completo!',
            user: { id: user.id, name: user.name, role: user.role },
        });
    } catch (error) {
        console.error('TOTP verify error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
