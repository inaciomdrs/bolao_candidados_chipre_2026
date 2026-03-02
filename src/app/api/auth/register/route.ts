import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { consumeRateLimit, registerRateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // Rate limit
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const allowed = await consumeRateLimit(registerRateLimiter, ip);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Muitas tentativas. Tente novamente mais tarde.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { email, name, password, confirmPassword } = body;

        // Validation
        if (!email || !name || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios.' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem.' },
                { status: 400 }
            );
        }

        // Password complexity
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }

        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return NextResponse.json(
                { error: 'A senha deve conter letras maiúsculas, minúsculas e números.' },
                { status: 400 }
            );
        }

        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Email inválido.' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            return NextResponse.json(
                { error: 'Este email já está cadastrado.' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name: name.trim(),
                passwordHash,
                role: 'boleiro',
            },
        });

        return NextResponse.json(
            { message: 'Conta criada com sucesso! Faça login para continuar.', userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
