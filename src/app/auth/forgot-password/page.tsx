'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erro ao solicitar recuperação.');
                return;
            }

            setMessage(data.message);
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
                    <h1 className="auth-title">Recuperar Senha</h1>
                    <p className="auth-subtitle">
                        Insira seu e-mail e enviaremos um link de recuperação.
                    </p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}
                    {message && <div className="alert alert-success">✅ {message}</div>}

                    {!message && (
                        <form onSubmit={handleSubmit}>
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

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Enviar Link'}
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
