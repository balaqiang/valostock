// Second end-to-end pass over the store-business, reseller and admin features
// the smoke test does not walk through. Run after `npm run test:smoke` or on a
// fresh reset (PAYMENT_MODE=simulation, API running).
//   npx tsx scripts/feature-test.ts
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
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
}

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
    name: 'Genshin Impact',
    publisher: 'HoYoverse',
    tagline: 'Akun Genshin',
    description: 'Jual beli akun Genshin Impact.',
    uidLabel: 'UID',
    uidHint: '9 digit',
  });
  await admin.ok('POST', `/admin/games/${gameId}/fields`, { key: 'ar', label: 'Adventure Rank', type: 'NUMBER', required: true, filterable: true });
  await admin.fails('POST', `/admin/games/${gameId}/fields`, { key: 'server', label: 'Server', type: 'SELECT' }, 400);
  const gf = await guest.ok<{ fields: { key: string }[] }>('GET', `/games/${slug}/fields`);
  assert.deepEqual(gf.fields.map((f) => f.key), ['ar']);
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
  check('master data: game + field template (SELECT needs options), deactivate, promo code, news');

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

  console.log(`\nSemua ${step} langkah lulus.`);
}

main().catch((error: unknown) => {
  console.error('✗', error instanceof Error ? error.message : error);
  process.exit(1);
});
