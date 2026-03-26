'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    
    const [sessions, setSessions] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    const [emailMsg, setEmailMsg] = useState('');
    const [emailErr, setEmailErr] = useState('');
    const [passMsg, setPassMsg] = useState('');
    const [passErr, setPassErr] = useState('');
    const [delErr, setDelErr] = useState('');

    const [loadingEmail, setLoadingEmail] = useState(false);
    const [loadingPass, setLoadingPass] = useState(false);
    const [loadingDel, setLoadingDel] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);

    const router = useRouter();

    useEffect(() => {
        fetchUser();
        fetchSessions();
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setEmail(data.user.email);
            } else {
                router.push('/auth/login');
            }
        } catch { }
    }

    async function fetchSessions() {
        try {
            setLoadingSessions(true);
            const res = await fetch('/api/account/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch { } finally {
            setLoadingSessions(false);
        }
    }

    async function handleUpdateEmail(e: React.FormEvent) {
        e.preventDefault();
        setLoadingEmail(true); setEmailErr(''); setEmailMsg('');
        try {
            const res = await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailErr(data.error);
            } else {
                setEmailMsg('E-mail atualizado com sucesso!');
                setTimeout(() => setEmailMsg(''), 3000);
            }
        } catch {
            setEmailErr('Erro de conexão ao atualizar e-mail.');
        } finally {
            setLoadingEmail(false);
        }
    }

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();
        setLoadingPass(true); setPassErr(''); setPassMsg('');
        
        if (newPassword !== confirmPassword) {
            setPassErr('As novas senhas não coincidem.');
            setLoadingPass(false);
            return;
        }

        try {
            const res = await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                setPassErr(data.error);
            } else {
                setPassMsg('Senha atualizada com sucesso!');
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                fetchSessions(); // Password change revokes other sessions
            }
        } catch {
            setPassErr('Erro de conexão ao atualizar senha.');
        } finally {
            setLoadingPass(false);
        }
    }

    async function handleRevokeSession(sessionId: string) {
        try {
            const res = await fetch(`/api/account/sessions?id=${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchSessions();
            }
        } catch { }
    }

    async function handleDeleteAccount(e: React.FormEvent) {
        e.preventDefault();
        if (!confirm('TEM CERTEZA? Esta ação é irreversível.')) return;

        setLoadingDel(true); setDelErr('');
        try {
            const res = await fetch('/api/account/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword })
            });
            const data = await res.json();
            if (!res.ok) {
                setDelErr(data.error);
                setLoadingDel(false);
            } else {
                router.push('/auth/login');
            }
        } catch {
            setDelErr('Erro de conexão ao excluir conta.');
            setLoadingDel(false);
        }
    }

    if (!user) return <Navbar />;

    return (
        <>
            <Navbar />
            <main className="main-content fade-in" style={{ maxWidth: '800px' }}>
                <div className="page-header">
                    <h1 className="page-title">⚙️ Minha Conta</h1>
                    <p className="page-subtitle">Gerencie suas configurações e segurança</p>
                </div>

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Atualizar E-mail</h3>
                    {emailErr && <div className="alert alert-error">⚠️ {emailErr}</div>}
                    {emailMsg && <div className="alert alert-success">✅ {emailMsg}</div>}
                    <form onSubmit={handleUpdateEmail} className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">E-mail</label>
                            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={loadingEmail}>
                            {loadingEmail ? <span className="spinner" /> : 'Salvar'}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Alterar Senha</h3>
                    {passErr && <div className="alert alert-error">⚠️ {passErr}</div>}
                    {passMsg && <div className="alert alert-success">✅ {passMsg}</div>}
                    <form onSubmit={handleUpdatePassword}>
                        <div className="form-group">
                            <label className="form-label">Senha Atual</label>
                            <input className="form-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nova Senha</label>
                            <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirmar Nova Senha</label>
                            <input className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={loadingPass}>
                            {loadingPass ? <span className="spinner" /> : 'Atualizar Senha'}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Sessões Ativas</h3>
                    {loadingSessions ? <div className="spinner" style={{ margin: 'auto' }} /> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sessions.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{s.userAgent || 'Dispositivo Desconhecido'}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {s.ipAddress} • Visto em {new Date(s.lastActiveAt).toLocaleString()}
                                            {s.isCurrent && <span style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>(Sessão Atual)</span>}
                                        </div>
                                    </div>
                                    {!s.isCurrent && (
                                        <button className="btn btn-sm btn-danger" onClick={() => handleRevokeSession(s.id)}>
                                            Revogar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card" style={{ border: '1px solid #dc2626' }}>
                    <h3 style={{ marginBottom: '16px', color: '#dc2626' }}>Excluir Conta</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Ao excluir sua conta, todas as suas sessões serão encerradas. Suas apostas passadas continuarão a existir, porém associadas a um usuário "Conta Excluída".
                    </p>
                    {delErr && <div className="alert alert-error">⚠️ {delErr}</div>}
                    <form onSubmit={handleDeleteAccount} className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ color: '#dc2626' }}>Confirme com sua senha</label>
                            <input className="form-input" type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required />
                        </div>
                        <button className="btn btn-danger" type="submit" disabled={loadingDel}>
                            {loadingDel ? <span className="spinner" /> : 'Excluir Definitivamente'}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}
