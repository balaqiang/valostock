// Calls every read endpoint once per role and reports non-2xx answers.
// Catches SQL/shape errors in routes the smoke test doesn't walk through.
//   npx tsx scripts/endpoint-sweep.ts   (API running, seeded database)
import { resolveApi } from './api-url.ts';
const API = await resolveApi();

async function login(email: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password: 'valostock-demo' }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status}`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

async function get(cookie: string, path: string): Promise<[number, unknown]> {
  const res = await fetch(`${API}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  return [res.status, await res.json().catch(() => null)];
}

async function main() {
  const failures: string[] = [];
  const sweep = async (who: string, cookie: string, paths: string[]) => {
    for (const path of paths) {
      const [status, body] = await get(cookie, path);
      if (status >= 300) failures.push(`${who} GET ${path} → ${status} ${JSON.stringify(body).slice(0, 200)}`);
    }
  };

  const [, listings] = (await get('', '/listings?limit=3')) as [number, { listings: { id: string }[] }];
  const catalogId = listings.listings[0]!.id;
  await sweep('guest', '', ['/home', '/site', '/news', '/help', '/stores', `/listings/${catalogId}`, `/catalogs/${catalogId}/buy-context`, '/games/mobile-legends']);

  const admin = await login('admin@valostock.test');
  const [, stores] = (await get(admin, '/admin/stores?status=ALL')) as [number, { stores: { id: string }[] }];
  const [, games] = (await get(admin, '/admin/games')) as [number, { games: { id: number }[] }];
  const [, users] = (await get(admin, '/admin/users')) as [number, { users: { id: string }[] }];
  const [, orders] = (await get(admin, '/admin/orders')) as [number, { orders: { id: string }[] }];
  await sweep('admin', admin, [
    '/auth/me',
    '/admin/queue-counts',
    '/admin/dashboard',
    '/admin/catalogs?status=ALL',
    '/admin/catalogs?status=PENDING_REVIEW&overdue=1',
    `/admin/catalogs/${catalogId}`,
    `/admin/stores/${stores.stores[0]!.id}`,
    '/admin/reports?status=ALL',
    '/admin/orders?q=ORD',
    ...(orders.orders[0] ? [`/admin/orders/${orders.orders[0].id}`] : []),
    '/admin/disputes?status=ALL',
    '/admin/topups',
    '/admin/payments',
    '/admin/withdrawals?status=ALL',
    '/admin/transfers?status=ALL',
    '/admin/finance?days=7',
    '/admin/ads',
    '/admin/games',
    `/admin/games/${games.games[0]!.id}/fields`,
    '/admin/topup-products',
    '/admin/promo-codes',
    '/admin/news',
    '/admin/help',
    '/admin/cms/texts',
    '/admin/cms/banners',
    '/admin/users?q=a',
    `/admin/users/${users.users[0]!.id}`,
    '/admin/admins',
    '/admin/audit?action=catalog',
    '/admin/analytics',
    '/admin/refunds?status=ALL',
    '/admin/stores?status=CLOSING',
  ]);

  const nusa = await login('nusagame@email.com');
  await sweep('store', nusa, [
    '/stores/me',
    '/stores/me/dashboard',
    '/stores/me/analytics',
    '/stores/me/catalogs',
    '/stores/me/catalogs?status=LISTED',
    '/stores/me/orders',
    '/stores/me/offers',
    '/stores/me/balance',
    '/stores/me/withdrawals',
    '/stores/me/subscription',
    '/stores/me/ratings',
    '/stores/me/vouchers',
    '/stores/me/flash-sales',
    '/stores/me/bundles',
    '/stores/me/ads',
    '/stores/me/disputes',
    '/stores/me/conversations',
    '/stores/me/external-sellers',
    '/stores/me/transfers',
  ]);

  const buyer = await login('nightfall@email.com');
  await sweep('buyer', buyer, [
    '/me/orders',
    '/me/offers',
    '/me/disputes',
    '/me/wishlist',
    '/me/following',
    '/me/recently-viewed',
    '/me/recommendations',
    '/me/notifications',
    '/me/points',
    '/me/referral',
    '/me/reports',
    '/me/transactions',
    '/me/balance-ledger',
    '/chat/conversations',
    `/catalogs/${catalogId}/buy-context`,
  ]);

  if (failures.length) {
    console.log(failures.join('\n'));
    process.exit(1);
  }
  console.log('Semua endpoint GET menjawab 2xx.');
}

void main();
