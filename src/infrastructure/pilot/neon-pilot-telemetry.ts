import { and, desc, eq, gte, sql } from "drizzle-orm";
import { createDb, type Db } from "@/infrastructure/db/client";
import { pilotErrorLogs, pilotEvents, pilotFeedback } from "@/infrastructure/db/schema";

const STACK_MAX = 4000;
const BODY_MAX = 8000;
const MESSAGE_MAX = 2000;

function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null || value === "") {
    return null;
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export type PilotEventInput = {
  orgId: string;
  userId: string;
  eventName: string;
  payload?: Record<string, unknown> | null;
};

export type PilotFeedbackInput = {
  orgId: string;
  userId: string;
  kind: string;
  body: string;
  rating?: string | null;
  flow?: string | null;
  meta?: Record<string, unknown> | null;
};

export type PilotErrorInput = {
  orgId?: string | null;
  userId?: string | null;
  source: string;
  message: string;
  stack?: string | null;
  route?: string | null;
  userAgent?: string | null;
  severity?: "info" | "warn" | "error";
};

function getDb(): Db | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return createDb();
}

export async function insertPilotEvent(input: PilotEventInput): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) {
    return { ok: false };
  }
  await db.insert(pilotEvents).values({
    id: `pe_${crypto.randomUUID()}`,
    orgId: input.orgId,
    userId: input.userId,
    eventName: input.eventName.slice(0, 120),
    payload: input.payload ?? null,
  });
  return { ok: true };
}

export async function insertPilotFeedback(
  input: PilotFeedbackInput,
): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) {
    return { ok: false };
  }
  const body = truncate(input.body.trim(), BODY_MAX);
  if (!body) {
    return { ok: false };
  }
  await db.insert(pilotFeedback).values({
    id: `pf_${crypto.randomUUID()}`,
    orgId: input.orgId,
    userId: input.userId,
    kind: input.kind.slice(0, 40),
    rating: input.rating ? input.rating.slice(0, 16) : null,
    flow: input.flow ? input.flow.slice(0, 40) : null,
    body,
    meta: input.meta ?? null,
  });
  return { ok: true };
}

export async function insertPilotError(input: PilotErrorInput): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) {
    return { ok: false };
  }
  const message = truncate(input.message.trim(), MESSAGE_MAX);
  if (!message) {
    return { ok: false };
  }
  await db.insert(pilotErrorLogs).values({
    id: `per_${crypto.randomUUID()}`,
    orgId: input.orgId ?? null,
    userId: input.userId ?? null,
    source: input.source.slice(0, 120),
    message,
    stack: truncate(input.stack, STACK_MAX),
    route: truncate(input.route, 500),
    userAgent: truncate(input.userAgent, 500),
    severity: input.severity ?? "error",
  });
  return { ok: true };
}

export async function listPilotFeedback(input: {
  orgId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    kind: string;
    rating: string | null;
    flow: string | null;
    body: string;
    meta: Record<string, unknown> | null;
    userId: string;
    createdAt: Date;
  }>
> {
  const db = getDb();
  if (!db) {
    return [];
  }
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const rows = await db
    .select()
    .from(pilotFeedback)
    .where(eq(pilotFeedback.orgId, input.orgId))
    .orderBy(desc(pilotFeedback.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    rating: row.rating,
    flow: row.flow,
    body: row.body,
    meta: row.meta,
    userId: row.userId,
    createdAt: row.createdAt,
  }));
}

export async function listPilotErrors(input: {
  orgId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    source: string;
    message: string;
    route: string | null;
    severity: string;
    userId: string | null;
    createdAt: Date;
  }>
> {
  const db = getDb();
  if (!db) {
    return [];
  }
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const rows = await db
    .select()
    .from(pilotErrorLogs)
    .where(eq(pilotErrorLogs.orgId, input.orgId))
    .orderBy(desc(pilotErrorLogs.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    message: row.message,
    route: row.route,
    severity: row.severity,
    userId: row.userId,
    createdAt: row.createdAt,
  }));
}

export async function listPilotEventCounts(input: {
  orgId: string;
  days?: number;
}): Promise<Array<{ eventName: string; count: number }>> {
  const db = getDb();
  if (!db) {
    return [];
  }
  const days = Math.min(Math.max(input.days ?? 7, 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      eventName: pilotEvents.eventName,
      count: sql<number>`count(*)::int`,
    })
    .from(pilotEvents)
    .where(and(eq(pilotEvents.orgId, input.orgId), gte(pilotEvents.createdAt, since)))
    .groupBy(pilotEvents.eventName)
    .orderBy(desc(sql`count(*)`));
  return rows.map((row) => ({
    eventName: row.eventName,
    count: Number(row.count),
  }));
}
