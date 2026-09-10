import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const categories = new Set(['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Other']);

async function prepareDatabase() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    spent_on TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, spent_on DESC)').run();
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  await prepareDatabase();
  const month = new URL(request.url).searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: 'Invalid month' }, { status: 400 });
  const result = await env.DB.prepare(`SELECT id, title, amount_cents, category, spent_on
    FROM expenses WHERE user_id = ? AND spent_on LIKE ? ORDER BY spent_on DESC, created_at DESC`)
    .bind(user.userId, `${month}%`).all();
  return Response.json({ expenses: result.results.map((row: Record<string, unknown>) => ({
    id: row.id, title: row.title, amount: Number(row.amount_cents) / 100,
    category: row.category, date: row.spent_on,
  })) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const body = await request.json() as { title?: string; amount?: number; category?: string; date?: string };
  const title = body.title?.trim();
  const cents = Math.round(Number(body.amount) * 100);
  const date = body.date;
  if (!title || title.length > 100 || !Number.isSafeInteger(cents) || cents <= 0 || !body.category || !categories.has(body.category) || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Please check the expense details' }, { status: 400 });
  }
  await prepareDatabase();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO expenses (id, user_id, title, amount_cents, category, spent_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.userId, title, cents, body.category, date, Date.now()).run();
  return Response.json({ expense: { id, title, amount: cents / 100, category: body.category, date } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Expense id required' }, { status: 400 });
  await prepareDatabase();
  await env.DB.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').bind(id, user.userId).run();
  return Response.json({ ok: true });
}
