'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    totpEnabled: boolean;
}

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchUser();
        fetchNotifications();
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch { }
    }

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications?unread=true&limit=1');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { }
    }

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        router.push('/auth/login');
    }

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-brand">
                    <span className="chess-icon">♚</span>
                    <span>Bolão 2026</span>
                </Link>

                <ul className="navbar-links">
                    <li><Link href="/">Início</Link></li>
                    <li><Link href="/championships">Campeonatos</Link></li>
                    {user && (
                        <>
                            <li>
                                <Link href="/notifications">
                                    🔔
                                    {unreadCount > 0 && (
                                        <span className="notification-badge">{unreadCount}</span>
                                    )}
                                </Link>
                            </li>
                            {user.role === 'gerente' && (
                                <li><Link href="/manager">Gerenciar</Link></li>
                            )}
                        </>
                    )}
                </ul>

                <div className="navbar-actions">
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {user.name}
                            </span>
                            <Link href="/account" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                                Minha Conta
                            </Link>
                            {!user.totpEnabled && (
                                <Link href="/auth/totp-setup" className="btn btn-sm btn-secondary">
                                    Ativar 2FA
                                </Link>
                            )}
                            <button onClick={handleLogout} className="btn btn-sm btn-ghost">
                                Sair
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href="/auth/login" className="btn btn-sm btn-ghost">
                                Entrar
                            </Link>
                            <Link href="/auth/register" className="btn btn-sm btn-primary">
                                Cadastrar
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
