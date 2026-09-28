// End-to-end smoke test of the v8 API (PAYMENT_MODE=simulation) on a freshly
// reset database (`npm run db:reset`). Needs the API running (`npm run dev`).
//   npm run test:smoke        (API_URL defaults to http://localhost:4000/api)
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const DEMO_PASSWORD = 'valostock-demo';
// 1×1 transparent PNG — a real image so the magic-byte check passes.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

type Json = Record<string, unknown>;

class Client {
  private jar = new Map<string, string>();
  constructor(readonly name: string) {}

  private cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async call<T = Json>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(this.jar.size ? { Cookie: this.cookieHeader() } : {}),
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
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

  async fails(method: string, path: string, body: unknown, expected: number) {
    const { status, data } = await this.call(method, path, body);
    assert.equal(status, expected, `${this.name} ${method} ${path} expected ${expected}, got ${status} ${JSON.stringify(data)}`);
    return data as { error?: { code?: string; message?: string } };
  }

  login = (email: string) => this.ok('POST', '/auth/login', { identity: email, password: DEMO_PASSWORD });
}

type Session = { mode: string; redirectUrl?: string };
const invoiceOf = (session: Session) => new URL(session.redirectUrl!).searchParams.get('invoice')!;
const pay = (client: Client, invoice: string, result: 'PAID' | 'FAILED' = 'PAID') =>
  client.ok<{ payment: { status: string; next: string } }>('POST', `/payments/${invoice}/simulate`, { result });

let step = 0;
const check = (label: string) => console.log(`✓ ${String(++step).padStart(2, '0')} ${label}`);

function imageForm(field = 'images') {
  const form = new FormData();
  form.append(field, new Blob([PNG], { type: 'image/png' }), 'foto.png');
  return form;
}

