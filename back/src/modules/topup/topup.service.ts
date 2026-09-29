import { BLC_DENOMINATIONS, BLC_MAX_QTY, discountFor, surchargeFor, type GatewayMethod, type TopupMethod } from '../../config/money.js';
import { one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, notFound, unauthorized } from '../../lib/errors.js';
import { documentNumber, randomCode, uuid } from '../../lib/ids.js';
import { earnPoints, moveUserBalance, rewardReferral } from '../../lib/ledger.js';
import type { AuthUser } from '../../middlewares/auth.js';
import * as payments from '../payments/payments.service.js';
import * as repo from './topup.repository.js';

export async function checkPromo(code: string) {
  const promo = await repo.findUsablePromo(pool, code);
  if (!promo) throw notFound('Kode promo');
  return { code: promo.code, kind: promo.kind, value: promo.value, minSpend: promo.min_spend, label: promo.label };
}

export interface CheckoutInput {
  productId: string;
  userGameId: string;
  gameZoneId?: string;
  promoCode?: string;
  paymentMethod: TopupMethod;
  contactEmail?: string;
  contactWhatsapp?: string;
}

/** DFD 4.1–4.3: validate, price (server-side only), create the invoice, pay. */
export async function checkout(user: AuthUser | undefined, input: CheckoutInput) {
  const product = await repo.findProduct(pool, input.productId);
  if (!product) throw notFound('Produk top-up');
  if (product.uid_extra_label && !input.gameZoneId) throw badRequest(`Harap isi ${product.uid_extra_label}.`);
  if (product.uid_extra_options && input.gameZoneId && !product.uid_extra_options.includes(input.gameZoneId)) {
    throw badRequest(`${product.uid_extra_label ?? 'Pilihan'} tidak dikenal. Pilih salah satu: ${product.uid_extra_options.join(', ')}.`);
  }

  const promo = input.promoCode ? await repo.findUsablePromo(pool, input.promoCode) : null;
  if (input.promoCode && !promo) throw badRequest('Kode promo tidak ditemukan atau sudah tidak berlaku.', 'PROMO_INVALID');

  const discount = promo ? discountFor(promo, product.retail_price) : 0;
  const base = product.retail_price - discount;
  const surcharge = surchargeFor(input.paymentMethod, base);
  const amount = base + surcharge;
  const id = uuid();
  const invoice = documentNumber('TU');
  const common = {
    id,
    invoice,
    userId: user?.id ?? null,
    productId: product.id,
    promoId: promo?.id ?? null,
    userGameId: input.userGameId,
    gameZoneId: input.gameZoneId ?? null,
    email: input.contactEmail ?? null,
    whatsapp: input.contactWhatsapp ?? null,
    basePrice: product.retail_price,
    discount,
    surcharge,
    amount,
    method: input.paymentMethod,
  };

  if (input.paymentMethod === 'BALANCE') {
    if (!user) throw unauthorized('Masuk dulu untuk membayar dengan Balance.');
    // DFD 4.3: debit Balance + invoice in one transaction; delivery simulated → SUCCESS.
    const balance = await withTransaction(async (tx) => {
      await repo.insertTopupOrder(tx, { ...common, status: 'SUCCESS', providerRef: `SIM-${randomCode(8)}` });
      if (promo) await run(tx, 'update promo_codes set used_count = used_count + 1 where id = $1', [promo.id]);
      const next = await moveUserBalance(tx, user.id, { type: 'SPEND_TOPUP', amount: -amount, reference: invoice });
      await earnPoints(tx, user.id, amount, invoice);
      await rewardReferral(tx, user.id, invoice);
      return next;
    });
    const transaction = await repo.findTopupTx(pool, 'id', id);
    return { transaction, payment: { mode: 'BALANCE' } satisfies payments.PaymentSession, balance };
  }

  const method = input.paymentMethod;
  await withTransaction(async (tx) => {
    await repo.insertTopupOrder(tx, { ...common, status: 'PENDING', providerRef: null });
    await payments.recordPayment(tx, { invoice, purpose: 'TOPUP', refId: id, userId: user?.id ?? null, amount, method });
  });
  const payment = await payments.openPaymentPage(invoice, {
    name: user?.name,
    email: input.contactEmail ?? user?.email,
    phone: input.contactWhatsapp,
  });
  const transaction = await repo.findTopupTx(pool, 'id', id);
  return { transaction, payment };
}

/** "Cek Invoice" — exact invoice number only; the game account is masked. */
export async function lookupInvoice(invoiceNumber: string) {
  const invoice = invoiceNumber.trim().toUpperCase();
  const pending = await one<{ status: string }>(pool, 'select status from topup_orders where invoice_number = $1', [invoice]);
  if (!pending) throw notFound('Invoice');
  if (pending.status === 'PENDING') await payments.syncPayment(invoice).catch(() => undefined);
  const tx = await repo.findTopupTx(pool, 'invoice_number', invoice);
  if (!tx) throw notFound('Invoice');
  const { user_game_id, game_zone_id, user_id: _owner, ...rest } = tx;
  return {
    ...rest,
    user_game_id_masked: maskGameId(user_game_id),
    game_zone_id_masked: game_zone_id ? maskGameId(game_zone_id) : null,
  };
}

/** "Nightfall#GGWP" → "Ni**********WP". */
function maskGameId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return `${trimmed.charAt(0)}***`;
  return `${trimmed.slice(0, 2)}${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-2)}`;
}

// ── Balance (closed-loop BLC) — DFD 4.4 ──

export async function fillBalance(user: AuthUser, input: { nominal: number; qty: number; method: GatewayMethod; idempotencyKey: string }) {
  if (!BLC_DENOMINATIONS.includes(input.nominal)) throw badRequest('Nominal voucher tidak tersedia.');
  if (input.qty < 1 || input.qty > BLC_MAX_QTY) throw badRequest(`Jumlah voucher 1 sampai ${BLC_MAX_QTY}.`);

  // Same key again (double click / retry) → the same invoice, never a second one.
  const existing = await one<{ id: string; invoice_number: string }>(
    pool,
    'select id, invoice_number from balance_topups where user_id = $1 and idempotency_key = $2',
    [user.id, input.idempotencyKey],
  );
  let id = existing?.id;
  let invoice = existing?.invoice_number;

  if (!id || !invoice) {
    const credit = input.nominal * input.qty;
    const surcharge = surchargeFor(input.method, credit);
    const newId = uuid();
    const newInvoice = documentNumber('BL');
    await withTransaction(async (tx) => {
      await run(
        tx,
        `insert into balance_topups (id, invoice_number, user_id, nominal, qty, credit, payment_method, surcharge, amount, idempotency_key)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newId, newInvoice, user.id, input.nominal, input.qty, credit, input.method, surcharge, credit + surcharge, input.idempotencyKey],
      );
      await payments.recordPayment(tx, {
        invoice: newInvoice,
        purpose: 'BALANCE_FILL',
        refId: newId,
        userId: user.id,
        amount: credit + surcharge,
        method: input.method,
      });
    });
    id = newId;
    invoice = newInvoice;
  }

  const payment = await payments.openPaymentPage(invoice, { name: user.name, email: user.email });
  const transaction = await repo.findBalanceTx(pool, id);
  return { transaction, payment };
}
