import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getSessionId, listUserSessions, revokeSession } from '@/lib/sessions';

export async function GET(_request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const currentSessionId = await getSessionId();
        const sessions = await listUserSessions(user.id, currentSessionId);

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('List sessions error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'ID da sessão é obrigatório.' }, { status: 400 });
        }

        const currentSessionId = await getSessionId();
        const result = await revokeSession(sessionId, user.id, currentSessionId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ message: 'Sessão revogada com sucesso.' });
    } catch (error) {
        console.error('Revoke session error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
