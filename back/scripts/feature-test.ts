// Second end-to-end pass over the store-business, reseller and admin features
// the smoke test does not walk through. Run after `npm run test:smoke` or on a
// fresh reset (PAYMENT_MODE=simulation, API running).
//   npx tsx scripts/feature-test.ts
import { resolveApi } from './api-url.ts';
import assert from 'node:assert/strict';

const API = await resolveApi();
type Json = Record<string, unknown>;

class Client {
  private cookie = '';
  constructor(readonly name: string) {}
  async call<T = Json>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie();
    if (set.length) this.cookie = set.map((c) => c.split(';')[0]).join('; ');
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
  }
  login = (email: string) => this.ok('POST', '/auth/login', { identity: email, password: 'valostock-demo' });
  /** Multipart upload; returns status + body. */
  async upload<T = Json>(path: string, form: FormData): Promise<{ status: number; data: T }> {
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: this.cookie ? { Cookie: this.cookie } : {}, body: form });
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }
}

// 1×1 PNG for upload checks.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const imageForm = (bytes: Buffer, name: string) => {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), name);
  return form;
};

const pay = (c: Client, invoice: string) => c.ok('POST', `/payments/${invoice}/simulate`, { result: 'PAID' });
const invoiceOf = (s: { redirectUrl?: string }) => new URL(s.redirectUrl!).searchParams.get('invoice')!;
let step = 0;
const check = (label: string) => console.log(`✓ ${String(++step).padStart(2, '0')} ${label}`);
const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

