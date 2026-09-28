// Money records of the logged-in user, served by the Express API. The API
// scopes every query to the session user (anti-IDOR); the web app never
// passes a user id. Empty results when the API is unreachable.
import { serverApiGet } from '@/lib/api-server';
import type { BalanceLedgerRecord, TransactionRecord } from '@/types/api';

export async function getMyTransactions(): Promise<TransactionRecord[]> {
  return (await serverApiGet<{ transactions: TransactionRecord[] }>('/api/me/transactions'))?.transactions ?? [];
}

export async function getMyBalanceLedger(): Promise<BalanceLedgerRecord[]> {
  return (await serverApiGet<{ ledger: BalanceLedgerRecord[] }>('/api/me/balance-ledger'))?.ledger ?? [];
}
