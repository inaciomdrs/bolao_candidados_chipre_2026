import { NextRequest, NextResponse } from 'next/server';
import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { encrypt, decrypt, generateBackupCodes } from '@/lib/crypto';
import { getSessionUser } from '@/lib/sessions';
import bcrypt from 'bcrypt';

/**
 * GET /api/auth/totp/setup — Generate a TOTP secret and QR code
 */
export async function GET() {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        if (user.totpEnabled) {
            return NextResponse.json(
                { error: 'TOTP já está habilitado.' },
                { status: 400 }
            );
        }

        const issuer = process.env.TOTP_ISSUER || 'Bolao-2026';
        const secret = generateSecret();

        const otpauthUrl = generateURI({
            issuer,
            label: user.email,
            secret,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // Temporarily store the secret encrypted (not yet confirmed)
        const encryptedSecret = encrypt(secret);
        await prisma.user.update({
            where: { id: user.id },
            data: { totpSecret: encryptedSecret }, // not yet enabled
        });

        return NextResponse.json({
            secret, // show to user for manual entry
            qrCode: qrCodeDataUrl,
            message: 'Escaneie o QR code com seu app autenticador e confirme com o código.',
        });
    } catch (error) {
        console.error('TOTP setup error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/auth/totp/setup — Verify TOTP token and enable 2FA
 */
export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Código de verificação é obrigatório.' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user || !user.totpSecret) {
            return NextResponse.json(
                { error: 'Configure o TOTP primeiro.' },
                { status: 400 }
            );
        }

        if (user.totpEnabled) {
            return NextResponse.json(
                { error: 'TOTP já está habilitado.' },
                { status: 400 }
            );
        }

        // Decrypt and verify the token
        const secret = decrypt(user.totpSecret);
        const { valid: isValid } = await verify({ token, secret });

        if (!isValid) {
            return NextResponse.json(
                { error: 'Código inválido. Tente novamente.' },
                { status: 400 }
            );
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes();
        const hashedCodes = await Promise.all(
            backupCodes.map((code) => bcrypt.hash(code, 10))
        );

        // Enable TOTP
        await prisma.user.update({
            where: { id: user.id },
            data: {
                totpEnabled: true,
                backupCodes: JSON.stringify(hashedCodes),
            },
        });

        return NextResponse.json({
            message: 'TOTP habilitado com sucesso!',
            backupCodes, // Show to user ONCE
        });
    } catch (error) {
        console.error('TOTP verify error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
