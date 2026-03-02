import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';

/**
 * GET /api/manager/matches?championshipId=X&roundId=Y — List matches
 * POST /api/manager/matches — Create a match
 */
export async function GET(request: NextRequest) {
    try {
        await requireManager();
        const { searchParams } = new URL(request.url);
        const championshipId = searchParams.get('championshipId');
        const roundId = searchParams.get('roundId');

        const where: any = {};
        if (championshipId) where.championshipId = parseInt(championshipId);
        if (roundId) where.roundId = parseInt(roundId);

        const matches = await prisma.match.findMany({
            where,
            orderBy: { startDatetime: 'asc' },
            include: {
                round: { select: { name: true, roundNumber: true } },
                _count: { select: { bets: true } },
            },
        });

        return NextResponse.json({ matches });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Matches list error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireManager();
        const body = await request.json();
        const { championshipId, roundId, playerWhite, playerBlack, startDatetime, venue } = body;

        if (!championshipId || !roundId || !playerWhite || !playerBlack || !startDatetime) {
            return NextResponse.json(
                { error: 'championshipId, roundId, playerWhite, playerBlack e startDatetime são obrigatórios.' },
                { status: 400 }
            );
        }

        const match = await prisma.match.create({
            data: {
                championshipId: parseInt(championshipId),
                roundId: parseInt(roundId),
                playerWhite,
                playerBlack,
                startDatetime: new Date(startDatetime),
                venue: venue || null,
                status: 'scheduled',
            },
        });

        return NextResponse.json({ match }, { status: 201 });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Match create error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