async function main() {
  const guest = new Client('guest');
  const health = await guest.ok<{ paymentMode: string }>('GET', '/health');
  assert.equal(health.paymentMode, 'simulation', 'run with PAYMENT_MODE=simulation');
  check('health + simulation mode');

  // ── Public marketplace ──
  const { games } = await guest.ok<{ games: { slug: string }[] }>('GET', '/games');
  const { fields } = await guest.ok<{ fields: { key: string; filterable: boolean }[] }>('GET', '/games/valorant/fields');
  const { listings } = await guest.ok<{ listings: { id: string; storeSlug: string; status: string }[] }>('GET', '/listings?game=valorant');
  const filtered = await guest.ok<{ listings: { attributes: { skins: number } }[] }>('GET', '/listings?game=valorant&min.skins=100');
  assert.ok(filtered.listings.every((l) => l.attributes.skins >= 100), 'min.skins filter');
  const mlbb = await guest.ok<{ listings: unknown[] }>('GET', '/listings?game=mobile-legends');
  await guest.ok('GET', '/stores/nusagame');
  await guest.ok('GET', '/help/cara-membeli-akun');
  assert.ok(games.length >= 4 && fields.some((f) => f.filterable) && listings.length >= 10 && mlbb.listings.length >= 2);
  assert.ok(listings.every((l) => l.status !== 'PENDING_REVIEW'), 'pending catalogs are not public');
  check(`public: ${games.length} games, ${fields.length} Valorant fields, ${listings.length} Valorant + ${mlbb.listings.length} MLBB listings, attribute filter`);

  // ── Register with referral → open a store → deposit ──
  const owner = new Client('owner');
  const email = `smoke-${Date.now()}@example.test`;
  await owner.fails('POST', '/auth/register', { name: 'Budi', email, password: 'rahasia-123', ref: 'NOPE0000', acceptTerms: true }, 400);
  await owner.ok('POST', '/auth/register', { name: 'Budi Santoso', email, password: 'rahasia-123', ref: 'NIGHTFALL10', acceptTerms: true });
  const me = await owner.ok<{ user: { email: string; referralCode: string } }>('GET', '/auth/me');
  assert.equal(me.user.email, email);
  const { store: opened } = await owner.ok<{ store: { status: string; id: string } }>('POST', '/stores', {
    name: 'Smoke Store',
    type: 'OWNER',
    ownerLegalName: 'Budi Santoso',
    acceptRules: true,
  });
  assert.equal(opened.status, 'PENDING_DEPOSIT');
  const deposit = await owner.ok<{ invoice: string }>('POST', '/stores/me/deposit', { method: 'QRIS' });
  await pay(owner, deposit.invoice);
  const afterDeposit = await owner.ok<{ store: { status: string; depositStatus: string } }>('GET', '/stores/me');
  assert.equal(afterDeposit.store.status, 'PENDING_REVIEW');
  check('register with referral, open store, deposit paid → PENDING_REVIEW');

  // Draft catalog can be written before approval but not submitted.
  const draft = await owner.ok<{ listing: { id: string; status: string } }>('POST', '/stores/me/catalogs', {
    gameSlug: 'valorant',
    title: 'Akun Valorant Diamond 2 smoke test',
    description: 'Akun smoke test, email bisa diganti.',
    price: 750_000,
    attributes: { rank: 'Diamond 2', level: 120, server: 'Indonesia', skins: 35, skinsList: 'Reaver Vandal, Prime Phantom', unknownKey: 'x' },
  });
  const catalogId = draft.listing.id;
  assert.equal(draft.listing.status, 'DRAFT');
  await owner.fails('POST', `/stores/me/catalogs/${catalogId}/submit`, undefined, 409);
  await owner.fails('POST', '/stores/me/catalogs', { gameSlug: 'valorant', title: 'Chat WA 081234567890 ya', price: 50_000 }, 400);

  // ── Admin verifies the store ──
  const moderator = new Client('moderator');
  await moderator.login('moderator@valostock.test');
  const queue = await moderator.ok<{ stores: { id: string }[] }>('GET', '/admin/stores');
  assert.ok(queue.stores.some((s) => s.id === opened.id));
  await moderator.ok('POST', `/admin/stores/${opened.id}/approve`, { note: 'Nama KTP sesuai.' });
  check('draft saved, submit blocked before store approval, contact info rejected, admin approved store');

  // ── Catalog moderation: submit → reject → fix → resubmit → approve ──
  await owner.fails('POST', `/stores/me/catalogs/${catalogId}/submit`, undefined, 400); // no photo yet
  await owner.ok('POST', `/stores/me/catalogs/${catalogId}/images`, imageForm());
  const submitted = await owner.ok<{ listing: { status: string; code: string; attributes: Json } }>('POST', `/stores/me/catalogs/${catalogId}/submit`);
  assert.equal(submitted.listing.status, 'PENDING_REVIEW');
  assert.match(submitted.listing.code, /^VS[A-Z0-9]{5}$/);
  assert.ok(!('unknownKey' in submitted.listing.attributes), 'unknown attribute dropped');
  const vs = submitted.listing.code;
  await guest.fails('GET', `/listings/${catalogId}`, undefined, 404);

  const finance = new Client('finance');
  await finance.login('finance@valostock.test');
  await finance.fails('POST', `/admin/catalogs/${catalogId}/approve`, {}, 403);

  const pendingQueue = await moderator.ok<{ catalogs: { id: string }[]; reasons: string[] }>('GET', '/admin/catalogs?status=PENDING_REVIEW');
  assert.ok(pendingQueue.catalogs.some((c) => c.id === catalogId));
  await moderator.fails('POST', `/admin/catalogs/${catalogId}/reject`, { reasons: ['Lainnya'] }, 400);
  await moderator.ok('POST', `/admin/catalogs/${catalogId}/reject`, { reasons: [pendingQueue.reasons[1]], note: 'Rank di foto berbeda.' });
  const rejected = await owner.ok<{ listing: { status: string; reviewNote: string }; reviews: { decision: string }[] }>('GET', `/stores/me/catalogs/${catalogId}`);
  assert.equal(rejected.listing.status, 'REJECTED');
  assert.ok(rejected.listing.reviewNote.includes('Rank di foto berbeda'));

  await owner.ok('PATCH', `/stores/me/catalogs/${catalogId}`, { attributes: { rank: 'Diamond 3', level: 120, server: 'Indonesia', skins: 35 } });
  const resubmitted = await owner.ok<{ listing: { status: string; code: string } }>('POST', `/stores/me/catalogs/${catalogId}/submit`);
  assert.equal(resubmitted.listing.code, vs, 'VS code is kept on resubmit');
  await moderator.ok('POST', `/admin/catalogs/${catalogId}/approve`, { note: 'Foto dan atribut sesuai.' });
  const detail = await moderator.ok<{ reviews: { decision: string }[]; submitCount: number }>('GET', `/admin/catalogs/${catalogId}`);
  assert.deepEqual(
    detail.reviews.map((r) => r.decision),
    ['APPROVED', 'SUBMITTED', 'REJECTED', 'SUBMITTED'],
  );
  const pub = await guest.ok<{ listing: { status: string; image: string } }>('GET', `/listings/${catalogId}`);
  assert.equal(pub.listing.status, 'LISTED');
  assert.ok(pub.listing.image.includes('/storage/v1/object/public/catalog-images/'));
  const search = await guest.ok<{ listings: { id: string }[] }>('GET', `/listings?game=valorant&attr.rank=${encodeURIComponent('Diamond 3')}`);
  assert.ok(search.listings.some((l) => l.id === catalogId));
  check(`catalog ${vs}: submit → reject (reason) → fix → resubmit → approve → public + searchable`);

  // ── Offer → counter → accept → order → pay → rekber → safe → complete ──
  const buyer = new Client('buyer');
  await buyer.login('raven@email.com');
  await buyer.ok('POST', '/me/wishlist', { catalogId });
  await buyer.ok('POST', '/stores/smoke-store/follow');
  const { offer } = await buyer.ok<{ offer: { id: string } }>('POST', '/offers', { catalogId, amount: 600_000 });
  await owner.ok('POST', `/offers/${offer.id}/counter`, { amount: 700_000 });
  const accepted = await buyer.ok<{ offer: { status: string; finalAmount: number } }>('POST', `/offers/${offer.id}/accept-counter`);
  assert.equal(accepted.offer.finalAmount, 700_000);
  const { order } = await buyer.ok<{ order: { id: string; itemPrice: number; totalPaid: number; handlingFee: number; commission: number; storeReceives: number } }>(
    'POST',
    '/orders',
    { catalogId, offerId: offer.id },
  );
  assert.equal(order.itemPrice, 700_000);
  assert.equal(order.handlingFee, 24_500);
  assert.equal(order.totalPaid, 700_000 + 24_500 + 5_000);
  assert.equal(order.commission, 35_000);
  const locked = await guest.ok<{ listing: { status: string } }>('GET', `/listings/${catalogId}`);
  assert.equal(locked.listing.status, 'LOCKED');
  const orderPay = await buyer.ok<{ invoice: string }>('POST', `/orders/${order.id}/pay`, { method: 'VA' });
  await pay(buyer, orderPay.invoice);
  await owner.ok('POST', `/orders/${order.id}/messages`, { body: 'Email: akun@contoh.test / password dikirim di sini.' });
  await buyer.ok('POST', `/orders/${order.id}/safe`);
  await buyer.ok('POST', `/orders/${order.id}/complete`);
  const done = await buyer.ok<{ order: { status: string; canRate: boolean; protectionUntil: string } }>('GET', `/orders/${order.id}`);
  assert.equal(done.order.status, 'COMPLETED');
  assert.ok(done.order.canRate && done.order.protectionUntil);
  const balance = await owner.ok<{ escrow: number; available: number; ledger: { type: string }[] }>('GET', '/stores/me/balance');
  assert.equal(balance.escrow, 0);
  assert.equal(balance.available, 700_000 - 35_000);
  const points = await buyer.ok<{ points: number }>('GET', '/me/points');
  assert.ok(points.points >= 700);
  check('offer → counter → accept → order (price from offer) → pay → rekber → safe → complete → escrow released, points earned');

  await buyer.ok('POST', `/orders/${order.id}/rating`, { overall: 1, descAccuracy: 5, attitude: 5, deliverySpeed: 4, comment: 'Mantap' });
  const ratings = await owner.ok<{ ratings: { id: string }[] }>('GET', '/stores/me/ratings');
  await owner.ok('POST', `/stores/me/ratings/${ratings.ratings[0]!.id}/reply`, { reply: 'Terima kasih!' });
  check('rating + store reply');

  // ── Withdrawal (Account Validation) approved by finance ──
  await owner.fails('POST', '/stores/me/withdrawals', { amount: 100_000, bankName: 'BCA', accountNumber: '1234567890', accountName: 'Orang Lain' }, 400);
  const { withdrawal } = await owner.ok<{ withdrawal: { uuid: string; nameMatch: string } }>('POST', '/stores/me/withdrawals', {
    amount: 100_000,
    bankName: 'BCA',
    accountNumber: '1234567890',
    accountName: 'Budi Santoso',
  });
  assert.equal(withdrawal.nameMatch, 'MATCH');
  await finance.ok('POST', `/admin/withdrawals/${withdrawal.uuid}`, { decision: 'approve' });
  check('withdrawal: name mismatch refused, MATCH approved by finance');

  // ── Referral reward on the referred user's first top-up ──
  const referrer = new Client('referrer');
  await referrer.login('nightfall@email.com');
  const before = await referrer.ok<{ user: { balance: number } }>('GET', '/auth/me');
  const topup = await owner.ok<{ payment: Session }>('POST', '/topup/checkout', {
    productId: 'vp-475',
    userGameId: 'Smoke#TEST',
    paymentMethod: 'QRIS',
    contactEmail: email,
  });
  await pay(owner, invoiceOf(topup.payment));
  const after = await referrer.ok<{ user: { balance: number } }>('GET', '/auth/me');
  assert.equal(after.user.balance, before.user.balance + 10_000);
  const invoice = await guest.ok<{ transactions: { status: string }[] }>('GET', `/topup/invoice?q=${invoiceOf(topup.payment)}`);
  assert.equal(invoice.transactions[0]!.status, 'SUCCESS');
  check('game top-up (Midtrans sim) → SUCCESS, referrer credited Rp10.000');

  // Balance top-up + pay with Balance + redeem points
  const fill = await buyer.ok<{ payment: Session }>('POST', '/balance/topup', { nominal: 100_000, qty: 1, method: 'QRIS', idempotencyKey: `smoke-${Date.now()}` });
  await pay(buyer, invoiceOf(fill.payment));
  const blc = await buyer.ok<{ balance: number }>('POST', '/topup/checkout', { productId: 'vp-475', userGameId: 'Raven#123', paymentMethod: 'BALANCE' });
  assert.ok(blc.balance < 100_000);
  const redeem = await buyer.ok<{ credited: number }>('POST', '/me/points/redeem', { points: 500 });
  assert.equal(redeem.credited, 5_000);
  check('Balance fill → pay top-up with Balance → redeem 500 points = Rp5.000');

  // ── Dispute on a seeded catalog: buyer wins before completion → refund ──
  const { listings: nusa } = await guest.ok<{ listings: { id: string; price: number }[] }>('GET', '/listings?store=nusagame');
  const target = nusa[0]!;
  const { order: order2 } = await buyer.ok<{ order: { id: string } }>('POST', '/orders', { catalogId: target.id });
  const pay2 = await buyer.ok<{ invoice: string }>('POST', `/orders/${order2.id}/pay`, { method: 'QRIS' });
  await pay(buyer, pay2.invoice);
  const form = new FormData();
  form.append('reason', 'NOT_DELIVERED');
  form.append('description', 'Toko tidak mengirim data akun setelah dibayar.');
  form.append('files', new Blob([PNG], { type: 'image/png' }), 'bukti.png');
  const { disputeId } = await buyer.ok<{ disputeId: string }>('POST', `/orders/${order2.id}/dispute`, form);
  const nusaOwner = new Client('nusagame');
  await nusaOwner.login('nusagame@email.com');
  await nusaOwner.ok('POST', `/disputes/${disputeId}/events`, { body: 'Maaf, kami terlambat.' });
  const support = new Client('support');
  await support.login('support@valostock.test');
  const dd = await support.ok<{ dispute: { status: string }; events: { attachments: { url: string | null }[] }[] }>('GET', `/disputes/${disputeId}`);
  assert.equal(dd.dispute.status, 'STORE_RESPONDED');
  assert.ok(dd.events[0]!.attachments[0]!.url, 'evidence has a signed URL');
  await support.ok('POST', `/admin/disputes/${disputeId}/resolve`, { winner: 'BUYER', note: 'Toko tidak mengirim akun.', sanction: { type: 'WARNING' } });
  const refunded = await buyer.ok<{ order: { status: string } }>('GET', `/orders/${order2.id}`);
  assert.equal(refunded.order.status, 'REFUNDED');
  const relisted = await guest.ok<{ listing: { status: string } }>('GET', `/listings/${target.id}`);
  assert.equal(relisted.listing.status, 'LISTED');
  check('dispute with private evidence → store responds → support rules for buyer → REFUNDED, catalog back on sale');

  // ── Store business: subscription, free ad, voucher, chat, notifications ──
  const sub = await owner.ok<{ invoice: string }>('POST', '/stores/me/subscription', { tier: 'PRO', method: 'QRIS' });
  await pay(owner, sub.invoice);
  const subState = await owner.ok<{ current: { tier: string } }>('GET', '/stores/me/subscription');
  assert.equal(subState.current.tier, 'PRO');
  await owner.ok('POST', '/stores/me/vouchers', { code: 'SMOKE10', kind: 'PERCENT', value: 10, minSpend: 0 });
  const chat = await buyer.ok<{ conversationId: string }>('POST', '/chat/conversations', { storeSlug: 'nusagame', body: 'Halo, akun ini masih ada?' });
  await buyer.fails('POST', `/chat/conversations/${chat.conversationId}/messages`, { body: 'WA aku ya 081234567890' }, 400);
  const notes = await owner.ok<{ notifications: { title: string }[] }>('GET', '/me/notifications');
  assert.ok(notes.notifications.some((n) => n.title === 'Katalog disetujui'));
  check('subscription PRO paid, voucher created, chat (contact blocked), notifications');

  // ── Admin views ──
  const adminUser = new Client('admin');
  await adminUser.login('admin@valostock.test');
  await adminUser.ok('GET', '/admin/dashboard');
  await adminUser.ok('GET', '/admin/finance');
  const auditLog = await adminUser.ok<{ entries: { action: string }[] }>('GET', '/admin/audit');
  for (const action of ['store.approve', 'catalog.reject', 'catalog.approve', 'withdrawal.approve', 'dispute.resolve']) {
    assert.ok(auditLog.entries.some((e) => e.action === action), `audit has ${action}`);
  }
  await buyer.fails('GET', '/admin/dashboard', undefined, 403);
  check('admin dashboard/finance, audit trail complete, non-admin blocked');

  await owner.ok('POST', '/auth/logout');
  assert.equal((await owner.ok<{ user: unknown }>('GET', '/auth/me')).user, null);
  check('logout');
  console.log(`\nSemua ${step} langkah lulus.`);
}

main().catch((error: unknown) => {
  console.error('✗', error instanceof Error ? error.message : error);
  process.exit(1);
});
