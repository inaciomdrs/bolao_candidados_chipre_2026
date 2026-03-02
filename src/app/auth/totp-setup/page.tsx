'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function TotpSetupPage() {
    const [step, setStep] = useState<'init' | 'verify' | 'done'>('init');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSetup() {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/totp/setup');
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setStep('verify');
        } catch {
            setError('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/totp/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            setBackupCodes(data.backupCodes || []);
            setStep('done');
        } catch {
            setError('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Navbar />
            <div className="auth-container">
                <div className="auth-card fade-in" style={{ maxWidth: '520px' }}>
                    <h1 className="auth-title">🔐 Verificação em Dois Fatores</h1>
                    <p className="auth-subtitle">
                        Proteja sua conta com autenticação TOTP
                    </p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    {step === 'init' && (
                        <div className="text-center">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.7 }}>
                                A autenticação em dois fatores adiciona uma camada extra de segurança à sua conta.
                                Você precisará de um aplicativo autenticador como <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
                            </p>
                            <button onClick={handleSetup} className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Configurar 2FA'}
                            </button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <>
                            <div className="alert alert-info">
                                📱 Escaneie o QR code abaixo com seu aplicativo autenticador.
                            </div>

                            {qrCode && (
                                <div className="qr-code-container">
                                    <img src={qrCode} alt="QR Code TOTP" width={200} height={200} />
                                </div>
                            )}

                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    Ou insira manualmente:
                                </p>
                                <code style={{
                                    background: 'var(--bg-input)',
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.9rem',
                                    color: 'var(--accent-gold)',
                                    letterSpacing: '0.1em',
                                    display: 'inline-block',
                                    wordBreak: 'break-all',
                                }}>
                                    {secret}
                                </code>
                            </div>

                            <form onSubmit={handleVerify}>
                                <div className="form-group">
                                    <label htmlFor="totp-verify" className="form-label">Código de Verificação</label>
                                    <input
                                        id="totp-verify"
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        required
                                        maxLength={6}
                                        autoFocus
                                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                    {loading ? <span className="spinner" /> : 'Verificar e Ativar'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'done' && (
                        <>
                            <div className="alert alert-success">
                                ✅ Autenticação de dois fatores ativada com sucesso!
                            </div>

                            <div className="alert alert-warning">
                                ⚠️ <strong>IMPORTANTE:</strong> Salve os códigos de backup abaixo em um local seguro.
                                Cada código pode ser usado apenas uma vez caso perca acesso ao autenticador.
                            </div>

                            <div className="backup-codes" style={{ marginBottom: '24px' }}>
                                {backupCodes.map((code, i) => (
                                    <div key={i} className="backup-code">{code}</div>
                                ))}
                            </div>

                            <button
                                onClick={() => router.push('/')}
                                className="btn btn-primary btn-lg w-full"
                            >
                                Concluir
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
