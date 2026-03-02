'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            setSuccess(data.message);
            setTimeout(() => router.push('/auth/login'), 2000);
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
                    <h1 className="auth-title">♚ Cadastrar</h1>
                    <p className="auth-subtitle">Crie sua conta no Bolão dos Candidatos</p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}
                    {success && <div className="alert alert-success">✅ {success}</div>}

                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label htmlFor="name" className="form-label">Nome</label>
                            <input
                                id="name"
                                type="text"
                                className="form-input"
                                placeholder="Seu nome completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

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
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Senha</label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="Mín. 8 caracteres, maiúscula, minúscula e número"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">Confirmar Senha</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="form-input"
                                placeholder="Repita a senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Criar Conta'}
                        </button>
                    </form>

                    <div className="text-center mt-lg">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Já tem conta?{' '}
                            <Link href="/auth/login" style={{ fontWeight: 600 }}>Faça login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
