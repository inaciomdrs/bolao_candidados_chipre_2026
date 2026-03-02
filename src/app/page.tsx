import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    // Fetch upcoming matches (next 5)
    const now = new Date();
    const upcomingMatches = await prisma.match.findMany({
        where: {
            startDatetime: { gte: now },
            status: 'scheduled',
        },
        orderBy: { startDatetime: 'asc' },
        take: 5,
        include: {
            championship: { select: { name: true, slug: true } },
            round: { select: { name: true } },
            _count: { select: { bets: true } },
        },
    });

    // Fetch recent results
    const recentResults = await prisma.match.findMany({
        where: { status: 'finished' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
            championship: { select: { name: true, slug: true } },
            round: { select: { name: true } },
        },
    });

    // Stats
    const totalUsers = await prisma.user.count();
    const totalBets = await prisma.bet.count();
    const totalMatches = await prisma.match.count();
    const totalChampionships = await prisma.championship.count();

    // Top leaderboard (across all championships)
    const topPlayers = await prisma.leaderboardEntry.findMany({
        orderBy: [{ totalPoints: 'desc' }, { totalBets: 'asc' }],
        take: 5,
        include: { user: { select: { name: true } }, championship: { select: { name: true } } },
    });

    function formatDate(date: Date) {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        }).format(date);
    }

    function getResultLabel(code: string | null) {
        if (code === 'white_win') return 'Brancas Vencem';
        if (code === 'black_win') return 'Pretas Vencem';
        if (code === 'draw') return 'Empate';
        return '';
    }

    return (
        <>
            <Navbar />
            <main className="main-content fade-in">
                {/* Hero */}
                <div className="page-header" style={{ textAlign: 'center' }}>
                    <h1 className="page-title" style={{ fontSize: '2.5rem' }}>
                        ♚ Bolão dos Candidatos 2026
                    </h1>
                    <p className="page-subtitle" style={{ maxWidth: '600px', margin: '8px auto 0' }}>
                        Faça suas apostas para o Torneio de Candidatos de Xadrez 2026.
                        Sem dinheiro envolvido — só a glória! 🏆
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{totalUsers}</div>
                        <div className="stat-label">Jogadores</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalBets}</div>
                        <div className="stat-label">Apostas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalMatches}</div>
                        <div className="stat-label">Partidas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalChampionships}</div>
                        <div className="stat-label">Campeonatos</div>
                    </div>
                </div>

                <div className="grid-2">
                    {/* Next Games */}
                    <section>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🕐</span> Próximas Partidas
                        </h2>
                        {upcomingMatches.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <div className="empty-state-icon">♟</div>
                                <p className="empty-state-text">Nenhuma partida agendada.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {upcomingMatches.map((match) => (
                                    <Link key={match.id} href={`/championships/${match.championship.slug}`} style={{ textDecoration: 'none' }}>
                                        <div className="match-card">
                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue-light)', marginBottom: '8px' }}>
                                                {match.championship.name} — {match.round.name}
                                            </div>
                                            <div className="match-players">
                                                <div className="match-player">
                                                    <div className="match-player-name">{match.playerWhite}</div>
                                                    <div className="match-player-color">Brancas ♔</div>
                                                </div>
                                                <div className="match-vs">VS</div>
                                                <div className="match-player">
                                                    <div className="match-player-name">{match.playerBlack}</div>
                                                    <div className="match-player-color">Pretas ♚</div>
                                                </div>
                                            </div>
                                            <div className="match-meta">
                                                <span>📅 {formatDate(match.startDatetime)}</span>
                                                <span className="match-status scheduled">Agendada</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Leaderboard + Recent Results */}
                    <section>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🏆</span> Classificação
                        </h2>
                        {topPlayers.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <div className="empty-state-icon">🏅</div>
                                <p className="empty-state-text">Nenhuma pontuação ainda.</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {topPlayers.map((entry, idx) => (
                                    <div key={entry.id} className="leaderboard-row">
                                        <div className={`leaderboard-position ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                        </div>
                                        <div>
                                            <div className="leaderboard-name">{entry.user.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.championship.name}</div>
                                        </div>
                                        <div className="leaderboard-points">{entry.totalPoints} pts</div>
                                        <div className="leaderboard-bets">{entry.totalBets} apostas</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recent Results */}
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>✅</span> Resultados Recentes
                        </h2>
                        {recentResults.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <div className="empty-state-icon">📋</div>
                                <p className="empty-state-text">Nenhum resultado publicado ainda.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {recentResults.map((match) => (
                                    <div key={match.id} className="card" style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{match.playerWhite}</span>
                                                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>vs</span>
                                                <span style={{ fontWeight: 600 }}>{match.playerBlack}</span>
                                            </div>
                                            <span className="match-status finished" style={{ fontSize: '0.72rem' }}>
                                                {getResultLabel(match.resultCode)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <footer className="footer">
                <p>Bolão dos Candidatos 2026 — Feito com ♟ para amantes de xadrez</p>
            </footer>
        </>
    );
}
