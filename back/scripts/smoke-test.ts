// End-to-end smoke test of the top-up API (PAYMENT_MODE=simulation), following the PDHUPL
// scenarios (TC-xx). Needs the API running and the demo seed (supabase/seed.sql).
//   npm run test:smoke        (API_URL, else :4000 / :4100 in simulation mode)
import { resolveApi } from './api-url.ts';
import assert from 'node:assert/strict';

const API = await resolveApi();
const DEMO_PASSWORD = 'valostock-demo';
const RUN = Date.now().toString(36).slice(-6);

type Json = Record<string, unknown>;
type ApiError = { error?: { code?: string; message?: string } };

class Client {
  private jar = new Map<string, string>();
  constructor(readonly name: string) {}

  async call<T = Json>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.jar.size ? { Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [key, ...rest] = pair!.split('=');
      const value = rest.join('=');
      if (value) this.jar.set(key!, value);
      else this.jar.delete(key!);
    }
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }

  async ok<T = Json>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await this.call<T>(method, path, body);
    assert.ok(status >= 200 && status < 300, `${this.name} ${method} ${path} → ${status} ${JSON.stringify(data)}`);
    return data;
  }

  async fails(method: string, path: string, body: unknown, expected: number): Promise<ApiError> {
    const { status, data } = await this.call<ApiError>(method, path, body);
    assert.equal(status, expected, `${this.name} ${method} ${path} expected ${expected}, got ${status} ${JSON.stringify(data)}`);
    return data;
  }

  login = (identity: string, password = DEMO_PASSWORD) => this.ok('POST', '/auth/login', { identity, password });
}

interface Quote {
  basePrice: number;
  discount: number;
  surcharge: number;
  amount: number;
  promo: { code: string; applied: boolean } | null;
}
interface Tx {
  invoice_number: string;
  status: string;
  amount: number;
  user_game_id_masked?: string;
}
interface Checkout {
  transaction: Tx;
  payment: { mode: string; redirectUrl?: string };
  balance?: number;
}
interface Ledger {
  ledger: { type: string; amount: number; balance_after: number; reference: string }[];
}

let step = 0;
const check = (label: string) => console.log(`✓ ${String(++step).padStart(2, '0')} ${label}`);
const invoiceOf = (c: Checkout) => new URL(c.payment.redirectUrl!).searchParams.get('invoice')!;
const pay = (client: Client, invoice: string, result: 'PAID' | 'FAILED' = 'PAID') =>
  client.ok<{ payment: { status: string; next: string } }>('POST', `/payments/${invoice}/simulate`, { result });
const quote = (client: Client, productId: string, method: string, promo?: string) =>
  client.ok<{ quote: Quote }>('GET', `/topup/quote?${new URLSearchParams({ productId, method, ...(promo ? { promo } : {}) })}`);
const order = (productId: string, paymentMethod: string, extra: Json = {}) => ({
  productId,
  userGameId: '800123456',
  gameZoneId: 'Asia',
  paymentMethod,
  ...extra,
});

