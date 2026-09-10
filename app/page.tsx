import { getChatGPTUser } from './chatgpt-auth';
import { ExpenseDashboard } from './expense-dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return <ExpenseDashboard user={user} />;
}
