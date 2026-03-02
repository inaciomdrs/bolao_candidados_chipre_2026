import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/sessions';
import { generateCsrfToken } from '@/lib/csrf';

/**
 * GET /api/auth/me — Get the current authenticated user
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const csrfToken = await generateCsrfToken();

        return NextResponse.json({ user, csrfToken });
    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
