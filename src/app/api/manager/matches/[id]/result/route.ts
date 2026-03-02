import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';
import { computeScoresForMatch } from '@/lib/scoring';

/**
 * POST /api/manager/matches/[id]/result — Publish a match result
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireManager();
        const { id } = await params;
        const matchId = parseInt(id);
        const body = await request.json();
        const { resultCode, resultDetails } = body;

        if (!resultCode || !['white_win', 'draw', 'black_win'].includes(resultCode)) {
            return NextResponse.json(
                { error: 'resultCode deve ser white_win, draw ou black_win.' },
                { status: 400 }
            );
        }

        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match) {
            return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 });
        }

        if (match.status === 'finished') {
            return NextResponse.json(
                { error: 'Resultado já publicado para esta partida.' },
                { status: 400 }
            );
        }

        // Update match with result
        await prisma.match.update({
            where: { id: matchId },
            data: {
                resultCode,
                resultDetails: resultDetails || null,
                status: 'finished',
            },
        });

        // Lock all bets for this match
        await prisma.bet.updateMany({
            where: { matchId, lockedAt: null },
            data: { lockedAt: new Date() },
        });

        // Calculate scores for all bets
        const bets = await prisma.bet.findMany({
            where: { matchId },
        });

        const scores = computeScoresForMatch(bets, { id: matchId, resultCode });

        // Update leaderboard per user
        for (const score of scores) {
            await prisma.leaderboardEntry.upsert({
                where: {
                    userId_championshipId: {
                        userId: score.userId,
                        championshipId: match.championshipId,
                    },
                },
                create: {
                    userId: score.userId,
                    championshipId: match.championshipId,
                    totalPoints: score.totalPoints,
                    totalBets: 1,
                    correctBets: score.totalPoints > 0 ? 1 : 0,
                    lastUpdate: new Date(),
                },
                update: {
                    totalPoints: { increment: score.totalPoints },
                    totalBets: { increment: 1 },
                    correctBets: { increment: score.totalPoints > 0 ? 1 : 0 },
                    lastUpdate: new Date(),
                },
            });

            // Create notification for each user who bet
            await prisma.notification.create({
                data: {
                    userId: score.userId,
                    type: 'result_published',
                    payload: JSON.stringify({
                        matchId,
                        playerWhite: match.playerWhite,
                        playerBlack: match.playerBlack,
                        resultCode,
                        pointsEarned: score.totalPoints,
                    }),
                },
            });
        }

        // Notify top 3 leaderboard change
        const top3 = await prisma.leaderboardEntry.findMany({
            where: { championshipId: match.championshipId },
            orderBy: [{ totalPoints: 'desc' }, { totalBets: 'asc' }],
            take: 3,
            include: { user: { select: { id: true, name: true } } },
        });

        for (const entry of top3) {
            await prisma.notification.create({
                data: {
                    userId: entry.userId,
                    type: 'leaderboard_change',
                    payload: JSON.stringify({
                        championshipId: match.championshipId,
                        position: top3.indexOf(entry) + 1,
                        totalPoints: entry.totalPoints,
                    }),
                },
            });
        }

        return NextResponse.json({
            message: 'Resultado publicado com sucesso!',
            scoresUpdated: scores.length,
        });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Result publish error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
