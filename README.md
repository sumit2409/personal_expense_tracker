# personal_expense_tracker

Pennywise is a personal expense tracker with monthly totals, category breakdowns,
and private expense records associated with your ChatGPT identity.

[Open the live application](https://pennywise-expense-tracker.contactsumit2409.chatgpt.site)

## Features

- Add and delete expenses with a title, amount, category, and date.
- Record expenses in EUR, INR, USD, GBP, CAD, AUD, CHF, SGD, AED, or JPY.
- View monthly spending, today's spending, and category totals separately by currency.
- Existing records remain EUR; currency selection does not convert exchange rates.
- Try an anonymous preview; preview edits are temporary.
- Sign in with ChatGPT to save expenses in the hosted database.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by the development server. The Sites Vite plugin
provides a simulated local ChatGPT user when you click **Sign in to save**.
This development identity is not a real ChatGPT login and is excluded from
production builds. Local database state is separate from the hosted database.

```sh
npm run build
npm run lint
node --test tests/currency.test.mjs
```

## Architecture and authentication

- React UI: `app/expense-dashboard.tsx`.
- Server-rendered entry point: `app/page.tsx`.
- Identity header adapter: `app/chatgpt-auth.ts`.
- Expense API: `app/api/expenses/route.ts`.
- Cloudflare D1 schema and migrations: `db/` and `drizzle/`.
- Vinext/Vite and Sites deployment configuration: `vite.config.ts` and
  `.openai/hosting.json`.

The hosting layer supplies authenticated user ID and email headers. Every expense
API method requires that identity. Reads and deletes filter by the authenticated
user ID; writes assign ownership on the server. The app does not store passwords
or implement access-token exchange or refresh. A production host must authenticate
requests and prevent clients from forging these identity headers.

## Hosting

GitHub stores this application's source. The running application is hosted on
OpenAI Sites with its server API, ChatGPT authentication, and Cloudflare D1 binding.
GitHub Pages only serves static content and cannot run this application's existing
server API or database integration. Uploading to GitHub does not automatically
redeploy the Sites application.

The checked-in hosting configuration identifies the existing Sites project and
logical `DB` binding; it contains no database credentials. Deployments require
access to that Sites project. Forks need their own hosting resources and identity
integration.

Local environment files, dependency folders, generated builds, and local database
state are excluded by `.gitignore`. Do not commit credentials or personal expense
database files.
