import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireManager } from '@/lib/sessions';

/**
 * GET /api/exports/leaderboard?championship=slug — Export leaderboard as CSV (manager only)
 */
export async function GET(request: NextRequest) {
    try {
        await requireManager();
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('championship');

        if (!slug) {
            return NextResponse.json({ error: 'Parâmetro championship é obrigatório.' }, { status: 400 });
        }

        const championship = await prisma.championship.findUnique({ where: { slug } });
        if (!championship) {
            return NextResponse.json({ error: 'Campeonato não encontrado.' }, { status: 404 });
        }

        const entries = await prisma.leaderboardEntry.findMany({
            where: { championshipId: championship.id },
            orderBy: [{ totalPoints: 'desc' }, { totalBets: 'asc' }],
            include: { user: { select: { name: true, email: true } } },
        });

        // Build CSV
        const header = 'Posição,Nome,Email,Pontos,Total Apostas,Acertos,Última Atualização';
        const rows = entries.map((e, i) =>
            `${i + 1},"${e.user.name}","${e.user.email}",${e.totalPoints},${e.totalBets},${e.correctBets},${e.lastUpdate.toISOString()}`
        );

        const csv = [header, ...rows].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=leaderboard-${slug}.csv`,
            },
        });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
