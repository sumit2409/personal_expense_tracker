import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { currencyScale, formatMoney, isCurrency, toMinorUnits } from '../lib/currency.ts';

test('currency precision and supported codes', () => {
  assert.equal(toMinorUnits(19.99, 'INR'), 1999);
  assert.equal(toMinorUnits(0.1 + 0.2, 'USD'), 30);
  assert.equal(toMinorUnits(123, 'JPY'), 123);
  for (const amount of [1.5, 0, -1, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(toMinorUnits(amount, 'JPY'), null);
  }
  assert.equal(toMinorUnits(1.001, 'EUR'), null);
  assert.equal(isCurrency('XXX'), false);
  assert.equal(isCurrency('__proto__'), false);
  assert.equal(formatMoney(123, 'JPY'), 'JPY\u00a0123');
});

test('migration preserves EUR records; API round trips currencies and isolates owners', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../drizzle/0000_wide_elektra.sql', import.meta.url), 'utf8'));
    db.prepare('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)').run('old', 'alice', 'Existing', 1999, 'Food', '2026-09-10', 1);
    db.exec(readFileSync(new URL('../drizzle/0001_lowly_wolverine.sql', import.meta.url), 'utf8'));
    assert.equal(db.prepare('SELECT currency FROM expenses WHERE id = ?').get('old').currency, 'EUR');
    let user = { userId: 'alice' };
    const env = { DB: { prepare(sql) {
      const statement = db.prepare(sql);
      const wrap = (args = []) => ({
        bind: (...values) => wrap(values),
        run: async () => statement.run(...args),
        all: async () => ({ results: statement.all(...args) }),
      });
      return wrap();
    } } };
    const code = ts.transpileModule(readFileSync(new URL('../app/api/expenses/route.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    new Function('require', 'exports', code)((name) => {
      if (name === 'cloudflare:workers') return { env };
      if (name === '@/app/chatgpt-auth') return { getChatGPTUser: async () => user };
      if (name === '@/lib/currency') return { currencyScale, isCurrency, toMinorUnits };
      throw new Error(`Unexpected import: ${name}`);
    }, exports);
    const post = (amount, currency) => exports.POST(new Request('http://localhost/api/expenses', {
      method: 'POST', body: JSON.stringify({ title: 'Test', amount, currency, category: 'Food', date: '2026-09-10', userId: 'bob' }),
    }));
    const list = () => exports.GET(new Request('http://localhost/api/expenses?month=2026-09'));
    for (const [amount, currency] of [[12.34, 'INR'], [123, 'JPY'], [20, 'USD']]) {
      const response = await post(amount, currency);
      assert.equal(response.status, 201);
      const { expense } = await response.json();
      assert.equal(expense.amount, amount);
      assert.equal(expense.currency, currency);
    }
    assert.equal((await post(1, 'XXX')).status, 400);
    assert.equal((await post(1.5, 'JPY')).status, 400);
    assert.equal((await post(1.001, 'EUR')).status, 400);
    let rows = (await (await list()).json()).expenses;
    assert.equal(rows.length, 4);
    assert.equal(rows.find(x => x.id === 'old').amount, 19.99);
    user = { userId: 'bob' };
    assert.equal((await (await list()).json()).expenses.length, 0);
    await exports.DELETE(new Request('http://localhost/api/expenses?id=old', { method: 'DELETE' }));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM expenses').get().count, 4);
    user = null;
    assert.equal((await list()).status, 401);
    assert.equal((await post(10, 'INR')).status, 401);
    assert.equal((await exports.DELETE(new Request('http://localhost/api/expenses?id=old', { method: 'DELETE' }))).status, 401);
  } finally {
    db.close();
  }
});
