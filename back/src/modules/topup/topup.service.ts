import {
  BLC_DENOMINATIONS,
  BLC_MAX_QTY,
  priceBalanceFill,
  priceTopup,
  type GatewayMethod,
  type TopupMethod,
} from '../../config/money.js';
import { one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, notFound, unauthorized } from '../../lib/errors.js';
import { invoiceNumber, uuid } from '../../lib/ids.js';
import { moveUserBalance, rewardReferral } from '../../lib/ledger.js';
import type { AuthUser } from '../../middlewares/auth.js';
import * as payments from '../payments/payments.service.js';
import * as repo from './topup.repository.js';

// ── DFD 3.1–3.3: validate the order, the promo, and price it (server-side only) ──

async function productOrFail(productId: string) {
  const product = await repo.findProduct(pool, productId);
  if (!product) throw notFound('Produk top-up');
  return product;
}

async function promoOrFail(code: string | undefined) {
  if (!code) return null;
  const promo = await repo.findUsablePromo(pool, code);
  if (!promo) throw badRequest('Kode promo tidak ditemukan.', 'PROMO_INVALID');
  return promo;
}

export interface QuoteInput {
  productId: string;
  paymentMethod: TopupMethod;
  promoCode?: string;
}

/** Ringkasan Pesanan: what the checkout will charge for this product, method and promo. */
export async function quote(input: QuoteInput) {
  const product = await productOrFail(input.productId);
  const promo = await promoOrFail(input.promoCode);
  const price = priceTopup(product.retail_price, input.paymentMethod, promo);
  return {
    ...price,
    promo: promo ? { code: promo.code, label: promo.label, minSpend: promo.min_spend, applied: price.discount > 0 } : null,
  };
}

export interface CheckoutInput extends QuoteInput {
  userGameId: string;
  gameZoneId?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
}

/** DFD 3.4 / 3.5: create the invoice, then pay through Midtrans (4.0) or with Balance. */
export async function checkout(user: AuthUser | undefined, input: CheckoutInput) {
  const product = await productOrFail(input.productId);
  if (product.uid_extra_label && !input.gameZoneId) throw badRequest(`Harap isi ${product.uid_extra_label}.`);
  if (product.uid_extra_options && input.gameZoneId && !product.uid_extra_options.includes(input.gameZoneId)) {
    throw badRequest(`${product.uid_extra_label ?? 'Pilihan'} tidak dikenal. Pilih salah satu: ${product.uid_extra_options.join(', ')}.`);
  }
  const promo = await promoOrFail(input.promoCode);
  const price = priceTopup(product.retail_price, input.paymentMethod, promo);
  const id = uuid();
  const invoice = invoiceNumber('TU');
  const order = {
    id,
    invoice,
    userId: user?.id ?? null,
    productId: product.id,
    promoId: promo?.id ?? null,
    userGameId: input.userGameId,
    gameZoneId: input.gameZoneId ?? null,
    email: input.contactEmail ?? null,
    whatsapp: input.contactWhatsapp ?? null,
    ...price,
    method: input.paymentMethod,
  };

  if (input.paymentMethod === 'BALANCE') {
    if (!user) throw unauthorized('Masuk dulu untuk membayar dengan Balance (BLC).');
    // DFD 3.5: invoice + Balance debit in one transaction; delivery simulated → SUCCESS at once.
    const balance = await withTransaction(async (tx) => {
      await repo.insertTopupOrder(tx, { ...order, status: 'SUCCESS' });
      if (promo) await run(tx, 'update promo_codes set used_count = used_count + 1 where id = $1', [promo.id]);
      const next = await moveUserBalance(tx, user.id, { type: 'SPEND_TOPUP', amount: -price.amount, reference: invoice });
      await rewardReferral(tx, user.id, invoice);
      return next;
    });
    const transaction = await repo.findTopupTx(pool, 'id', id);
    return { transaction, payment: { mode: 'BALANCE' } satisfies payments.PaymentSession, balance };
  }

  const method = input.paymentMethod;
  await withTransaction(async (tx) => {
    await repo.insertTopupOrder(tx, { ...order, status: 'PENDING' });
    await payments.recordPayment(tx, { invoice, purpose: 'TOPUP', refId: id, amount: price.amount, method });
  });
  const payment = await payments.openPaymentPage(invoice, {
    name: user?.name,
    email: input.contactEmail ?? user?.email,
    phone: input.contactWhatsapp,
  });
  const transaction = await repo.findTopupTx(pool, 'id', id);
  return { transaction, payment };
}

