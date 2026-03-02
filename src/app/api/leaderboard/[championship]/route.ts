import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/leaderboard/[championship] — Get leaderboard for a championship
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ championship: string }> }
) {
    try {
        const { championship: slug } = await params;

        // Find championship by slug
        const championship = await prisma.championship.findUnique({
            where: { slug },
        });

        if (!championship) {
            return NextResponse.json(
                { error: 'Campeonato não encontrado.' },
                { status: 404 }
            );
        }

        const leaderboard = await prisma.leaderboardEntry.findMany({
            where: { championshipId: championship.id },
            orderBy: [
                { totalPoints: 'desc' },
                { totalBets: 'asc' }, // fewer total bets = better tie break
            ],
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Add ranking position
        const ranked = leaderboard.map((entry, index) => ({
            position: index + 1,
            userId: entry.userId,
            userName: entry.user.name,
            totalPoints: entry.totalPoints,
            totalBets: entry.totalBets,
            correctBets: entry.correctBets,
            lastUpdate: entry.lastUpdate,
        }));

        return NextResponse.json({
            championship: { id: championship.id, name: championship.name, slug: championship.slug },
            leaderboard: ranked,
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
