import type { TransactionRecord } from '@/types/api';

/** "Nightfall#GGWP" → "Ni**********WP", "512776401" → "51*****01". */
export function maskGameId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return `${trimmed.charAt(0)}***`;
  return `${trimmed.slice(0, 2)}${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-2)}`;
}

/** Transaction as shown on public pages: game account masked, owner hidden. */
export type PublicTransaction = Omit<TransactionRecord, 'user_game_id' | 'game_zone_id' | 'user_id'> & {
  user_game_id_masked: string;
  game_zone_id_masked: string | null;
};

export function toPublicTransaction(tx: TransactionRecord): PublicTransaction {
  const { user_game_id, game_zone_id, user_id: _userId, ...rest } = tx;
  void _userId;
  return {
    ...rest,
    user_game_id_masked: maskGameId(user_game_id),
    game_zone_id_masked: game_zone_id ? maskGameId(game_zone_id) : null,
  };
}
