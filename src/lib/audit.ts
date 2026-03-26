import prisma from './prisma';

export interface AuditEventOptions {
    actorId: number;
    targetId?: number;
    action: string;
    metadata?: Record<string, unknown>;
}

/**
 * Writes a lightweight audit log entry to the database.
 * Never throws — failures are silently logged.
 */
export async function logAuditEvent({
    actorId,
    targetId,
    action,
    metadata,
}: AuditEventOptions): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actorId,
                targetId: targetId ?? null,
                action,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });
    } catch (err) {
        console.error('[audit] Failed to write audit log:', err);
    }
}