// ── DFD 6.0: "Cek Invoice" — exact invoice number only; the game account is masked, the contact hidden ──

export async function lookupInvoice(invoiceNumberInput: string) {
  const invoice = invoiceNumberInput.trim().toUpperCase();
  const current = await one<{ status: string }>(pool, 'select status from topup_orders where invoice_number = $1', [invoice]);
  if (!current) throw notFound('Invoice');
  if (current.status === 'PENDING') await payments.syncPayment(invoice).catch(() => undefined);
  const tx = await repo.findTopupTx(pool, 'invoice_number', invoice);
  if (!tx) throw notFound('Invoice');
  const { user_game_id, game_zone_id, contact_email: _contact, ...rest } = tx;
  return {
    ...rest,
    user_game_id_masked: user_game_id ? maskGameId(user_game_id) : null,
    game_zone_id_masked: game_zone_id ? maskGameId(game_zone_id) : null,
  };
}

/** "Nightfall#GGWP" → "Ni**********WP", "800123456" → "80*****56". */
function maskGameId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return `${trimmed.charAt(0)}***`;
  return `${trimmed.slice(0, 2)}${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-2)}`;
}

// ── DFD 5.1–5.2: Balance (closed-loop BLC) vouchers ──

export interface BalanceFillInput {
  nominal: number;
  qty: number;
  method: GatewayMethod;
}

function assertVoucher(input: BalanceFillInput) {
  if (!BLC_DENOMINATIONS.includes(input.nominal)) throw badRequest('Nominal voucher tidak tersedia.');
  if (input.qty < 1 || input.qty > BLC_MAX_QTY) throw badRequest(`Jumlah voucher 1 sampai ${BLC_MAX_QTY}.`);
}

export function quoteBalance(input: BalanceFillInput) {
  assertVoucher(input);
  return priceBalanceFill(input.nominal, input.qty, input.method);
}

export async function fillBalance(user: AuthUser, input: BalanceFillInput & { idempotencyKey: string }) {
  assertVoucher(input);
  // Same key again (double click / retry) → the same invoice, never a second one.
  const existing = await one<{ id: string; invoice_number: string }>(
    pool,
    'select id, invoice_number from balance_topups where user_id = $1 and idempotency_key = $2',
    [user.id, input.idempotencyKey],
  );
  let id = existing?.id;
  let invoice = existing?.invoice_number;

  if (!id || !invoice) {
    const price = priceBalanceFill(input.nominal, input.qty, input.method);
    const newId = uuid();
    const newInvoice = invoiceNumber('BL');
    await withTransaction(async (tx) => {
      await run(
        tx,
        `insert into balance_topups (id, invoice_number, user_id, nominal, qty, credit, payment_method, surcharge, amount, idempotency_key)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newId, newInvoice, user.id, input.nominal, input.qty, price.credit, input.method, price.surcharge, price.amount, input.idempotencyKey],
      );
      await payments.recordPayment(tx, { invoice: newInvoice, purpose: 'BALANCE_FILL', refId: newId, amount: price.amount, method: input.method });
    });
    id = newId;
    invoice = newInvoice;
  }

  const payment = await payments.openPaymentPage(invoice, { name: user.name, email: user.email });
  const transaction = await repo.findBalanceTx(pool, id);
  return { transaction, payment };
}
