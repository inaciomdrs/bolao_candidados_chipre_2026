'use client';

import { useState, useEffect } from 'react';

interface BetFormProps {
    matchId: number;
    matchStart: string; // ISO string
}

export default function BetForm({ matchId, matchStart }: BetFormProps) {
    const [predictedOutcome, setPredictedOutcome] = useState<string | null>(null);
    const [existingBet, setExistingBet] = useState<any>(null);
    const [locked, setLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if locked
        const lockTime = new Date(new Date(matchStart).getTime() - 10 * 60 * 1000);
        if (new Date() >= lockTime) {
            setLocked(true);
        }

        // Fetch existing bet
        fetchBet();
    }, [matchId, matchStart]);

    async function fetchBet() {
        try {
            const res = await fetch(`/api/bets/${matchId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.bet) {
                    setExistingBet(data.bet);
                    setPredictedOutcome(data.bet.predictedOutcome);
                }
            }
        } catch { }
    }

    async function handleBet(outcome: string) {
        if (locked) return;
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`/api/bets/${matchId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predictedOutcome: outcome }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }

            setPredictedOutcome(outcome);
            setExistingBet(data.bet);
            setMessage(data.message);
        } catch {
            setError('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel() {
        if (locked) return;
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`/api/bets/${matchId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            setPredictedOutcome(null);
            setExistingBet(null);
            setMessage('Aposta cancelada.');
        } catch {
            setError('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }

    function getOutcomeLabel(outcome: string) {
        if (outcome === 'white_win') return '♔ Brancas';
        if (outcome === 'draw') return '½ Empate';
        if (outcome === 'black_win') return '♚ Pretas';
        return outcome;
    }

    return (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            {error && <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '0.82rem' }}>⚠️ {error}</div>}
            {message && <div className="alert alert-success" style={{ padding: '8px 12px', fontSize: '0.82rem' }}>✅ {message}</div>}

            {locked ? (
                <div className="alert alert-warning" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: 0 }}>
                    🔒 Apostas encerradas para esta partida.
                    {existingBet && (
                        <span> Sua aposta: <strong>{getOutcomeLabel(existingBet.predictedOutcome)}</strong></span>
                    )}
                </div>
            ) : (
                <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {existingBet ? 'Altere sua aposta:' : 'Faça sua aposta:'}
                    </p>
                    <div className="bet-options">
                        {['white_win', 'draw', 'black_win'].map((outcome) => (
                            <button
                                key={outcome}
                                className={`bet-option ${predictedOutcome === outcome ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                                onClick={() => handleBet(outcome)}
                                disabled={loading || locked}
                            >
                                {getOutcomeLabel(outcome)}
                            </button>
                        ))}
                    </div>
                    {existingBet && (
                        <button
                            onClick={handleCancel}
                            className="btn btn-ghost btn-sm"
                            disabled={loading}
                            style={{ marginTop: '4px', color: 'var(--accent-red-light)' }}
                        >
                            Cancelar aposta
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
