import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/sessions';

/**
 * GET /api/notifications — List user's notifications
 * PATCH /api/notifications — Mark notifications as read
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const onlyUnread = searchParams.get('unread') === 'true';

        const where: any = { userId: user.id };
        if (onlyUnread) where.isRead = false;

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, isRead: false },
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { notificationIds } = body;

        if (notificationIds && Array.isArray(notificationIds)) {
            await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId: user.id,
                },
                data: { isRead: true },
            });
        } else {
            // Mark all as read
            await prisma.notification.updateMany({
                where: { userId: user.id, isRead: false },
                data: { isRead: true },
            });
        }

        return NextResponse.json({ message: 'Notificações marcadas como lidas.' });
    } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        console.error('Notifications patch error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}
