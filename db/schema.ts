import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  category: text('category').notNull(),
  spentOn: text('spent_on').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
