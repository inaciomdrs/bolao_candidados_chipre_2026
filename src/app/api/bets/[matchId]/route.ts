import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/sessions';
import { isBetLocked } from '@/lib/scoring';

/**
 * GET /api/bets/[matchId] — Get user's bet for a match
 * POST /api/bets/[matchId] — Place or update a bet
 * DELETE /api/bets/[matchId] — Cancel a bet
 */

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const user = await requireAuth();
        const { matchId } = await params;

        const bet = await prisma.bet.findUnique({
            where: {
                userId_matchId: {
                    userId: user.id,
                    matchId: parseInt(matchId),
                },
            },
        });

        return NextResponse.json({ bet });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        console.error('Bet get error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const user = await requireAuth();
        const { matchId: matchIdStr } = await params;
        const matchId = parseInt(matchIdStr);
        const body = await request.json();
        const { predictedOutcome, predictedWinner } = body;

        // Validate outcome
        if (!predictedOutcome || !['white_win', 'draw', 'black_win'].includes(predictedOutcome)) {
            return NextResponse.json(
                { error: 'Resultado previsto deve ser white_win, draw ou black_win.' },
                { status: 400 }
            );
        }

        // Get match
        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match) {
            return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 });
        }

        // Check lock
        if (isBetLocked(match.startDatetime)) {
            return NextResponse.json(
                { error: 'As apostas estão encerradas para esta partida (menos de 10 minutos para o início).' },
                { status: 403 }
            );
        }

        if (match.status === 'finished') {
            return NextResponse.json(
                { error: 'Esta partida já foi encerrada.' },
                { status: 400 }
            );
        }

        // Validate winner prediction
        let winner = null;
        if (predictedOutcome !== 'draw') {
            winner = predictedWinner || (predictedOutcome === 'white_win' ? 'white' : 'black');
        }

        // Upsert bet
        const bet = await prisma.bet.upsert({
            where: {
                userId_matchId: {
                    userId: user.id,
                    matchId,
                },
            },
            create: {
                userId: user.id,
                matchId,
                predictedOutcome,
                predictedWinner: winner,
            },
            update: {
                predictedOutcome,
                predictedWinner: winner,
            },
        });

        return NextResponse.json({
            message: 'Aposta registrada com sucesso!',
            bet,
        });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        console.error('Bet create error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const user = await requireAuth();
        const { matchId: matchIdStr } = await params;
        const matchId = parseInt(matchIdStr);

        // Get match to check lock
        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match) {
            return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 });
        }

        if (isBetLocked(match.startDatetime)) {
            return NextResponse.json(
                { error: 'Não é possível cancelar a aposta (menos de 10 minutos para o início).' },
                { status: 403 }
            );
        }

        await prisma.bet.delete({
            where: {
                userId_matchId: {
                    userId: user.id,
                    matchId,
                },
            },
        });

        return NextResponse.json({ message: 'Aposta cancelada.' });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        console.error('Bet delete error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
