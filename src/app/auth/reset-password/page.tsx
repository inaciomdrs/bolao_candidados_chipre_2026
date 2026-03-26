'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ResetPasswordPage() {
    const [token, setToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const t = searchParams.get('token');
        if (t) setToken(t);
        else setError('Link de recuperação inválido ou ausente.');
    }, [searchParams]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erro ao redefinir a senha.');
                return;
            }

            setMessage(data.message);
            // Optionally redirect after a few seconds
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch {
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Navbar />
            <div className="auth-container">
                <div className="auth-card fade-in">
                    <h1 className="auth-title">Nova Senha</h1>
                    <p className="auth-subtitle">
                        Crie uma nova senha para sua conta.
                    </p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}
                    {message && <div className="alert alert-success">✅ {message}</div>}

                    {!message && token && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="newPassword" className="form-label">Nova Senha</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    className="form-input"
                                    placeholder="No mínimo 8 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    autoFocus
                                    minLength={8}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword" className="form-label">Confirmar Senha</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    className="form-input"
                                    placeholder="Digite novamente sua senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Salvar Nova Senha'}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-lg">
                        <Link href="/auth/login" className="btn btn-ghost">
                            Voltar para o Login
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
