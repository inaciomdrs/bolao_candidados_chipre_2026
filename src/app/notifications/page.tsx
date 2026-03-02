'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Notification {
    id: number;
    type: string;
    payload: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications?limit=50');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch { } finally {
            setLoading(false);
        }
    }

    async function markAllRead() {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch { }
    }

    function getNotificationText(n: Notification) {
        try {
            const p = JSON.parse(n.payload);
            switch (n.type) {
                case 'result_published':
                    return `Resultado publicado: ${p.playerWhite} vs ${p.playerBlack} — Você ganhou ${p.pointsEarned} ponto(s)!`;
                case 'bet_locked':
                    return `Sua aposta foi travada para ${p.playerWhite} vs ${p.playerBlack}.`;
                case 'leaderboard_change':
                    return `Você está em ${p.position}º lugar com ${p.totalPoints} pontos!`;
                case 'announcement':
                    return p.message || 'Novo comunicado do gerente.';
                default:
                    return JSON.stringify(p);
            }
        } catch {
            return n.payload;
        }
    }

    function getNotificationIcon(type: string) {
        switch (type) {
            case 'result_published': return '✅';
            case 'bet_locked': return '🔒';
            case 'leaderboard_change': return '🏆';
            case 'announcement': return '📢';
            default: return '🔔';
        }
    }

    function formatDate(dateStr: string) {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateStr));
    }

    return (
        <>
            <Navbar />
            <main className="main-content fade-in">
                <div className="page-header flex-between">
                    <div>
                        <h1 className="page-title">🔔 Notificações</h1>
                        <p className="page-subtitle">Acompanhe as atualizações do bolão</p>
                    </div>
                    {notifications.some(n => !n.isRead) && (
                        <button onClick={markAllRead} className="btn btn-secondary btn-sm">
                            Marcar todas como lidas
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-overlay">
                        <span className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔕</div>
                        <p className="empty-state-text">Nenhuma notificação ainda.</p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {notifications.map((n) => (
                            <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}>
                                <span style={{ fontSize: '1.2rem' }}>{getNotificationIcon(n.type)}</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {getNotificationText(n)}
                                    </p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {formatDate(n.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
