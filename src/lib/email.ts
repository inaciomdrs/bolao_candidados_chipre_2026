import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST) {
        console.warn('[email] SMTP_HOST is not configured. Emails will not be sent.');
        // Return a fake transporter that drops messages
        return nodemailer.createTransport({ jsonTransport: true });
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });

    return transporter;
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

/**
 * Sends an email via the configured SMTP server.
 * If SMTP is not configured, logs a warning and does nothing.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    const from = process.env.SMTP_FROM || `"Bolão 2026" <noreply@bolao2026.com>`;

    if (!process.env.SMTP_HOST) {
        console.warn(`[email] Skipping email to ${to} — SMTP not configured. Subject: ${subject}`);
        return;
    }

    try {
        const t = getTransporter();
        await t.sendMail({ from, to, subject, html });
    } catch (err) {
        // Never let email failures crash the app
        console.error(`[email] Failed to send email to ${to}:`, err);
    }
}

// ─────────────────────────────────────────────
// Email Templates (all in pt-BR)
// ─────────────────────────────────────────────

const layout = (body: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: #4f46e5; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 1.4rem; color: #fff; }
    .body { padding: 32px; }
    .body p { line-height: 1.6; color: #cbd5e1; }
    .btn { display: inline-block; margin: 20px 0; padding: 14px 28px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; }
    .footer { padding: 16px 32px; font-size: 0.75rem; color: #64748b; border-top: 1px solid #2d2d44; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>♚ Bolão 2026</h1></div>
    <div class="body">${body}</div>
    <div class="footer">Este é um e-mail automático. Não responda a esta mensagem.</div>
  </div>
</body>
</html>
`;

export function buildMagicLinkEmail(resetUrl: string): string {
    return layout(`
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Bolão 2026</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>30 minutos</strong> e é válido para uso único.</p>
        <a href="${resetUrl}" class="btn">Redefinir minha senha</a>
        <p>Se você não solicitou esta recuperação, ignore este e-mail. Sua senha permanece inalterada.</p>
    `);
}

export function buildPasswordChangedEmail(): string {
    return layout(`
        <p>Sua senha no <strong>Bolão 2026</strong> foi <strong>alterada</strong> com sucesso.</p>
        <p>Se você não realizou esta alteração, entre em contato com o gerente do bolão imediatamente.</p>
    `);
}

export function buildEmailChangedEmail(newEmail: string): string {
    return layout(`
        <p>O e-mail associado à sua conta no <strong>Bolão 2026</strong> foi alterado.</p>
        <p>Novo e-mail: <strong>${newEmail}</strong></p>
        <p>Se você não realizou esta alteração, entre em contato com o gerente do bolão imediatamente.</p>
    `);
}

export function buildPasswordResetEmail(): string {
    return layout(`
        <p>Sua senha no <strong>Bolão 2026</strong> foi <strong>redefinida</strong> com sucesso via link de recuperação.</p>
        <p>Se você não realizou esta ação, entre em contato com o gerente do bolão imediatamente.</p>
    `);
}

export function buildTotpDisabledEmail(): string {
    return layout(`
        <p>A <strong>verificação em duas etapas (2FA)</strong> da sua conta no <strong>Bolão 2026</strong> foi desativada por um gerente.</p>
        <p>Você precisará configurar o 2FA novamente ao fazer login.</p>
        <p>Se você não esperava por esta ação, entre em contato com o gerente do bolão.</p>
    `);
}

export function buildPasswordForcedEmail(): string {
    return layout(`
        <p>A senha da sua conta no <strong>Bolão 2026</strong> foi <strong>redefinida por um gerente</strong>.</p>
        <p>Você receberá suas novas credenciais pelo gerente. Todas as suas sessões ativas foram encerradas.</p>
    `);
}

export function buildAccountDeletedEmail(): string {
    return layout(`
        <p>Sua conta no <strong>Bolão 2026</strong> foi <strong>excluída</strong>.</p>
        <p>Seus dados históricos (apostas, pontuação) foram preservados, mas sua identidade foi removida das visualizações públicas.</p>
    `);
}
