import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';

/**
 * GET /api/manager/rounds?championshipId=X — List rounds
 * POST /api/manager/rounds — Create a round
 */
export async function GET(request: NextRequest) {
    try {
        await requireManager();
        const { searchParams } = new URL(request.url);
        const championshipId = searchParams.get('championshipId');

        if (!championshipId) {
            return NextResponse.json({ error: 'championshipId é obrigatório.' }, { status: 400 });
        }

        const rounds = await prisma.round.findMany({
            where: { championshipId: parseInt(championshipId) },
            orderBy: { order: 'asc' },
            include: { _count: { select: { matches: true } } },
        });

        return NextResponse.json({ rounds });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Rounds list error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireManager();
        const body = await request.json();
        const { championshipId, name, roundNumber, order } = body;

        if (!championshipId || !name || roundNumber === undefined) {
            return NextResponse.json(
                { error: 'championshipId, name, e roundNumber são obrigatórios.' },
                { status: 400 }
            );
        }

        const round = await prisma.round.create({
            data: {
                championshipId: parseInt(championshipId),
                name,
                roundNumber: parseInt(roundNumber),
                order: order !== undefined ? parseInt(order) : parseInt(roundNumber),
            },
        });

        return NextResponse.json({ round }, { status: 201 });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Round create error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
