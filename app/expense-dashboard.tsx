'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, CalendarDays, LogOut, Plus, ReceiptText, Trash2, TrendingDown, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ChatGPTUser } from './chatgpt-auth';

type Expense = { id: string; title: string; amount: number; category: string; date: string };

const seed: Expense[] = [
  { id: '1', title: 'Weekly groceries', amount: 64.8, category: 'Food', date: new Date().toISOString().slice(0, 10) },
  { id: '2', title: 'Metro pass', amount: 22, category: 'Transport', date: new Date().toISOString().slice(0, 10) },
  { id: '3', title: 'Coffee with Sam', amount: 8.5, category: 'Food', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
  { id: '4', title: 'Internet bill', amount: 39.99, category: 'Bills', date: new Date(Date.now() - 172800000).toISOString().slice(0, 10) },
];

const colors: Record<string, string> = { Food: '#e06b3c', Transport: '#177e73', Bills: '#5367a8', Shopping: '#d49b24', Health: '#b75478', Other: '#75807a' };

export function ExpenseDashboard({ user }: { user: ChatGPTUser | null }) {
  const [expenses, setExpenses] = useState<Expense[]>(user ? [] : seed);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState(user ? 'Loading your expenses…' : '');
  const month = today.slice(0, 7);
  const todayTotal = expenses.filter((x) => x.date === today).reduce((s, x) => s + x.amount, 0);
  const monthTotal = expenses.filter((x) => x.date.startsWith(month)).reduce((s, x) => s + x.amount, 0);
  const breakdown = useMemo(() => Object.entries(expenses.reduce<Record<string, number>>((a, x) => ({ ...a, [x.category]: (a[x.category] ?? 0) + x.amount }), {})).sort((a, b) => b[1] - a[1]), [expenses]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/expenses?month=${month}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load expenses');
        return response.json() as Promise<{ expenses: Expense[] }>;
      })
      .then((data) => { setExpenses(data.expenses); setStatus(''); })
      .catch(() => setStatus('Could not load your expenses. Please refresh.'));
  }, [user, month]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    const next = { id: crypto.randomUUID(), title: title.trim(), amount: value, category, date };
    if (!user) { setExpenses((items) => [next, ...items]); setTitle(''); setAmount(''); return; }
    setStatus('Saving…');
    const response = await fetch('/api/expenses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
    if (!response.ok) { setStatus('Could not save that expense.'); return; }
    const data = await response.json() as { expense: Expense };
    setExpenses((items) => [data.expense, ...items]);
    setTitle(''); setAmount(''); setStatus('Saved');
    setTimeout(() => setStatus(''), 1800);
  }

  async function removeExpense(id: string) {
    if (user) {
      const response = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) { setStatus('Could not delete that expense.'); return; }
    }
    setExpenses((items) => items.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#18342f]">
      <header className="border-b border-[#18342f]/10 bg-[#f5f1e8]/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#18342f] text-[#f5f1e8]"><WalletCards size={20}/></span><div><p className="font-serif text-xl font-bold leading-none">Pennywise</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#64736f]">Money, made clear</p></div></div><div className="flex items-center gap-3">{user ? <><span className="hidden text-sm text-[#64736f] sm:block">{user.displayName}</span><a href="/signout-with-chatgpt?return_to=/" className="grid size-9 place-items-center rounded-full border border-[#18342f]/15" aria-label="Sign out"><LogOut size={16}/></a></> : <a href="/signin-with-chatgpt?return_to=/" target="_top"><Button className="h-10 rounded-full bg-[#e66035] px-5 hover:bg-[#c84f29]">Sign in to save</Button></a>}</div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        {!user && <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[#d5b866]/40 bg-[#fff8d9] px-4 py-3 text-sm"><p><strong>Preview mode.</strong> Sign in to keep expenses private and available on every device.</p><a href="/signin-with-chatgpt?return_to=/" target="_top" className="shrink-0 font-bold text-[#c64f29]">Get started →</a></div>}
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#e66035]"><CalendarDays size={14}/> {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p><h1 className="max-w-2xl font-serif text-4xl font-bold tracking-tight md:text-5xl">Know where your money goes.</h1></div><p className="max-w-sm text-sm leading-6 text-[#64736f]">A calm, honest view of your daily spending and monthly habits.</p></section>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <section className="grid gap-5 sm:grid-cols-2">
            <Card className="border-0 bg-[#18342f] text-white ring-0 sm:col-span-2"><CardContent className="grid gap-7 p-6 sm:grid-cols-2 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#b8c9c4]">Spent this month</p><p className="mt-3 font-serif text-5xl font-bold">€{monthTotal.toFixed(2)}</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#d9e7e2]"><TrendingDown size={14}/> Track a little, save a lot</p></div><div className="flex items-end gap-2 self-end" aria-label="Monthly spending trend">{[42,68,51,83,57,91,64,76,48,70,88,60].map((h,i)=><span key={i} className="flex-1 rounded-t bg-[#f0b24a]" style={{height:`${h}px`, opacity: i === 11 ? 1 : .35 + i/25}}/>)}</div></CardContent></Card>
            <Card className="border-0 bg-[#e7ddd0] ring-0"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#64736f]">Today</p><span className="grid size-9 place-items-center rounded-full bg-white/60"><ArrowDownRight size={18}/></span></div><p className="mt-6 font-serif text-3xl font-bold">€{todayTotal.toFixed(2)}</p><p className="mt-2 text-sm text-[#64736f]">{expenses.filter(x=>x.date===today).length} expenses logged</p></CardContent></Card>
            <Card className="border-0 bg-[#e9c96f] ring-0"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#66510f]">Daily average</p><ReceiptText size={19}/></div><p className="mt-6 font-serif text-3xl font-bold">€{(monthTotal / Math.max(new Date().getDate(),1)).toFixed(2)}</p><p className="mt-2 text-sm text-[#66510f]">so far this month</p></CardContent></Card>
            <Card className="border-0 bg-[#fffdfa] ring-1 ring-[#18342f]/10 sm:col-span-2"><CardHeader className="px-6 pt-2"><CardTitle className="font-serif text-2xl font-bold">Recent expenses</CardTitle></CardHeader><CardContent className="px-6">{status && <p aria-live="polite" className="pb-2 text-sm text-[#64736f]">{status}</p>}<div className="divide-y divide-[#18342f]/10">{expenses.slice(0,8).map(x=><div key={x.id} className="group flex items-center gap-4 py-4"><span className="size-2.5 rounded-full" style={{background:colors[x.category]}}/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.title}</p><p className="text-xs text-[#73807c]">{x.category} · {x.date === today ? 'Today' : x.date}</p></div><p className="font-mono font-bold">−€{x.amount.toFixed(2)}</p><button onClick={()=>removeExpense(x.id)} className="grid size-8 place-items-center rounded-full text-[#71807b] opacity-70 hover:bg-[#f5eee5] hover:text-[#b23e28] sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${x.title}`}><Trash2 size={15}/></button></div>)}{!expenses.length && !status && <p className="py-10 text-center text-sm text-[#73807c]">No expenses yet. Add your first one.</p>}</div></CardContent></Card>
          </section>
          <aside className="space-y-5">
            <Card className="border-0 bg-[#fffdfa] ring-1 ring-[#18342f]/10"><CardHeader className="px-6 pt-2"><CardTitle className="font-serif text-2xl font-bold">Add an expense</CardTitle></CardHeader><CardContent className="px-6 pb-6"><form onSubmit={addExpense} className="space-y-4"><label className="block text-xs font-bold uppercase tracking-[.12em]">What was it?<Input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Lunch, rent, train…" className="mt-2 h-11 bg-[#f8f5ee]"/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold uppercase tracking-[.12em]">Amount<Input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="mt-2 h-11 bg-[#f8f5ee]"/></label><label className="block text-xs font-bold uppercase tracking-[.12em]">Category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#18342f]/15 bg-[#f8f5ee] px-3 text-sm">{Object.keys(colors).map(c=><option key={c}>{c}</option>)}</select></label></div><label className="block text-xs font-bold uppercase tracking-[.12em]">Date<Input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 h-11 bg-[#f8f5ee]"/></label><Button type="submit" className="h-12 w-full rounded-xl bg-[#e66035] text-base hover:bg-[#c84f29]"><Plus/> Add expense</Button></form></CardContent></Card>
            <Card className="border-0 bg-[#dbe8e2] ring-0"><CardHeader className="px-6 pt-2"><CardTitle className="font-serif text-xl font-bold">This month by category</CardTitle></CardHeader><CardContent className="space-y-4 px-6">{breakdown.slice(0,5).map(([name,value])=><div key={name}><div className="mb-1.5 flex justify-between text-sm"><span>{name}</span><strong>€{value.toFixed(2)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full" style={{width:`${Math.max(7,value/monthTotal*100)}%`,background:colors[name]}}/></div></div>)}</CardContent></Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