async function main() {
  const guest = new Client('guest');
  const health = await guest.ok<{ paymentMode: string }>('GET', '/health');
  assert.equal(health.paymentMode, 'simulation', 'run with PAYMENT_MODE=simulation (npm run dev:sim)');
  check('health + simulation mode');

  // ── Autentikasi dan Profil (TC-01 … TC-10) ──
  const member = new Client('member');
  const email = `penguji-${RUN}@valostock.test`;
  const phone = `0812${String(Date.now()).slice(-8)}`;
  const registered = await member.ok<{ user: { name: string; balance: number } }>('POST', '/auth/register', {
    name: `Penguji ${RUN}`,
    email,
    phone,
    password: 'rahasia123',
    ref: 'NIGHTFALL10',
    acceptTerms: true,
  });
  assert.equal(registered.user.balance, 0);
  check('TC-01 register with referral code NIGHTFALL10');

  const dup = await guest.fails('POST', '/auth/register', { name: 'Dup', email, password: 'rahasia123', acceptTerms: true }, 409);
  assert.equal(dup.error?.message, 'Email sudah terdaftar.');
  const badRef = await guest.fails(
    'POST',
    '/auth/register',
    { name: 'Ref', email: `ref-${RUN}@valostock.test`, password: 'rahasia123', ref: 'TIDAKADA', acceptTerms: true },
    400,
  );
  assert.equal(badRef.error?.message, 'Kode referral tidak ditemukan.');
  await guest.fails('POST', '/auth/register', { name: 'Pendek', email: `p-${RUN}@valostock.test`, password: 'pendek', acceptTerms: true }, 400);
  check('TC-02/03/04 duplicate email, unknown referral, short password rejected');

  const byEmail = new Client('by-email');
  await byEmail.login(email, 'rahasia123');
  const byPhone = new Client('by-phone');
  await byPhone.login(phone, 'rahasia123');
  const wrong = await guest.fails('POST', '/auth/login', { identity: email, password: 'salah-sekali' }, 401);
  assert.equal(wrong.error?.message, 'Email/nomor HP atau password salah.');
  await byPhone.ok('POST', '/auth/logout');
  assert.equal((await byPhone.ok<{ user: unknown }>('GET', '/auth/me')).user, null);
  // Logout signs the user out everywhere (GoTrue global sign-out), so the main client logs in again.
  await member.login(email, 'rahasia123');
  check('TC-05/06/07/08 login by email and phone, logout, wrong password');

  const renamed = await member.ok<{ user: { name: string } }>('PATCH', '/auth/profile', { name: `Penguji ${RUN} Edit` });
  assert.equal(renamed.user.name, `Penguji ${RUN} Edit`);
  const badPw = await member.fails('POST', '/auth/change-password', { currentPassword: 'bukan-ini', newPassword: 'rahasia456' }, 400);
  assert.equal(badPw.error?.message, 'Password saat ini salah.');
  check('TC-09/10 edit profile, wrong current password rejected');

  // ── Kelola Produk Top-Up (TC-11 … TC-17) ──
  const admin = new Client('admin');
  await admin.login('admin@valostock.test');
  const { games: adminGames } = await admin.ok<{ games: { id: number; name: string }[] }>('GET', '/admin/topup-products');
  const genshinId = adminGames.find((g) => g.name === 'Genshin Impact')!.id;
  const productId = `uji-crud-${RUN}`;
  await admin.ok('POST', '/admin/topup-products', {
    id: productId,
    gameId: genshinId,
    name: 'Genesis Crystals',
    amountLabel: `99 Crystals Uji ${RUN}`,
    supplierPrice: 20_000,
  });
  const listed = await admin.ok<{ products: { id: string; retailPrice: number; margin: number; isActive: boolean }[] }>('GET', '/admin/topup-products');
  assert.equal(listed.products.find((p) => p.id === productId)?.retailPrice, 20_600);
  check('TC-11 add product: retail = cost + 3% (Rp20.600)');

  const genshin = await guest.ok<{ products: { id: string; section: string }[] }>('GET', '/games/genshin-impact');
  assert.ok(genshin.products.some((p) => p.id === productId));
  assert.ok(genshin.products.some((p) => p.section === 'SPECIAL') && genshin.products.some((p) => p.section === 'INSTANT'));
  check('TC-12/19 new product on the Genshin form, Item Spesial + Top Up Instan');

  const below = await admin.fails('PATCH', `/admin/topup-products/${productId}`, { retailPrice: 15_000 }, 400);
  assert.equal(below.error?.message, 'Harga jual tidak boleh di bawah harga modal Digiflazz.');
  await admin.ok('PATCH', `/admin/topup-products/${productId}`, { retailPrice: 22_000 });
  const repriced = await admin.ok<{ products: { id: string; margin: number }[] }>('GET', '/admin/topup-products');
  assert.equal(repriced.products.find((p) => p.id === productId)?.margin, 2_000);
  check('TC-13/14 retail below cost rejected, Rp22.000 → margin Rp2.000');

  await admin.ok('PATCH', `/admin/topup-products/${productId}`, { isActive: false });
  const afterDeactivate = await guest.ok<{ products: { id: string }[] }>('GET', '/games/genshin-impact');
  assert.ok(!afterDeactivate.products.some((p) => p.id === productId));
  await guest.fails('GET', `/topup/quote?productId=${productId}&method=QRIS`, undefined, 404);
  check('TC-15 deactivated product hidden from the form and not orderable');

  // ── Transaksi Top-Up (TC-18 … TC-27) ──
  const { games } = await guest.ok<{ games: { slug: string }[] }>('GET', '/games');
  assert.deepEqual(games.map((g) => g.slug), ['valorant', 'mobile-legends', 'genshin-impact', 'free-fire']);
  check('TC-18 four games');

  const qris = (await quote(guest, 'gi-330', 'QRIS')).quote;
  assert.deepEqual([qris.basePrice, qris.surcharge, qris.amount], [79_200, 1_188, 80_388]);
  assert.equal((await quote(guest, 'gi-330', 'VA')).quote.amount, 84_200);
  check('TC-20/23 quote 330 Crystals: QRIS Rp80.388, VA Rp84.200');

  const valo10 = (await quote(guest, 'gi-1090', 'QRIS', 'valo10')).quote;
  assert.equal(valo10.discount, 24_910);
  assert.equal(valo10.promo?.applied, true);
  const fake = await guest.fails('GET', '/topup/quote?productId=gi-1090&method=QRIS&promo=PROMOPALSU', undefined, 400);
  assert.equal(fake.error?.message, 'Kode promo tidak ditemukan.');
  const hemat = (await quote(guest, 'gi-60', 'QRIS', 'HEMAT5K')).quote;
  assert.deepEqual([hemat.discount, hemat.amount, hemat.promo?.applied], [0, 16_443, false]);
  check('TC-24/25/26 VALO10 −Rp24.910, unknown promo rejected, HEMAT5K below min spend gives Rp0');

  await guest.fails('POST', '/topup/checkout', { productId: 'gi-330', userGameId: '800123456', paymentMethod: 'QRIS' }, 400);
  await guest.fails('POST', '/topup/checkout', { productId: 'gi-330', userGameId: '', gameZoneId: 'Asia', paymentMethod: 'QRIS' }, 400);
  await guest.fails('POST', '/topup/checkout', order('gi-330', 'QRIS', { gameZoneId: 'Mars' }), 400);
  check('TC-21/22 missing UID / server, unknown server rejected');

  const guestOrder = await guest.ok<Checkout>('POST', '/topup/checkout', order('gi-330', 'QRIS', { contactEmail: 'tamu@valostock.test' }));
  assert.equal(guestOrder.transaction.status, 'PENDING');
  assert.equal(guestOrder.transaction.amount, 80_388);
  assert.match(guestOrder.transaction.invoice_number, /^TU-\d{6}-[A-Z0-9]{6}$/);
  assert.equal(invoiceOf(guestOrder), guestOrder.transaction.invoice_number);
  check('TC-27 guest QRIS invoice: PENDING, Rp80.388, redirect to the payment page');

  // ── Pembayaran Top-Up (TC-28 … TC-31) ──
  const paid = await pay(guest, guestOrder.transaction.invoice_number);
  assert.equal(paid.payment.status, 'PAID');
  assert.equal(paid.payment.next, `/topup/invoice?q=${guestOrder.transaction.invoice_number}`);
  const lookedUp = await guest.ok<{ transaction: Tx }>('GET', `/topup/invoice?q=${guestOrder.transaction.invoice_number.toLowerCase()}`);
  assert.equal(lookedUp.transaction.status, 'SUCCESS');
  assert.equal(lookedUp.transaction.user_game_id_masked, '80*****56');
  assert.ok(!('contact_email' in lookedUp.transaction) && !('user_game_id' in lookedUp.transaction));
  await pay(guest, guestOrder.transaction.invoice_number); // a second result is ignored
  check('TC-28/29/37 simulated payment → SUCCESS; Cek Invoice masks the game ID and hides the contact');

  const toFail = await guest.ok<Checkout>('POST', '/topup/checkout', order('gi-60', 'VA'));
  await pay(guest, toFail.transaction.invoice_number, 'FAILED');
  assert.equal((await guest.ok<{ transaction: Tx }>('GET', `/topup/invoice?q=${toFail.transaction.invoice_number}`)).transaction.status, 'FAILED');
  await guest.fails('GET', '/topup/invoice?q=TU-000000-XXXXXX', undefined, 404);
  check('TC-30/38 failed payment → FAILED; unknown invoice → 404');

  const guestBalance = await guest.fails('POST', '/topup/checkout', order('gi-330', 'BALANCE'), 401);
  assert.match(guestBalance.error?.message ?? '', /Masuk dulu/);
  const broke = await member.fails('POST', '/topup/checkout', order('gi-330', 'BALANCE'), 409);
  assert.equal(broke.error?.message, 'Balance tidak mencukupi.');
  assert.equal((await member.ok<{ transactions: Tx[] }>('GET', '/me/transactions')).transactions.length, 0);
  check('TC-31/32 Balance needs login; insufficient Balance creates no invoice');

  // ── Pengelolaan Balance (TC-33 … TC-36) ──
  const { denominations, maxQty } = await guest.ok<{ denominations: number[]; maxQty: number }>('GET', '/balance/vouchers');
  assert.ok(denominations.includes(100_000) && maxQty === 10);
  const fillQuote = await member.ok<{ quote: { credit: number; surcharge: number; amount: number } }>('GET', '/balance/quote?nominal=100000&qty=1&method=QRIS');
  assert.deepEqual(fillQuote.quote, { credit: 100_000, surcharge: 1_500, amount: 101_500 });
  const key = `smoke-${RUN}-fill`;
  const fill = await member.ok<Checkout>('POST', '/balance/topup', { nominal: 100_000, qty: 1, method: 'QRIS', idempotencyKey: key });
  const again = await member.ok<Checkout>('POST', '/balance/topup', { nominal: 100_000, qty: 1, method: 'QRIS', idempotencyKey: key });
  assert.equal(again.transaction.invoice_number, fill.transaction.invoice_number);
  await member.fails('POST', '/balance/topup', { nominal: 12_345, qty: 1, method: 'QRIS', idempotencyKey: `${key}-x` }, 400);
  const fillPaid = await pay(member, fill.transaction.invoice_number);
  assert.equal(fillPaid.payment.next, '/balance');
  assert.equal((await member.ok<{ user: { balance: number } }>('GET', '/auth/me')).user.balance, 100_000);
  check('TC-34 buy 100.000 BLC voucher (idempotent), paid → Balance 100.000');

  const spend = await member.ok<Checkout>('POST', '/topup/checkout', order('gi-330', 'BALANCE'));
  assert.equal(spend.payment.mode, 'BALANCE');
  assert.equal(spend.transaction.status, 'SUCCESS');
  assert.equal(spend.transaction.amount, 79_200);
  assert.equal(spend.balance, 20_800);
  check('TC-33 pay 330 Crystals with Balance: SUCCESS, no surcharge, Balance 20.800');

  const ledger = (await member.ok<Ledger>('GET', '/me/balance-ledger')).ledger;
  assert.deepEqual(
    ledger.map((l) => [l.type, l.amount, l.balance_after]),
    [
      ['SPEND_TOPUP', -79_200, 20_800],
      ['TOPUP_CREDIT', 100_000, 100_000],
    ],
  );
  const history = (await member.ok<{ transactions: Tx[] }>('GET', '/me/transactions')).transactions;
  assert.deepEqual(history.map((t) => t.invoice_number).sort(), [fill.transaction.invoice_number, spend.transaction.invoice_number].sort());
  check('TC-36/39 Mutasi (TOPUP_CREDIT, SPEND_TOPUP) and Transaksi list both invoices');

  // ── Referral reward: once, on the referred member's first successful top-up ──
  const nightfall = new Client('nightfall');
  await nightfall.login('nightfall@email.com');
  const rewards = async () =>
    (await nightfall.ok<Ledger>('GET', '/me/balance-ledger')).ledger.filter((l) => l.type === 'REFERRAL_CREDIT' && l.reference === spend.transaction.invoice_number);
  assert.equal((await rewards()).length, 1);
  const second = await member.ok<Checkout>('POST', '/topup/checkout', order('gi-60', 'QRIS'));
  await pay(member, second.transaction.invoice_number);
  const allRewards = (await nightfall.ok<Ledger>('GET', '/me/balance-ledger')).ledger.filter((l) => l.type === 'REFERRAL_CREDIT');
  assert.ok(!allRewards.some((l) => l.reference === second.transaction.invoice_number));
  check('referral: Rp10.000 to NIGHTFALL10 once, not again on the second top-up');

  // ── Pelacakan dan Laporan, admin access (TC-40 … TC-42) ──
  await member.fails('GET', '/admin/analytics', undefined, 403);
  await guest.fails('GET', '/admin/topup-products', undefined, 401);
  check('TC-40 non-admins cannot read admin endpoints');

  const analytics = await admin.ok<{ summary: { totalTransactions: number }; accounts: { user_game_id: string; game_zone_id: string | null }[] }>(
    'GET',
    '/admin/analytics',
  );
  assert.ok(analytics.summary.totalTransactions >= 3);
  assert.ok(analytics.accounts.some((a) => a.user_game_id === '800123456' && a.game_zone_id === 'Asia'));
  const search = await admin.ok<{ topups: Tx[]; balanceFills: Tx[] }>('GET', `/admin/topups?q=${guestOrder.transaction.invoice_number}`);
  assert.deepEqual(search.topups.map((t) => t.invoice_number), [guestOrder.transaction.invoice_number]);
  const byEmailSearch = await admin.ok<{ topups: Tx[]; balanceFills: Tx[] }>('GET', `/admin/topups?q=${email}`);
  assert.deepEqual(byEmailSearch.balanceFills.map((t) => t.invoice_number), [fill.transaction.invoice_number]);
  check('TC-41/42 analytics per game account; search by invoice and by email');

  // ── Delete rules (TC-16/17) ──
  const inUse = await admin.fails('DELETE', '/admin/topup-products/gi-60', undefined, 409);
  assert.equal(inUse.error?.message, 'Produk sudah pernah dipesan, nonaktifkan saja agar riwayat invoice tetap utuh.');
  await admin.ok('DELETE', `/admin/topup-products/${productId}`);
  const afterDelete = await admin.ok<{ products: { id: string }[] }>('GET', '/admin/topup-products');
  assert.ok(!afterDelete.products.some((p) => p.id === productId));
  check('TC-16/17 ordered product cannot be deleted; unused test product deleted');

  console.log(`\nSemua ${step} langkah lolos (${API}).`);
}

main().catch((error: unknown) => {
  console.error('\n✗', error instanceof Error ? error.message : error);
  process.exit(1);
});
