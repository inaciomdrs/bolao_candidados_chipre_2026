import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';

/**
 * GET /api/manager/championships — List all championships
 * POST /api/manager/championships — Create a championship
 */
export async function GET() {
    try {
        await requireManager();
        const championships = await prisma.championship.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { rounds: true, matches: true } } },
        });
        return NextResponse.json({ championships });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Championship list error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireManager();
        const body = await request.json();
        const { name, description, timezone } = body;

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Check slug uniqueness
        const existing = await prisma.championship.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: 'Já existe um campeonato com este nome.' }, { status: 409 });
        }

        const championship = await prisma.championship.create({
            data: {
                name,
                slug,
                description: description || null,
                timezone: timezone || 'America/Sao_Paulo',
                createdById: user.id,
            },
        });

        return NextResponse.json({ championship }, { status: 201 });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Championship create error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
