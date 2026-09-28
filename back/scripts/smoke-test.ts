// End-to-end smoke test of the prototype API (PAYMENT_MODE=simulation).
// Needs the API running (npm run dev) on a freshly seeded database.
//   npm run test:smoke        (API_URL defaults to http://localhost:4000/api)
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const DEMO_PASSWORD = 'valostock-demo';

class Client {
  private cookie = '';
  constructor(readonly name: string) {}

  async call<T = Record<string, unknown>>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T }> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0]!;
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }

  async ok<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await this.call<T>(method, path, body);
    assert.ok(status >= 200 && status < 300, `${this.name} ${method} ${path} → ${status} ${JSON.stringify(data)}`);
    return data;
  }

  login = (email: string) => this.ok('POST', '/auth/login', { identity: email, password: DEMO_PASSWORD });
}

type Session = { mode: string; redirectUrl?: string };
const invoiceOf = (session: Session) => new URL(session.redirectUrl!).searchParams.get('invoice')!;
const pay = (client: Client, invoice: string, result: 'PAID' | 'FAILED' = 'PAID') =>
  client.ok<{ payment: { status: string; next: string } }>('POST', `/payments/${invoice}/simulate`, { result });

let step = 0;
const check = (label: string) => console.log(`✓ ${String(++step).padStart(2, '0')} ${label}`);

