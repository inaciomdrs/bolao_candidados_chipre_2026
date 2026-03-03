import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BetForm from '@/components/BetForm';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ChampionshipDetailPage({ params }: Props) {
    const { slug } = await params;

    const championship = await prisma.championship.findUnique({
        where: { slug },
        include: {
            rounds: { orderBy: { order: 'asc' } },
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

    if (!championship) notFound();

    // Leaderboard
    const leaderboard = await prisma.leaderboardEntry.findMany({
        where: { championshipId: championship.id },
        orderBy: [{ totalPoints: 'desc' }, { totalBets: 'asc' }],
        take: 10,
        include: { user: { select: { name: true } } },
    });

    // Group matches by date
    const matchesByDate = new Map<string, typeof championship.matches>();
    for (const match of championship.matches) {
        const dateKey = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: championship.timezone,
        }).format(match.startDatetime);
        if (!matchesByDate.has(dateKey)) {
            matchesByDate.set(dateKey, []);
        }
        matchesByDate.get(dateKey)!.push(match);
    }

    function formatTime(date: Date) {
        if (!championship) return '';
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: championship.timezone,
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
                <div className="page-header">
                    <Link href="/championships" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        ← Voltar aos campeonatos
                    </Link>
                    <h1 className="page-title" style={{ marginTop: '8px' }}>🏆 {championship.name}</h1>
                    {championship.description && (
                        <p className="page-subtitle">{championship.description}</p>
                    )}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Criado por {championship.createdBy.name} • Fuso: {championship.timezone}
                    </p>
                </div>

                <div className="grid-2">
                    {/* Calendar / Matches */}
                    <section>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
                            📅 Calendário de Partidas
                        </h2>

                        {championship.matches.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <div className="empty-state-icon">♟</div>
                                <p className="empty-state-text">Nenhuma partida cadastrada.</p>
                            </div>
                        ) : (
                            Array.from(matchesByDate.entries()).map(([dateStr, matches]) => (
                                <div key={dateStr} className="calendar-date-group">
                                    <div className="calendar-date-header">{dateStr}</div>
                                    {matches.map((match) => (
                                        <div key={match.id} className="match-card" style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue-light)', marginBottom: '4px' }}>
                                                {match.round.name}
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
                                                <span>🕐 {formatTime(match.startDatetime)}</span>
                                                <span className={`match-status ${match.status}`}>
                                                    {match.status === 'scheduled' ? 'Agendada' :
                                                        match.status === 'ongoing' ? 'Em andamento' :
                                                            getResultLabel(match.resultCode)}
                                                </span>
                                            </div>
                                            {match.status === 'scheduled' && (
                                                <BetForm matchId={match.id} matchStart={match.startDatetime.toISOString()} />
                                            )}
                                            {match.resultCode && (
                                                <div style={{
                                                    marginTop: '12px',
                                                    padding: '8px 12px',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--accent-green-light)',
                                                    textAlign: 'center',
                                                }}>
                                                    Resultado: <strong>{getResultLabel(match.resultCode)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </section>

                    {/* Leaderboard */}
                    <section>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
                            🏆 Classificação
                        </h2>

                        {leaderboard.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <div className="empty-state-icon">🏅</div>
                                <p className="empty-state-text">Nenhuma pontuação ainda.</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {leaderboard.map((entry, idx) => (
                                    <div key={entry.id} className="leaderboard-row">
                                        <div className={`leaderboard-position ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                        </div>
                                        <div className="leaderboard-name">{entry.user.name}</div>
                                        <div className="leaderboard-points">{entry.totalPoints} pts</div>
                                        <div className="leaderboard-bets">{entry.totalBets} apostas</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <footer className="footer">
                <p>Bolão dos Candidatos 2026</p>
            </footer>
        </>
    );
}
