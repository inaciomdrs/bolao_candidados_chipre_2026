'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function ManagerPage() {
    const [tab, setTab] = useState<'championships' | 'rounds' | 'matches' | 'results'>('championships');

    // Championships
    const [championships, setChampionships] = useState<any[]>([]);
    const [champName, setChampName] = useState('');
    const [champDesc, setChampDesc] = useState('');
    const [champTimezone, setChampTimezone] = useState('America/Sao_Paulo');

    // Rounds
    const [selectedChampId, setSelectedChampId] = useState('');
    const [rounds, setRounds] = useState<any[]>([]);
    const [roundName, setRoundName] = useState('');
    const [roundNumber, setRoundNumber] = useState('');

    // Matches
    const [selectedRoundId, setSelectedRoundId] = useState('');
    const [matches, setMatches] = useState<any[]>([]);
    const [playerWhite, setPlayerWhite] = useState('');
    const [playerBlack, setPlayerBlack] = useState('');
    const [matchDatetime, setMatchDatetime] = useState('');
    const [matchVenue, setMatchVenue] = useState('');

    // Results
    const [resultMatchId, setResultMatchId] = useState('');
    const [resultCode, setResultCode] = useState('');
    const [resultDetails, setResultDetails] = useState('');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchChampionships();
    }, []);

    useEffect(() => {
        if (selectedChampId) {
            fetchRounds();
            fetchMatches();
        }
    }, [selectedChampId]);

    async function fetchChampionships() {
        try {
            const res = await fetch('/api/manager/championships');
            if (res.ok) {
                const data = await res.json();
                setChampionships(data.championships || []);
            }
        } catch { }
    }

    async function fetchRounds() {
        try {
            const res = await fetch(`/api/manager/rounds?championshipId=${selectedChampId}`);
            if (res.ok) {
                const data = await res.json();
                setRounds(data.rounds || []);
            }
        } catch { }
    }

    async function fetchMatches() {
        try {
            const res = await fetch(`/api/manager/matches?championshipId=${selectedChampId}`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data.matches || []);
            }
        } catch { }
    }

    async function createChampionship(e: React.FormEvent) {
        e.preventDefault();
        setError(''); setMessage(''); setLoading(true);
        try {
            const res = await fetch('/api/manager/championships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: champName, description: champDesc, timezone: champTimezone }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setMessage('Campeonato criado!');
            setChampName(''); setChampDesc('');
            fetchChampionships();
        } catch { setError('Erro de conexão.'); } finally { setLoading(false); }
    }

    async function createRound(e: React.FormEvent) {
        e.preventDefault();
        setError(''); setMessage(''); setLoading(true);
        try {
            const res = await fetch('/api/manager/rounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    championshipId: selectedChampId,
                    name: roundName,
                    roundNumber: roundNumber,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setMessage('Rodada criada!');
            setRoundName(''); setRoundNumber('');
            fetchRounds();
        } catch { setError('Erro de conexão.'); } finally { setLoading(false); }
    }

    async function createMatch(e: React.FormEvent) {
        e.preventDefault();
        setError(''); setMessage(''); setLoading(true);
        try {
            const res = await fetch('/api/manager/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    championshipId: selectedChampId,
                    roundId: selectedRoundId,
                    playerWhite,
                    playerBlack,
                    startDatetime: new Date(matchDatetime).toISOString(),
                    venue: matchVenue,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setMessage('Partida criada!');
            setPlayerWhite(''); setPlayerBlack(''); setMatchDatetime(''); setMatchVenue('');
            fetchMatches();
        } catch { setError('Erro de conexão.'); } finally { setLoading(false); }
    }

    async function publishResult(e: React.FormEvent) {
        e.preventDefault();
        setError(''); setMessage(''); setLoading(true);
        try {
            const res = await fetch(`/api/manager/matches/${resultMatchId}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resultCode, resultDetails }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setMessage(`Resultado publicado! ${data.scoresUpdated} apostas atualizadas.`);
            setResultCode(''); setResultDetails(''); setResultMatchId('');
            fetchMatches();
        } catch { setError('Erro de conexão.'); } finally { setLoading(false); }
    }

    return (
        <>
            <Navbar />
            <main className="main-content fade-in">
                <div className="page-header">
                    <h1 className="page-title">⚙️ Painel do Gerente</h1>
                    <p className="page-subtitle">Gerencie campeonatos, rodadas, partidas e resultados</p>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}
                {message && <div className="alert alert-success">✅ {message}</div>}

                {/* Tabs */}
                <div className="tabs">
                    {[
                        { key: 'championships', label: '🏆 Campeonatos' },
                        { key: 'rounds', label: '📋 Rodadas' },
                        { key: 'matches', label: '♟ Partidas' },
                        { key: 'results', label: '✅ Resultados' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`tab ${tab === key ? 'active' : ''}`}
                            onClick={() => { setTab(key as any); setError(''); setMessage(''); }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {tab === 'championships' && (
                    <div className="manager-section">
                        <h3 className="manager-section-title">Criar Campeonato</h3>
                        <form onSubmit={createChampionship}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input className="form-input" value={champName} onChange={e => setChampName(e.target.value)} required placeholder="Ex: Candidates Tournament 2026" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição (opcional)</label>
                                <input className="form-input" value={champDesc} onChange={e => setChampDesc(e.target.value)} placeholder="Descrição do campeonato" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fuso Horário</label>
                                <input className="form-input" value={champTimezone} onChange={e => setChampTimezone(e.target.value)} placeholder="America/Sao_Paulo" />
                            </div>
                            <button className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Criar Campeonato'}</button>
                        </form>

                        {championships.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Campeonatos existentes</h4>
                                {championships.map(c => (
                                    <div key={c.id} className="card" style={{ padding: '12px 16px', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '12px', fontSize: '0.82rem' }}>
                                            {c._count?.rounds || 0} rodadas • {c._count?.matches || 0} partidas
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'rounds' && (
                    <div className="manager-section">
                        <h3 className="manager-section-title">Criar Rodada</h3>
                        <div className="form-group">
                            <label className="form-label">Campeonato</label>
                            <select className="form-select" value={selectedChampId} onChange={e => setSelectedChampId(e.target.value)} required>
                                <option value="">Selecione...</option>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {selectedChampId && (
                            <form onSubmit={createRound}>
                                <div className="form-group">
                                    <label className="form-label">Nome da Rodada</label>
                                    <input className="form-input" value={roundName} onChange={e => setRoundName(e.target.value)} required placeholder="Ex: Rodada 1" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Número</label>
                                    <input className="form-input" type="number" value={roundNumber} onChange={e => setRoundNumber(e.target.value)} required placeholder="1" />
                                </div>
                                <button className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Criar Rodada'}</button>
                            </form>
                        )}
                        {rounds.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Rodadas existentes</h4>
                                {rounds.map(r => (
                                    <div key={r.id} className="card" style={{ padding: '12px 16px', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '12px', fontSize: '0.82rem' }}>
                                            Nº {r.roundNumber} • {r._count?.matches || 0} partidas
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'matches' && (
                    <div className="manager-section">
                        <h3 className="manager-section-title">Criar Partida</h3>
                        <div className="form-group">
                            <label className="form-label">Campeonato</label>
                            <select className="form-select" value={selectedChampId} onChange={e => setSelectedChampId(e.target.value)} required>
                                <option value="">Selecione...</option>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {selectedChampId && (
                            <form onSubmit={createMatch}>
                                <div className="form-group">
                                    <label className="form-label">Rodada</label>
                                    <select className="form-select" value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)} required>
                                        <option value="">Selecione...</option>
                                        {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Jogador Brancas ♔</label>
                                        <input className="form-input" value={playerWhite} onChange={e => setPlayerWhite(e.target.value)} required placeholder="Ex: Magnus Carlsen" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Jogador Pretas ♚</label>
                                        <input className="form-input" value={playerBlack} onChange={e => setPlayerBlack(e.target.value)} required placeholder="Ex: Hikaru Nakamura" />
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Data e Hora</label>
                                        <input className="form-input" type="datetime-local" value={matchDatetime} onChange={e => setMatchDatetime(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Local (opcional)</label>
                                        <input className="form-input" value={matchVenue} onChange={e => setMatchVenue(e.target.value)} placeholder="Ex: Toronto, Canadá" />
                                    </div>
                                </div>
                                <button className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Criar Partida'}</button>
                            </form>
                        )}
                        {matches.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Partidas existentes</h4>
                                {matches.map(m => (
                                    <div key={m.id} className="card" style={{ padding: '12px 16px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{m.playerWhite}</span>
                                                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>vs</span>
                                                <span style={{ fontWeight: 600 }}>{m.playerBlack}</span>
                                                <span style={{ color: 'var(--text-muted)', marginLeft: '12px', fontSize: '0.82rem' }}>
                                                    ID: {m.id} • {m.round?.name}
                                                </span>
                                            </div>
                                            <span className={`match-status ${m.status}`}>
                                                {m.status === 'scheduled' ? 'Agendada' : m.status === 'ongoing' ? 'Em andamento' : 'Finalizada'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'results' && (
                    <div className="manager-section">
                        <h3 className="manager-section-title">Publicar Resultado</h3>
                        <div className="form-group">
                            <label className="form-label">Campeonato</label>
                            <select className="form-select" value={selectedChampId} onChange={e => setSelectedChampId(e.target.value)} required>
                                <option value="">Selecione...</option>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {selectedChampId && (
                            <form onSubmit={publishResult}>
                                <div className="form-group">
                                    <label className="form-label">Partida</label>
                                    <select className="form-select" value={resultMatchId} onChange={e => setResultMatchId(e.target.value)} required>
                                        <option value="">Selecione...</option>
                                        {matches.filter(m => m.status !== 'finished').map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.playerWhite} vs {m.playerBlack} ({m.round?.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Resultado</label>
                                    <div className="bet-options">
                                        {[
                                            { value: 'white_win', label: '♔ Brancas Vencem' },
                                            { value: 'draw', label: '½ Empate' },
                                            { value: 'black_win', label: '♚ Pretas Vencem' },
                                        ].map(opt => (
                                            <button
                                                type="button"
                                                key={opt.value}
                                                className={`bet-option ${resultCode === opt.value ? 'selected' : ''}`}
                                                onClick={() => setResultCode(opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Detalhes / Notação (opcional)</label>
                                    <input className="form-input" value={resultDetails} onChange={e => setResultDetails(e.target.value)} placeholder="Ex: 1-0 após 42 lances" />
                                </div>
                                <button className="btn btn-primary" disabled={loading || !resultCode || !resultMatchId}>
                                    {loading ? <span className="spinner" /> : 'Publicar Resultado'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
