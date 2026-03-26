'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [showTotp, setShowTotp] = useState(false);
    const [useBackup, setUseBackup] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            if (data.requireTotp) {
                setShowTotp(true);
                return;
            }

            router.push('/');
            router.refresh();
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    async function handleTotpVerify(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const body: any = {};
            if (useBackup) {
                body.backupCode = backupCode;
            } else {
                body.token = totpToken;
            }

            const res = await fetch('/api/auth/totp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            router.push('/');
            router.refresh();
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Navbar />
            <div className="auth-container">
                <div className="auth-card fade-in">
                    <h1 className="auth-title">♚ Entrar</h1>
                    <p className="auth-subtitle">
                        {showTotp ? 'Verificação de dois fatores' : 'Bem-vindo de volta ao Bolão!'}
                    </p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    {!showTotp ? (
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Senha</label>
                                <input
                                    id="password"
                                    type="password"
                                    className="form-input"
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Entrar'}
                            </button>
                            <div className="text-right mt-sm" style={{ marginTop: '8px', textAlign: 'right' }}>
                                <Link href="/auth/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Esqueci minha senha
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleTotpVerify}>
                            {!useBackup ? (
                                <div className="form-group">
                                    <label htmlFor="totp" className="form-label">Código do Autenticador</label>
                                    <input
                                        id="totp"
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        value={totpToken}
                                        onChange={(e) => setTotpToken(e.target.value)}
                                        required
                                        autoFocus
                                        maxLength={6}
                                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                                    />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label htmlFor="backup" className="form-label">Código de Backup</label>
                                    <input
                                        id="backup"
                                        type="text"
                                        className="form-input"
                                        placeholder="XXXXXXXX"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value)}
                                        required
                                        autoFocus
                                        style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.15em' }}
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Verificar'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost w-full mt-md"
                                onClick={() => setUseBackup(!useBackup)}
                            >
                                {useBackup ? 'Usar código do autenticador' : 'Usar código de backup'}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-lg">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Não tem conta?{' '}
                            <Link href="/auth/register" style={{ fontWeight: 600 }}>Cadastre-se</Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
