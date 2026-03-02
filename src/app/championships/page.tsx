import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ChampionshipsPage() {
    const championships = await prisma.championship.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { matches: true, rounds: true } },
            createdBy: { select: { name: true } },
        },
    });

    return (
        <>
            <Navbar />
            <main className="main-content fade-in">
                <div className="page-header">
                    <h1 className="page-title">🏆 Campeonatos</h1>
                    <p className="page-subtitle">Todos os campeonatos disponíveis para apostas</p>
                </div>

                {championships.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏅</div>
                        <p className="empty-state-text">Nenhum campeonato cadastrado ainda.</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Um gerente precisa criar o primeiro campeonato.
                        </p>
                    </div>
                ) : (
                    <div className="grid-2">
                        {championships.map((champ) => (
                            <Link key={champ.id} href={`/championships/${champ.slug}`} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div className="card-header">
                                        <h2 className="card-title">{champ.name}</h2>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            por {champ.createdBy.name}
                                        </span>
                                    </div>
                                    {champ.description && (
                                        <p className="card-body" style={{ marginBottom: '12px' }}>{champ.description}</p>
                                    )}
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <span>📋 {champ._count.rounds} rodadas</span>
                                        <span>♟ {champ._count.matches} partidas</span>
                                        <span>🌎 {champ.timezone}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <footer className="footer">
                <p>Bolão dos Candidatos 2026</p>
            </footer>
        </>
    );
}