async function main() {
  const guest = new Client('guest');
  const store = new Client('nusagame');
  await store.login('nusagame@email.com');
  const buyer = new Client('raven');
  await buyer.login('raven@email.com');
  const other = new Client('nightfall');
  await other.login('nightfall@email.com');
  const admin = new Client('admin');
  await admin.login('admin@valostock.test');

  const { catalogs: all } = await store.ok<{ catalogs: { id: string; status: string; basePrice: number; title: string; flashSale: unknown }[] }>('GET', '/stores/me/catalogs?status=LISTED');
  // Catalogs without a running (seeded) flash sale first.
  const catalogs = [...all.filter((c) => !c.flashSale), ...all.filter((c) => c.flashSale)];
  assert.ok(catalogs.length >= 3, 'nusagame needs ≥ 3 listed catalogs');
  const [flashCat, bundleA, bundleB] = catalogs as [typeof catalogs[0], typeof catalogs[0], typeof catalogs[0]];
  const lockCat = flashCat; // back on sale after the voucher order is cancelled
  const gudang = new Client('gudangakun');
  await gudang.login('gudangakun@valostock.test');

  // Flash sale changes the public price.
  const salePrice = Math.round(flashCat.basePrice * 0.8);
  await store.ok('POST', '/stores/me/flash-sales', { catalogId: flashCat.id, salePrice, startsAt: hours(-0.1), endsAt: hours(3) });
  const flash = await guest.ok<{ listing: { price: number; oldPrice: number; flashSale: unknown } }>('GET', `/listings/${flashCat.id}`);
  assert.equal(flash.listing.price, salePrice);
  assert.ok(flash.listing.flashSale);
  check('flash sale → public price drops');

  // Voucher + flash-sale price in one order.
  await store.ok('POST', '/stores/me/vouchers', { code: 'FEAT5K', kind: 'FIXED', value: 5_000, minSpend: 0 });
  const { order: vOrder } = await buyer.ok<{ order: { id: string; itemsSubtotal: number; voucherDiscount: number; itemPrice: number } }>('POST', '/orders', {
    catalogId: flashCat.id,
    voucherCode: 'feat5k',
  });
  assert.equal(vOrder.itemsSubtotal, salePrice);
  assert.equal(vOrder.voucherDiscount, 5_000);
  assert.equal(vOrder.itemPrice, salePrice - 5_000);
  await buyer.ok('POST', `/orders/${vOrder.id}/cancel`);
  const back = await guest.ok<{ listing: { status: string } }>('GET', `/listings/${flashCat.id}`);
  assert.equal(back.listing.status, 'LISTED');
  check('order with flash price + store voucher → cancel → catalog back to LISTED');

  // Bundle order.
  const bundlePrice = bundleA.basePrice + bundleB.basePrice - 50_000;
  await store.ok('POST', '/stores/me/bundles', { title: 'Paket hemat 2 akun', bundlePrice, catalogIds: [bundleA.id, bundleB.id] });
  const { bundles } = await store.ok<{ bundles: { id: string; status: string }[] }>('GET', '/stores/me/bundles');
  const bundle = bundles.find((b) => b.status === 'ACTIVE')!;
  const { order: bOrder } = await buyer.ok<{ order: { id: string; itemPrice: number; items: { price: number }[]; isBundle: boolean } }>('POST', '/orders', {
    bundleId: bundle.id,
  });
  assert.ok(bOrder.isBundle && bOrder.items.length === 2);
  assert.equal(bOrder.itemPrice, bundlePrice);
  assert.equal(bOrder.items.reduce((s, i) => s + i.price, 0), bundlePrice);
  const bPay = await buyer.ok<{ invoice: string }>('POST', `/orders/${bOrder.id}/pay`, { method: 'QRIS' });
  await pay(buyer, bPay.invoice);
  await store.ok('POST', `/orders/${bOrder.id}/messages`, { body: 'Data dua akun dikirim.' });
  await buyer.ok('POST', `/orders/${bOrder.id}/safe`);
  await buyer.ok('POST', `/orders/${bOrder.id}/complete`);
  const sold = await store.ok<{ bundles: { id: string; status: string }[] }>('GET', '/stores/me/bundles');
  assert.equal(sold.bundles.find((b) => b.id === bundle.id)!.status, 'SOLD');
  check('bundle order (price split over items) → paid → completed → bundle SOLD');

  // Reseller: external seller + transfer request for the completed order, approved by finance.
  const { seller } = await store.ok<{ seller: { id: string } }>('POST', '/stores/me/external-sellers', {
    alias: 'Andi Pratama',
    payoutBank: 'BRI',
    payoutAccount: '9876543210',
    payoutName: 'Andi Pratama',
  });
  const { eligibleOrders } = await store.ok<{ eligibleOrders: { id: string; storeReceives: number }[] }>('GET', '/stores/me/transfers');
  const eligible = eligibleOrders.find((o) => o.id === bOrder.id)!;
  const { transfer } = await store.ok<{ transfer: { uuid: string; nameMatch: string } }>('POST', '/stores/me/transfers', {
    externalSellerId: seller.id,
    orderId: eligible.id,
    amount: eligible.storeReceives,
  });
  await store.fails('POST', '/stores/me/transfers', { externalSellerId: seller.id, orderId: eligible.id, amount: 10_000 }, 409);
  const finance = new Client('finance');
  await finance.login('finance@valostock.test');
  await finance.ok('POST', `/admin/transfers/${transfer.uuid}`, { decision: 'reject', note: 'Rekening salah.' });
  const bal = await store.ok<{ ledger: { type: string }[] }>('GET', '/stores/me/balance');
  assert.equal(bal.ledger[0]!.type, 'PAYOUT_REVERSAL');
  check(`reseller transfer (${transfer.nameMatch}) → rejected by finance → PAYOUT_REVERSAL`);

  // Lock: nightfall locks, raven cannot buy, nightfall can.
  const lock = await other.ok<{ payment: { redirectUrl: string } }>('POST', `/catalogs/${lockCat.id}/lock`, { method: 'QRIS' });
  await pay(other, invoiceOf(lock.payment));
  const ctx = await other.ok<{ lock: { mine: boolean } }>('GET', `/catalogs/${lockCat.id}/buy-context`);
  assert.ok(ctx.lock?.mine);
  await buyer.fails('POST', '/orders', { catalogId: lockCat.id }, 409);
  const { order: lOrder } = await other.ok<{ order: { id: string } }>('POST', '/orders', { catalogId: lockCat.id });
  await other.ok('POST', `/orders/${lOrder.id}/cancel`);
  check('paid lock (Rp5.000) reserves the account for its buyer only');

  // Ads: free first week, then no free slot for a FREE-tier store → paid.
  const newStoreAds = await gudang.ok<{ freeFirstWeekAvailable: boolean; freeSlotsLeft: number }>('GET', '/stores/me/ads');
  const { catalogs: listed } = await gudang.ok<{ catalogs: { id: string }[] }>('GET', '/stores/me/catalogs?status=LISTED');
  const adCat = listed[0]!.id;
  if (newStoreAds.freeFirstWeekAvailable || newStoreAds.freeSlotsLeft > 0) {
    await gudang.ok('POST', '/stores/me/ads', { catalogId: listed[1]!.id, durationDays: 7, useFree: true });
  }
  const paidAd = await gudang.ok<{ invoice: string }>('POST', '/stores/me/ads', { catalogId: adCat, durationDays: 3, method: 'QRIS' });
  await pay(gudang, paidAd.invoice);
  const home = await guest.ok<{ featured: { id: string }[] }>('GET', '/home');
  assert.ok(home.featured.length > 0);
  const { ads } = await admin.ok<{ ads: { id: string; status: string }[] }>('GET', '/admin/ads');
  await admin.ok('POST', `/admin/ads/${ads.find((a) => a.status === 'ACTIVE')!.id}/stop`, { note: 'Uji penghentian iklan.' });
  check('featured ads: free + paid (Rp9.000 / 3 hari) → featured on home → admin stops one');

  // Report → admin resolves with takedown; store suspend / reactivate.
  const target = listed[listed.length - 1]!.id;
  await buyer.ok('POST', '/reports', { targetType: 'CATALOG', targetId: target, reason: 'FAKE', detail: 'Foto tidak sesuai.' });
  const { reports } = await admin.ok<{ reports: { id: string; targetId: string }[] }>('GET', '/admin/reports');
  const report = reports.find((r) => r.targetId === target)!;
  await admin.ok('POST', `/admin/reports/${report.id}`, { decision: 'RESOLVED', note: 'Foto palsu, katalog diturunkan.', action: 'TAKEDOWN_CATALOG' });
  await guest.fails('GET', `/listings/${target}`, undefined, 404);
  const { stores } = await admin.ok<{ stores: { id: string; slug: string }[] }>('GET', '/admin/stores?status=ACTIVE');
  const sky = stores.find((s) => s.slug !== 'nusagame')!;
  await admin.ok('POST', `/admin/stores/${sky.id}/suspend`, { note: 'Uji penangguhan.' });
  await guest.fails('GET', `/stores/${sky.slug}`, undefined, 404);
  await admin.ok('POST', `/admin/stores/${sky.id}/reactivate`, {});
  await guest.ok('GET', `/stores/${sky.slug}`);
  check('report → takedown; store suspended (hidden) → reactivated');

  // Master data: new game + template → the store form and filters follow it.
  const slug = `game-${Date.now().toString(36)}`;
  const { id: gameId } = await admin.ok<{ id: number }>('POST', '/admin/games', {
    slug,
    name: `Game Uji ${slug}`,
    publisher: 'Studio Uji',
    tagline: 'Game untuk pengujian',
    description: 'Dibuat oleh test:features.',
    uidLabel: 'UID',
    uidHint: '9 digit',
  });
  await admin.ok('POST', `/admin/games/${gameId}/fields`, { key: 'ar', label: 'Adventure Rank', type: 'NUMBER', required: true, filterable: true });
  await admin.fails('POST', `/admin/games/${gameId}/fields`, { key: 'server', label: 'Server', type: 'SELECT' }, 400);
  const gf = await guest.ok<{ fields: { key: string }[] }>('GET', `/games/${slug}/fields`);
  assert.deepEqual(gf.fields.map((f) => f.key), ['ar']);
  // Top-up product from a Digiflazz price: no retail → cost + 3%; below cost refused; cost never public.
  await admin.ok('PATCH', `/admin/games/${gameId}`, { supportsTopup: true, uidExtraLabel: 'Server', uidExtraOptions: ['Asia', 'Europe'] });
  const pid = `uji-${Date.now().toString(36)}`;
  await admin.ok('POST', '/admin/topup-products', { id: pid, gameId, name: 'Kristal', amountLabel: '100 Kristal', supplierPrice: 10_000 });
  const { products: adminProducts } = await admin.ok<{ products: { id: string; retailPrice: number; margin: number }[] }>('GET', '/admin/topup-products');
  const made = adminProducts.find((p) => p.id === pid)!;
  assert.equal(made.retailPrice, 10_300);
  assert.equal(made.margin, 300);
  await admin.fails('PATCH', `/admin/topup-products/${pid}`, { retailPrice: 9_000 }, 400);
  const { products: publicProducts } = await guest.ok<{ products: Record<string, unknown>[] }>('GET', `/games/${slug}/topup-products`);
  assert.equal(publicProducts[0]!.retailPrice, 10_300);
  assert.equal(publicProducts[0]!.supplierPrice, undefined);
  await guest.fails('POST', '/topup/checkout', { productId: pid, userGameId: '800000001', gameZoneId: 'Mars', paymentMethod: 'QRIS' }, 400);
  await admin.ok('PATCH', `/admin/games/${gameId}`, { isActive: false });
  await guest.fails('GET', `/games/${slug}`, undefined, 404);
  await admin.ok('POST', '/admin/promo-codes', { code: `FT${Date.now().toString(36).toUpperCase().slice(-6)}`, kind: 'PERCENT', value: 5, label: 'Uji promo' });
  await admin.ok('POST', '/admin/news', {
    slug: `berita-${Date.now().toString(36)}`,
    title: 'Berita uji coba',
    category: 'Pengumuman',
    excerpt: 'Ringkasan berita uji.',
    body: [{ type: 'paragraph', text: 'Isi berita.' }],
    status: 'PUBLISHED',
  });
  check('master data: game + field template, top-up product (cost + 3%, never below cost, server list), deactivate, promo, news');

  // Users & RBAC.
  const { users } = await admin.ok<{ users: { id: string; email: string }[] }>('GET', '/admin/users?q=raven');
  const raven = users[0]!;
  await admin.ok('POST', `/admin/users/${raven.id}/ban`, { reason: 'Uji blokir.' });
  const banned = new Client('banned');
  await banned.fails('POST', '/auth/login', { identity: 'raven@email.com', password: 'valostock-demo' }, 401);
  await admin.ok('POST', `/admin/users/${raven.id}/unban`);
  await banned.login('raven@email.com');
  const support = new Client('support');
  await support.login('support@valostock.test');
  await support.fails('GET', '/admin/admins', undefined, 403);
  const { admins } = await admin.ok<{ admins: { id: string; email: string }[] }>('GET', '/admin/admins');
  const supportId = admins.find((a) => a.email === 'support@valostock.test')!.id;
  await admin.ok('PUT', `/admin/admins/${supportId}/roles`, { roles: ['SUPPORT', 'CONTENT_EDITOR'] });
  await support.ok('GET', '/admin/news');
  await admin.ok('PUT', `/admin/admins/${supportId}/roles`, { roles: ['SUPPORT'] });
  check('ban blocks login → unban; RBAC role change takes effect immediately');

  // ── Deposit ledger: fine from the deposit, badge off, store tops it up (MONEY_RULES §12) ──
  const verdant = new Client('verdantshop');
  await verdant.login('verdantshop@valostock.test');
  const { stores: allStores } = await admin.ok<{ stores: { id: string; slug: string }[] }>('GET', '/admin/stores?status=ALL');
  const verdantId = allStores.find((x) => x.slug === 'verdantshop')!.id;
  const fine = await admin.ok<{ taken: number }>('POST', `/admin/stores/${verdantId}/sanctions`, { type: 'FINE', amount: 100_000, reason: 'Uji denda deposit.' });
  assert.equal(fine.taken, 100_000);
  let vb = await verdant.ok<{ deposit: number; ledger: { bucket: string; type: string }[] }>('GET', '/stores/me/balance');
  assert.equal(vb.deposit, 400_000);
  assert.equal(vb.ledger[0]!.type, 'DEPOSIT_DEDUCTION');
  const pubStore = await guest.ok<{ store: { depositSecured: boolean } }>('GET', '/stores/verdantshop');
  assert.equal(pubStore.store.depositSecured, false);
  const topup = await verdant.ok<{ invoice: string }>('POST', '/stores/me/deposit-topup', { method: 'QRIS' });
  await pay(verdant, topup.invoice);
  vb = await verdant.ok('GET', '/stores/me/balance');
  assert.equal(vb.deposit, 500_000);
  assert.equal((await guest.ok<{ store: { depositSecured: boolean } }>('GET', '/stores/verdantshop')).store.depositSecured, true);
  check('fine taken from the deposit (ledger), Deposit Secured off → deposit top-up → badge back');

  // ── Store closure: blocked while money/orders are pending; approved → deposit refunded ──
  await store.fails('POST', '/stores/me/close', { reason: 'Uji tutup toko.' }, 409);
  const moderator = new Client('moderator');
  await moderator.login('moderator@valostock.test');
  const { stores: pending } = await moderator.ok<{ stores: { id: string; slug: string }[] }>('GET', '/admin/stores?status=PENDING_REVIEW');
  const tokobaru = pending.find((x) => x.slug === 'tokobaru')!;
  await moderator.ok('POST', `/admin/stores/${tokobaru.id}/approve`, { note: 'Nama KTP sesuai.' });
  const tb = new Client('tokobaru');
  await tb.login('tokobaru@valostock.test');
  assert.equal((await tb.ok<{ deposit: number }>('GET', '/stores/me/balance')).deposit, 500_000);
  await tb.ok('POST', '/stores/me/close', { reason: 'Berhenti berjualan.' });
  assert.equal((await tb.ok<{ store: { status: string } }>('GET', '/stores/me')).store.status, 'CLOSING');
  await moderator.ok('POST', `/admin/stores/${tokobaru.id}/close-decision`, { decision: 'approve', note: 'Tidak ada kewajiban tersisa.' });
  const closed = await tb.ok<{ deposit: number; ledger: { type: string }[] }>('GET', '/stores/me/balance');
  assert.equal(closed.deposit, 0);
  assert.equal(closed.ledger[0]!.type, 'DEPOSIT_REFUND');
  assert.equal((await tb.ok<{ store: { status: string; depositStatus: string } }>('GET', '/stores/me')).store.depositStatus, 'RELEASED');
  check('closure blocked for a store with balance; new store approved (DEPOSIT_HOLD) → close → admin approves → DEPOSIT_REFUND');

  // ── Late payment after cancel → refund queue → finance completes ──
  const buyer2 = new Client('raven2');
  await buyer2.login('raven@email.com');
  const { listings: forSale } = await guest.ok<{ listings: { id: string; status: string }[] }>('GET', '/listings?game=valorant&store=skyvault');
  const lateTarget = forSale.find((l) => l.status === 'LISTED')!;
  const { order: late } = await buyer2.ok<{ order: { id: string } }>('POST', '/orders', { catalogId: lateTarget.id });
  const latePay = await buyer2.ok<{ invoice: string }>('POST', `/orders/${late.id}/pay`, { method: 'VA' });
  await buyer2.ok('POST', `/orders/${late.id}/cancel`);
  await pay(buyer2, latePay.invoice); // the VA is paid after all
  const { refunds } = await finance.ok<{ refunds: { id: string; invoice: string; source: string }[] }>('GET', '/admin/refunds');
  const lateRefund = refunds.find((r) => r.invoice === latePay.invoice)!;
  assert.equal(lateRefund.source, 'PAID_AFTER_CANCEL');
  await finance.ok('POST', `/admin/refunds/${lateRefund.id}/complete`, { note: 'Dikembalikan ke VA pembeli.' });
  check('payment arriving after the order was cancelled → refund queue → finance completes it');

  // ── Undelivered top-up: logged-in → Balance (points reversed); guest → refund queue ──
  const nf = new Client('nightfall2');
  await nf.login('nightfall@email.com');
  const before = await nf.ok<{ user: { balance: number; loyaltyPoints: number } }>('GET', '/auth/me');
  const blcTopup = await nf.ok<{ transaction: { id: string } }>('POST', '/topup/checkout', { productId: 'vp-475', userGameId: 'Night#REF', paymentMethod: 'BALANCE' });
  await finance.ok('POST', `/admin/topups/${blcTopup.transaction.id}/refund`, { note: 'Item tidak masuk ke akun.' });
  const after = await nf.ok<{ user: { balance: number; loyaltyPoints: number } }>('GET', '/auth/me');
  assert.equal(after.user.balance, before.user.balance);
  assert.equal(after.user.loyaltyPoints, before.user.loyaltyPoints);
  const guestTopup = await guest.ok<{ transaction: { id: string }; payment: { redirectUrl: string } }>('POST', '/topup/checkout', {
    productId: 'vp-475',
    userGameId: 'Guest#1',
    paymentMethod: 'QRIS',
    contactEmail: 'tamu@example.test',
  });
  await pay(guest, invoiceOf(guestTopup.payment));
  const refundedTo = await finance.ok<{ refundedTo: string }>('POST', `/admin/topups/${guestTopup.transaction.id}/refund`, { note: 'Item tidak masuk.' });
  assert.equal(refundedTo.refundedTo, 'ORIGINAL');
  const queue = await finance.ok<{ refunds: { source: string }[] }>('GET', '/admin/refunds');
  assert.ok(queue.refunds.some((r) => r.source === 'TOPUP_UNDELIVERED'));
  check('undelivered top-up: buyer gets Balance back (points reversed); guest refund queued');

  // ── Balance adjustment (finance only) ──
  const ravenBefore = await buyer2.ok<{ user: { balance: number } }>('GET', '/auth/me');
  await support.fails('POST', `/admin/users/${raven.id}/balance-adjust`, { amount: 5_000, reason: 'Uji koreksi.' }, 403);
  await finance.ok('POST', `/admin/users/${raven.id}/balance-adjust`, { amount: 5_000, reason: 'Kompensasi gangguan.' });
  const ravenAfter = await buyer2.ok<{ user: { balance: number } }>('GET', '/auth/me');
  assert.equal(ravenAfter.user.balance, ravenBefore.user.balance + 5_000);
  const ledger = await buyer2.ok<{ ledger: { type: string }[] }>('GET', '/me/balance-ledger');
  assert.equal(ledger.ledger[0]!.type, 'ADJUSTMENT');
  check('Balance adjustment with ledger row (payouts:approve only)');

  // ── Plan benefits: bulk actions (Pro+), analytics per plan ──
  await verdant.fails('POST', '/stores/me/catalogs/bulk', { action: 'withdraw', ids: [lateTarget.id] }, 403);
  const { catalogs: nusaListed } = await store.ok<{ catalogs: { id: string }[] }>('GET', '/stores/me/catalogs?status=LISTED');
  const ids = nusaListed.slice(0, 2).map((c) => c.id);
  if (ids.length > 0) {
    const hidden = await store.ok<{ done: number }>('POST', '/stores/me/catalogs/bulk', { action: 'withdraw', ids });
    assert.equal(hidden.done, ids.length);
    const resubmitted = await store.ok<{ done: number }>('POST', '/stores/me/catalogs/bulk', { action: 'submit', ids });
    assert.equal(resubmitted.done, ids.length);
  }
  const freeStats = await verdant.ok<{ tier: string; daily: unknown; funnel: unknown }>('GET', '/stores/me/analytics');
  assert.equal(freeStats.tier, 'FREE');
  assert.equal(freeStats.daily, null);
  const proStats = await store.ok<{ tier: string; daily: unknown[]; byGame: unknown }>('GET', '/stores/me/analytics');
  assert.ok(Array.isArray(proStats.daily) && proStats.byGame === null);
  check(`plan benefits: bulk hide/submit (${ids.length} catalogs, Pro), Free blocked; analytics per plan`);

  // Site CMS: texts fall back to defaults, uploads are type-checked, banners follow their schedule, content:manage only.
  type Site = { texts: Record<string, string>; banners: { id: string; imageUrl: string }[] };
  const siteBefore = await guest.ok<Site>('GET', '/site');
  await admin.ok('PATCH', '/admin/cms/texts', { values: { 'home.hero.title': 'Judul uji CMS', 'announcement.enabled': 'true' } });
  let site = await guest.ok<Site>('GET', '/site');
  assert.equal(site.texts['home.hero.title'], 'Judul uji CMS');
  assert.equal(site.texts['announcement.enabled'], 'true');
  await admin.fails('PATCH', '/admin/cms/texts', { values: { 'home.hero.title': '   ' } }, 400);
  await admin.fails('PATCH', '/admin/cms/texts', { values: { 'kunci.tidak.ada': 'x' } }, 400);
  await admin.fails('PATCH', '/admin/cms/texts', { values: { 'announcement.link': '//situs-lain.test' } }, 400);
  await admin.ok('PATCH', '/admin/cms/texts', { values: { 'home.hero.title': null, 'announcement.enabled': null } });
  site = await guest.ok<Site>('GET', '/site');
  assert.equal(site.texts['home.hero.title'], siteBefore.texts['home.hero.title']);
  assert.equal(site.texts['announcement.enabled'], 'false');

  const fake = await admin.upload('/admin/cms/uploads?kind=banners', imageForm(Buffer.from('<?php echo 1; ?>'), 'bukan-gambar.png'));
  assert.equal(fake.status, 400);
  const upload = await admin.upload<{ path: string; url: string }>('/admin/cms/uploads?kind=banners', imageForm(PNG, 'banner.png'));
  assert.equal(upload.status, 201, JSON.stringify(upload.data));
  assert.ok(upload.data.path.startsWith('cms/banners/'));
  assert.equal((await fetch(upload.data.url)).status, 200);

  const { id: bannerId } = await admin.ok<{ id: string }>('POST', '/admin/cms/banners', {
    title: 'Banner uji terjadwal',
    image: upload.data.path,
    ctaLabel: 'Lihat',
    linkUrl: '/search',
    startsAt: hours(24),
  });
  assert.ok(!(await guest.ok<Site>('GET', '/site')).banners.some((b) => b.id === bannerId));
  await admin.ok('PATCH', `/admin/cms/banners/${bannerId}`, { startsAt: null });
  const live = (await guest.ok<Site>('GET', '/site')).banners.find((b) => b.id === bannerId);
  assert.ok(live && live.imageUrl.endsWith(upload.data.path));
  await admin.fails('POST', '/admin/cms/banners', { title: 'Tombol tanpa link', image: upload.data.path, ctaLabel: 'Lihat' }, 400);

  const { games: gameList } = await guest.ok<{ games: { id: number; slug: string; image: string | null }[] }>('GET', '/games');
  const genshin = gameList.find((g) => g.slug === 'genshin-impact')!;
  await admin.ok('PUT', `/admin/cms/games/${genshin.id}/banner`, { image: upload.data.path });
  assert.ok((await guest.ok<{ game: { image: string } }>('GET', '/games/genshin-impact')).game.image.endsWith(upload.data.path));
  await admin.ok('DELETE', `/admin/cms/banners/${bannerId}`);
  assert.equal((await fetch(upload.data.url)).status, 200, 'object still used by the game banner');
  await admin.ok('PUT', `/admin/cms/games/${genshin.id}/banner`, { image: null });
  assert.notEqual((await fetch(upload.data.url)).status, 200, 'unused upload removed from storage');

  await buyer.fails('GET', '/admin/cms/texts', undefined, 403);
  await moderator.fails('PATCH', '/admin/cms/texts', { values: { 'home.hero.title': 'x' } }, 403);
  check('site CMS: texts + reset to default, fake upload refused, scheduled banner, game banner, unused image cleaned, 403');

  console.log(`\nSemua ${step} langkah lulus.`);
}

main().catch((error: unknown) => {
  console.error('✗', error instanceof Error ? error.message : error);
  process.exit(1);
});