async function main() {
  const guest = new Client('guest');
  const health = await guest.ok<{ paymentMode: string }>('GET', '/health');
  assert.equal(health.paymentMode, 'simulation', 'run with PAYMENT_MODE=simulation');
  check('health + simulation mode');

  // Public catalog
  const { games } = await guest.ok<{ games: { slug: string }[] }>('GET', '/games');
  const { listings } = await guest.ok<{ listings: { id: string; storeSlug: string; price: number }[] }>('GET', '/listings');
  const { products } = await guest.ok<{ products: { id: string; retailPrice: number }[] }>('GET', '/games/valorant/topup-products');
  await guest.ok('GET', '/stores/nusagame');
  await guest.ok('GET', '/help/cara-membeli-akun');
  assert.ok(games.length > 0 && listings.length > 0 && products.length > 0);
  check(`public catalog (${games.length} games, ${listings.length} listings)`);

  // Register
  const buyer = new Client('buyer');
  const email = `smoke-${Date.now()}@example.test`;
  await buyer.ok('POST', '/auth/register', { name: 'Smoke Buyer', email, phone: '', password: 'rahasia-123', acceptTerms: true });
  const me = await buyer.ok<{ user: { email: string; balance: number } }>('GET', '/auth/me');
  assert.equal(me.user.email, email);
  check('register + session cookie');

  // Guest top-up with promo, paid via (simulated) Midtrans
  const promo = await guest.ok<{ promo: { code: string } }>('GET', '/topup/promo?code=valo10');
  const product = products.find((p) => p.retailPrice >= 50_000)!;
  const topup = await guest.ok<{ transaction: { invoice_number: string; amount: number; status: string }; payment: Session }>('POST', '/topup/checkout', {
    productId: product.id, userGameId: 'Smoke#TEST', promoCode: promo.promo.code, paymentMethod: 'QRIS', contactEmail: 'guest@example.test',
  });
  assert.equal(topup.transaction.status, 'PENDING');
  const paidTopup = await pay(guest, invoiceOf(topup.payment));
  assert.equal(paidTopup.payment.status, 'PAID');
  const lookup = await guest.ok<{ transactions: { status: string; user_game_id_masked: string }[] }>('GET', `/topup/invoice?q=${topup.transaction.invoice_number}`);
  assert.equal(lookup.transactions[0]!.status, 'SUCCESS');
  assert.ok(!JSON.stringify(lookup).includes('Smoke#TEST'), 'game id must be masked');
  check('guest top-up → PAID → SUCCESS, invoice masked');

  // Replay of the same payment result changes nothing (idempotent)
  const replay = await pay(guest, invoiceOf(topup.payment), 'FAILED');
  assert.equal(replay.payment.status, 'PAID');
  check('payment result is applied only once');

  // Balance fill → ledger
  const fill = await buyer.ok<{ payment: Session }>('POST', '/balance/topup', { nominal: 50_000, qty: 2, method: 'VA', idempotencyKey: `smoke-${Date.now()}` });
  await pay(buyer, invoiceOf(fill.payment));
  const afterFill = await buyer.ok<{ user: { balance: number } }>('GET', '/auth/me');
  assert.equal(afterFill.user.balance, 100_000);
  check('Balance fill 2 × 50.000 → balance 100.000');

  // Top-up paid with Balance
  const cheap = products[0]!;
  const byBalance = await buyer.ok<{ balance: number; transaction: { status: string; amount: number } }>('POST', '/topup/checkout', {
    productId: cheap.id, userGameId: 'Smoke#TEST', paymentMethod: 'BALANCE',
  });
  assert.equal(byBalance.transaction.status, 'SUCCESS');
  assert.equal(byBalance.balance, 100_000 - byBalance.transaction.amount);
  const { ledger } = await buyer.ok<{ ledger: { type: string; balance_after: number }[] }>('GET', '/me/balance-ledger');
  assert.deepEqual(ledger.map((l) => l.type), ['SPEND_TOPUP', 'TOPUP_CREDIT']);
  assert.equal(ledger[0]!.balance_after, byBalance.balance);
  check('top-up with Balance + ledger balance_after');

  // Account purchase → escrow → rekber → complete
  const listing = listings.find((l) => l.storeSlug === 'nusagame')!;
  const { order } = await buyer.ok<{ order: { id: string; totalPaid: number; status: string } }>('POST', '/orders', { catalogId: listing.id });
  assert.equal(order.status, 'PENDING_PAYMENT');
  const other = new Client('other');
  await other.ok('POST', '/auth/register', { name: 'Other Buyer', email: `other-${Date.now()}@example.test`, password: 'rahasia-123', acceptTerms: true });
  const doubleSell = await other.call('POST', '/orders', { catalogId: listing.id });
  assert.equal(doubleSell.status, 409);
  const idor = await other.call('GET', `/orders/${order.id}`);
  assert.equal(idor.status, 404);
  check('order created, catalog locked (double-sell 409), other user cannot see it (404)');

  const store = new Client('store');
  await store.login('nusagame@email.com');
  const before = await store.ok<{ escrow: number; available: number }>('GET', '/stores/me/balance');

  const orderPay = await buyer.ok<{ invoice: string; payment: Session }>('POST', `/orders/${order.id}/pay`, { method: 'QRIS' });
  await pay(buyer, orderPay.invoice);
  const paid = await buyer.ok<{ order: { status: string } }>('GET', `/orders/${order.id}`);
  assert.equal(paid.order.status, 'PAID');
  const held = await store.ok<{ escrow: number }>('GET', '/stores/me/balance');
  assert.equal(held.escrow, before.escrow + listing.price);
  check('order paid → escrow +price');

  const early = await buyer.call('POST', `/orders/${order.id}/safe`);
  assert.equal(early.status, 409);
  await store.ok('POST', `/orders/${order.id}/messages`, { body: 'Email: akun@contoh.test / Pass: ********' });
  await buyer.ok('POST', `/orders/${order.id}/safe`);
  await buyer.ok('POST', `/orders/${order.id}/complete`);
  const done = await buyer.ok<{ order: { status: string; storeReceives: number } }>('GET', `/orders/${order.id}`);
  assert.equal(done.order.status, 'COMPLETED');
  const released = await store.ok<{ escrow: number; available: number; ledger: { type: string }[] }>('GET', '/stores/me/balance');
  assert.equal(released.escrow, before.escrow);
  assert.equal(released.available, before.available + done.order.storeReceives);
  const { messages } = await buyer.ok<{ messages: unknown[] }>('GET', `/orders/${order.id}/messages`);
  assert.ok(messages.length >= 4);
  check('rekber → Akun aman → Selesai → available +(price − 5% commission)');

  // Withdrawal: mismatch rejected, match debits, admin approves
  const mismatch = await store.call('POST', '/stores/me/withdrawals', { amount: 50_000, bankName: 'BCA', accountNumber: '1234567890', accountName: 'Orang Lain' });
  assert.equal(mismatch.status, 400);
  const { withdrawal } = await store.ok<{ withdrawal: { id: string } }>('POST', '/stores/me/withdrawals', {
    amount: 100_000, bankName: 'BCA', accountNumber: '1234567890', accountName: 'Rizky Pratama',
  });
  const debited = await store.ok<{ available: number }>('GET', '/stores/me/balance');
  assert.equal(debited.available, released.available - 100_000);
  check('withdrawal: name MISMATCH rejected, MATCH debits available');

  const admin = new Client('admin');
  await admin.login('admin@valostock.test');
  const forbidden = await buyer.call('GET', '/admin/withdrawals');
  assert.equal(forbidden.status, 403);
  const { withdrawals } = await admin.ok<{ withdrawals: { id: string; uuid: string }[] }>('GET', '/admin/withdrawals?status=PENDING');
  const target = withdrawals.find((w) => w.id === withdrawal.id)!;
  await admin.ok('POST', `/admin/withdrawals/${target.uuid}/approve`, {});
  check('admin approves withdrawal (buyer gets 403 on admin API)');

  // Store onboarding without KYC provider: form → deposit → admin review
  await buyer.ok('POST', '/stores', { name: 'Smoke Store', type: 'OWNER', ownerLegalName: 'Smoke Buyer', acceptRules: true });
  const deposit = await buyer.ok<{ invoice: string }>('POST', '/stores/me/deposit', { method: 'VA' });
  await pay(buyer, deposit.invoice);
  const pendingStore = await buyer.ok<{ store: { id: string; status: string } }>('GET', '/stores/me');
  assert.equal(pendingStore.store.status, 'PENDING_REVIEW');
  const cannotSell = await buyer.call('POST', '/stores/me/catalogs', { gameSlug: 'valorant', title: 'Akun uji coba', price: 100_000 });
  assert.equal(cannotSell.status, 403);
  await admin.ok('POST', `/admin/stores/${pendingStore.store.id}/approve`, { note: 'Data sesuai' });
  const { catalog } = await buyer.ok<{ catalog: { vsCode: string; status: string } }>('POST', '/stores/me/catalogs', {
    gameSlug: 'valorant', title: 'Akun uji coba smoke test', price: 150_000, attributes: { rank: 'Gold 2' },
  });
  assert.equal(catalog.status, 'LISTED');
  assert.match(catalog.vsCode, /^VS[A-Z0-9]{5}$/);
  check('store: form → deposit PAID → PENDING_REVIEW → admin approve → can list');

  // CSRF: foreign Origin rejected
  const csrf = await buyer.call('POST', '/orders', { catalogId: listing.id }, { Origin: 'https://evil.example' });
  assert.equal(csrf.status, 403);
  check('state-changing request from a foreign Origin → 403');

  console.log(`\nSemua ${step} pemeriksaan lolos.`);
}

main().catch((error: unknown) => {
  console.error('\n✗ Smoke test gagal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
