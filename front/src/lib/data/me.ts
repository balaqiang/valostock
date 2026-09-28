// Money records of the logged-in user, served by the Express API. The API
// scopes every query to the session user (anti-IDOR); the web app never
// passes a user id. Empty results when the API is unreachable.
import { serverApiGet } from '@/lib/api-server';
import type {
  AnalyticsSummary,
  BalanceLedgerRecord,
  GameAccountAnalytic,
  TransactionRecord,
} from '@/types/api';

export async function getMyTransactions(): Promise<TransactionRecord[]> {
  return (await serverApiGet<{ transactions: TransactionRecord[] }>('/api/me/transactions'))?.transactions ?? [];
}

export async function getMyBalanceLedger(): Promise<BalanceLedgerRecord[]> {
  return (await serverApiGet<{ ledger: BalanceLedgerRecord[] }>('/api/me/balance-ledger'))?.ledger ?? [];
}

const EMPTY_SUMMARY: AnalyticsSummary = { totalRevenue: 0, totalTransactions: 0, uniqueAccounts: 0, avgTicket: 0 };

/** Admin only — the API answers 403 for everyone else. */
export async function getAdminAnalytics(): Promise<{ summary: AnalyticsSummary; accounts: GameAccountAnalytic[] }> {
  const data = await serverApiGet<{ summary: AnalyticsSummary; accounts: GameAccountAnalytic[] }>(
    '/api/admin/analytics'
  );
  return { summary: data?.summary ?? EMPTY_SUMMARY, accounts: data?.accounts ?? [] };
}
