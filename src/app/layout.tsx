import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Bolão — Candidatos 2026',
    description: 'Bolão de apostas amigáveis para o Torneio de Candidatos de Xadrez 2026',
    keywords: 'xadrez, candidatos, bolão, apostas, torneio',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body>
                <div className="app-container">
                    {children}
                </div>
            </body>
        </html>
    );
}
