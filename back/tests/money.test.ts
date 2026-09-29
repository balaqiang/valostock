// Unit tests for the money rules in src/config/money.ts against docs/MONEY_RULES.md.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  commissionFor,
  discountFor,
  FEATURED_PRICES,
  handlingFeeFor,
  pointsFor,
  protectionDaysFor,
  STORE_DEPOSIT,
  SUBSCRIPTION_PLANS,
  surchargeFor,
  topupRetailFor,
  TOPUP_METHODS,
} from '../src/config/money.ts';

describe('handling fee — max(3.5%, Rp4.000), paid by the buyer (§2)', () => {
  it('uses the Rp4.000 floor for small prices', () => {
    assert.equal(handlingFeeFor(50_000), 4_000);
    assert.equal(handlingFeeFor(114_285), 4_000);
  });
  it('uses 3.5% once it exceeds the floor', () => {
    assert.equal(handlingFeeFor(200_000), 7_000);
    assert.equal(handlingFeeFor(1_500_000), 52_500);
  });
  it('always returns integer Rupiah', () => {
    for (const price of [123_457, 999_999, 2_345_671]) assert.ok(Number.isInteger(handlingFeeFor(price)));
  });
});

describe('commission per plan (§5)', () => {
  it('charges 5% / 4.5% / 4% for Free / Pro / Business', () => {
    assert.equal(commissionFor(1_000_000, SUBSCRIPTION_PLANS.FREE.commissionRate), 50_000);
    assert.equal(commissionFor(1_000_000, SUBSCRIPTION_PLANS.PRO.commissionRate), 45_000);
    assert.equal(commissionFor(1_000_000, SUBSCRIPTION_PLANS.BUSINESS.commissionRate), 40_000);
  });
  it('rounds to whole Rupiah', () => {
    assert.equal(commissionFor(333_333, 0.045), 15_000);
  });
  it('keeps plan prices and listing limits from the docs', () => {
    assert.equal(SUBSCRIPTION_PLANS.PRO.price, 99_000);
    assert.equal(SUBSCRIPTION_PLANS.BUSINESS.price, 299_000);
    assert.equal(SUBSCRIPTION_PLANS.FREE.maxListings, 15);
    assert.equal(SUBSCRIPTION_PLANS.BUSINESS.maxListings, null);
  });
});

describe('protection window (§6)', () => {
  it('is 14 days up to Rp10 juta and 30 days above', () => {
    assert.equal(protectionDaysFor(10_000_000), 14);
    assert.equal(protectionDaysFor(10_000_001), 30);
  });
});

describe('payment-method surcharge for top-up & Balance (§8)', () => {
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

describe('promo discount', () => {
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

describe('loyalty, deposit, ads', () => {
  it('earns 1 point per Rp1.000, rounded down', () => {
    assert.equal(pointsFor(999), 0);
    assert.equal(pointsFor(1_000), 1);
    assert.equal(pointsFor(1_234_567), 1_234);
  });
  it('holds a Rp500.000 store deposit', () => {
    assert.equal(STORE_DEPOSIT, 500_000);
  });
  it('prices featured ads per duration', () => {
    assert.deepEqual(FEATURED_PRICES, { 1: 3_000, 3: 9_000, 7: 20_000, 14: 35_000, 30: 60_000 });
  });
});

describe('top-up retail price — Digiflazz price + 3%, rounded up to Rp100 (§8)', () => {
  it('adds 3% and rounds up to the next Rp100', () => {
    assert.equal(topupRetailFor(51_145), 52_700);
    assert.equal(topupRetailFor(1_425), 1_500);
    assert.equal(topupRetailFor(1_003_289), 1_033_400);
  });
  it('does not overshoot on exact multiples (no float error)', () => {
    assert.equal(topupRetailFor(10_000), 10_300);
    assert.equal(topupRetailFor(100_000), 103_000);
  });
  it('is never below the supplier price', () => {
    for (const cost of [1, 99, 750, 23_256, 1_629_000]) assert.ok(topupRetailFor(cost) >= cost);
  });
});
