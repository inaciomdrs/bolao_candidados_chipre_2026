import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/championships/[slug] — Championship details with matches
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const championship = await prisma.championship.findUnique({
            where: { slug },
            include: {
                rounds: {
                    orderBy: { order: 'asc' },
                },
                matches: {
                    orderBy: { startDatetime: 'asc' },
                    include: {
                        round: { select: { name: true, roundNumber: true } },
                        _count: { select: { bets: true } },
                    },
                },
                createdBy: { select: { name: true } },
            },
        });

        if (!championship) {
            return NextResponse.json({ error: 'Campeonato não encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ championship });
    } catch (error) {
        console.error('Championship detail error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
