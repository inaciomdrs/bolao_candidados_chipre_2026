import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/championships — Public list of championships
 */
export async function GET() {
    try {
        const championships = await prisma.championship.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { matches: true, rounds: true } },
                createdBy: { select: { name: true } },
            },
        });

        return NextResponse.json({ championships });
    } catch (error) {
        console.error('Championships list error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
