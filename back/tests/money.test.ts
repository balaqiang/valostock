// Unit tests for the money rules in src/config/money.ts against docs/MONEY_RULES.md.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { discountFor, priceBalanceFill, priceTopup, surchargeFor, topupRetailFor, TOPUP_METHODS } from '../src/config/money.ts';

describe('payment-method surcharge for top-up & Balance (§3)', () => {
  it('matches the charge-to-customer table', () => {
    assert.equal(surchargeFor('QRIS', 100_000), 1_500);
    assert.equal(surchargeFor('VA', 100_000), 5_000);
    assert.equal(surchargeFor('RETAIL', 20_000), 5_000);
    assert.equal(surchargeFor('EWALLET', 100_000), 2_500);
    assert.equal(surchargeFor('CC', 100_000), 7_000);
    assert.equal(surchargeFor('BALANCE', 100_000), 0);
  });
  it('is never negative for any method', () => {
    for (const m of TOPUP_METHODS) assert.ok(surchargeFor(m, 1) >= 0);
  });
});

describe('promo discount (§4)', () => {
  it('returns 0 below the minimum spend', () => {
    assert.equal(discountFor({ kind: 'PERCENT', value: 10, min_spend: 50_000 }, 49_999), 0);
  });
  it('applies percent and fixed rules', () => {
    assert.equal(discountFor({ kind: 'PERCENT', value: 10, min_spend: 0 }, 75_000), 7_500);
    assert.equal(discountFor({ kind: 'FIXED', value: 5_000, min_spend: 0 }, 75_000), 5_000);
  });
  it('never makes the amount free or negative', () => {
    assert.equal(discountFor({ kind: 'FIXED', value: 50_000, min_spend: 0 }, 20_000), 19_999);
    assert.equal(discountFor({ kind: 'PERCENT', value: 100, min_spend: 0 }, 20_000), 19_999);
  });
});

describe('top-up total = price − discount + surcharge (§4, PDHUPL)', () => {
  it('TC-22: 330 Crystals Rp79.200 via QRIS → Rp80.388', () => {
    assert.deepEqual(priceTopup(79_200, 'QRIS', null), { basePrice: 79_200, discount: 0, surcharge: 1_188, amount: 80_388 });
  });
  it('TC-23: the same product via Virtual Account → Rp84.200', () => {
    assert.equal(priceTopup(79_200, 'VA', null).amount, 84_200);
  });
  it('TC-26: VALO10 on 1.090 Crystals Rp249.100 → discount Rp24.910', () => {
    assert.equal(priceTopup(249_100, 'QRIS', { kind: 'PERCENT', value: 10, min_spend: 50_000 }).discount, 24_910);
  });
  it('TC-27: HEMAT5K below Rp100.000 gives no discount (60 Crystals Rp16.200 via QRIS → Rp16.443)', () => {
    const price = priceTopup(16_200, 'QRIS', { kind: 'FIXED', value: 5_000, min_spend: 100_000 });
    assert.equal(price.discount, 0);
    assert.equal(price.amount, 16_443);
  });
  it('charges the surcharge on the discounted price', () => {
    const price = priceTopup(100_000, 'QRIS', { kind: 'FIXED', value: 10_000, min_spend: 0 });
    assert.equal(price.surcharge, 1_350);
    assert.equal(price.amount, 91_350);
  });
  it('TC-33: paying with Balance has no surcharge', () => {
    assert.equal(priceTopup(79_200, 'BALANCE', null).amount, 79_200);
  });
});

describe('Balance voucher price (§5)', () => {
  it('credits nominal × qty and adds the method surcharge', () => {
    assert.deepEqual(priceBalanceFill(100_000, 1, 'QRIS'), { credit: 100_000, surcharge: 1_500, amount: 101_500 });
    assert.deepEqual(priceBalanceFill(50_000, 3, 'VA'), { credit: 150_000, surcharge: 5_000, amount: 155_000 });
  });
});

describe('top-up retail price — Digiflazz price + 3%, rounded up to Rp100 (§2)', () => {
  it('adds 3% and rounds up to the next Rp100', () => {
    assert.equal(topupRetailFor(51_145), 52_700);
    assert.equal(topupRetailFor(1_425), 1_500);
    assert.equal(topupRetailFor(1_003_289), 1_033_400);
  });
  it('TC-13: a Rp20.000 cost price sells for Rp20.600', () => {
    assert.equal(topupRetailFor(20_000), 20_600);
  });
  it('does not overshoot on exact multiples (no float error)', () => {
    assert.equal(topupRetailFor(10_000), 10_300);
    assert.equal(topupRetailFor(100_000), 103_000);
  });
  it('is never below the supplier price', () => {
    for (const cost of [1, 99, 750, 23_256, 1_629_000]) assert.ok(topupRetailFor(cost) >= cost);
  });
});
