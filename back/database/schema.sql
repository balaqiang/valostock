-- =====================================================================
-- valostock.id — skema database prototype (MySQL / MariaDB 10.4 XAMPP)
-- Sumber kebenaran: docs/modeling/05-struktur-tabel.md (harus selalu sama).
-- Import lewat phpMyAdmin: tab "Import" → pilih file ini → "Go".
-- File ini MENGHAPUS dan membuat ulang database `valostock`.
-- =====================================================================

DROP DATABASE IF EXISTS valostock;
CREATE DATABASE valostock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE valostock;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 1. Pengguna ----------------------------------------------------------
CREATE TABLE users (
  id            VARCHAR(36)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(191) NOT NULL,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  balance       INT          NOT NULL DEFAULT 0 COMMENT 'Saldo Balance (BLC), ringkasan dari balance_ledger',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  CONSTRAINT ck_users_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

-- 2. Toko --------------------------------------------------------------
CREATE TABLE stores (
  id                VARCHAR(36)  NOT NULL,
  owner_id          VARCHAR(36)  NOT NULL,
  slug              VARCHAR(60)  NOT NULL,
  name              VARCHAR(100) NOT NULL,
  type              ENUM('OWNER','RESELLER') NOT NULL DEFAULT 'OWNER',
  level             ENUM('AUTHORIZED','VERIFIED','PLATINUM') NOT NULL DEFAULT 'AUTHORIZED',
  status            ENUM('PENDING_DEPOSIT','PENDING_REVIEW','ACTIVE','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING_DEPOSIT',
  owner_legal_name  VARCHAR(100) NOT NULL COMMENT 'Nama sesuai identitas; diverifikasi manual oleh admin (pengganti KYC)',
  description       TEXT         NULL,
  gradient          VARCHAR(120) NOT NULL DEFAULT 'from-violet-600 to-fuchsia-600',
  deposit_amount    INT          NOT NULL DEFAULT 500000,
  deposit_status    ENUM('UNPAID','HELD','RELEASED') NOT NULL DEFAULT 'UNPAID',
  identity_verified TINYINT(1)   NOT NULL DEFAULT 0,
  rating            DECIMAL(3,2) NOT NULL DEFAULT 0,
  reviews           INT          NOT NULL DEFAULT 0,
  sold              INT          NOT NULL DEFAULT 0,
  followers         INT          NOT NULL DEFAULT 0,
  score_desc        DECIMAL(3,2) NOT NULL DEFAULT 0 COMMENT 'Service score: akurasi deskripsi (1-5)',
  score_attitude    DECIMAL(3,2) NOT NULL DEFAULT 0 COMMENT 'Service score: sikap pelayanan (1-5)',
  score_delivery    DECIMAL(3,2) NOT NULL DEFAULT 0 COMMENT 'Service score: kecepatan pengiriman (1-5)',
  review_note       VARCHAR(255) NULL,
  reviewed_by       VARCHAR(36)  NULL,
  reviewed_at       DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stores_owner (owner_id),
  UNIQUE KEY uq_stores_slug (slug),
  KEY ix_stores_status (status),
  CONSTRAINT fk_stores_owner    FOREIGN KEY (owner_id)    REFERENCES users (id),
  CONSTRAINT fk_stores_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- 3. Saldo toko (ringkasan) ---------------------------------------------
CREATE TABLE store_balances (
  store_id   VARCHAR(36) NOT NULL,
  escrow     INT         NOT NULL DEFAULT 0 COMMENT 'Dana ditahan untuk pesanan yang belum selesai',
  available  INT         NOT NULL DEFAULT 0 COMMENT 'Dana yang bisa ditarik',
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  CONSTRAINT fk_store_balances_store FOREIGN KEY (store_id) REFERENCES stores (id),
  CONSTRAINT ck_store_balances CHECK (escrow >= 0 AND available >= 0)
) ENGINE=InnoDB;

-- 4. Mutasi saldo toko (ledger, append-only) -----------------------------
CREATE TABLE store_ledger (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  store_id      VARCHAR(36) NOT NULL,
  bucket        ENUM('ESCROW','AVAILABLE') NOT NULL,
  type          ENUM('ESCROW_HOLD','ESCROW_RELEASE','COMMISSION','REFUND','WITHDRAW','WITHDRAW_FEE','PAYOUT_REVERSAL','ADJUSTMENT') NOT NULL,
  amount        INT         NOT NULL COMMENT 'Bertanda: + masuk, - keluar',
  balance_after INT         NOT NULL,
  ref_type      VARCHAR(20) NOT NULL COMMENT 'order / withdrawal / adjustment',
  ref_id        VARCHAR(36) NOT NULL,
  note          VARCHAR(255) NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_store_ledger_store (store_id, created_at),
  KEY ix_store_ledger_ref (ref_type, ref_id),
  CONSTRAINT fk_store_ledger_store FOREIGN KEY (store_id) REFERENCES stores (id)
) ENGINE=InnoDB;

-- 5. Voucher toko -------------------------------------------------------
CREATE TABLE store_vouchers (
  id         VARCHAR(36) NOT NULL,
  store_id   VARCHAR(36) NOT NULL,
  code       VARCHAR(30) NOT NULL,
  kind       ENUM('PERCENT','FIXED') NOT NULL,
  value      INT         NOT NULL,
  min_spend  INT         NOT NULL DEFAULT 0,
  quota      INT         NULL,
  used       INT         NOT NULL DEFAULT 0,
  expires_at DATE        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_vouchers_code (store_id, code),
  CONSTRAINT fk_store_vouchers_store FOREIGN KEY (store_id) REFERENCES stores (id)
) ENGINE=InnoDB;

-- 6. Game ---------------------------------------------------------------
CREATE TABLE games (
  id               INT          NOT NULL AUTO_INCREMENT,
  slug             VARCHAR(50)  NOT NULL,
  name             VARCHAR(100) NOT NULL,
  publisher        VARCHAR(100) NOT NULL,
  tagline          VARCHAR(150) NOT NULL,
  description      TEXT         NOT NULL,
  supports_account TINYINT(1)   NOT NULL DEFAULT 0,
  supports_topup   TINYINT(1)   NOT NULL DEFAULT 0,
  has_skin_api     TINYINT(1)   NOT NULL DEFAULT 0,
  is_hot           TINYINT(1)   NOT NULL DEFAULT 0,
  uid_label        VARCHAR(50)  NOT NULL,
  uid_hint         VARCHAR(150) NOT NULL,
  uid_extra_label  VARCHAR(50)  NULL,
  gradient         VARCHAR(120) NOT NULL,
  topup_currency   VARCHAR(30)  NULL,
  sort_order       INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_slug (slug)
) ENGINE=InnoDB;

-- 7. Katalog akun -------------------------------------------------------
CREATE TABLE catalogs (
  id              VARCHAR(36)  NOT NULL,
  vs_code         VARCHAR(20)  NOT NULL COMMENT 'Kode katalog dari platform (anti double-sell)',
  store_id        VARCHAR(36)  NOT NULL,
  game_id         INT          NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT         NULL,
  price           INT          NOT NULL,
  old_price       INT          NULL,
  status          ENUM('DRAFT','LISTED','LOCKED','IN_ORDER','SOLD','DELISTED') NOT NULL DEFAULT 'LISTED',
  account_checked TINYINT(1)   NOT NULL DEFAULT 0,
  instant         TINYINT(1)   NOT NULL DEFAULT 0,
  image           VARCHAR(255) NULL,
  images          JSON         NULL COMMENT 'Array URL gambar',
  attributes      JSON         NULL COMMENT 'Atribut khusus game: rank, skin, region, level, dll.',
  views           INT          NOT NULL DEFAULT 0,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalogs_vs_code (vs_code),
  KEY ix_catalogs_store (store_id, status),
  KEY ix_catalogs_game (game_id, status),
  CONSTRAINT fk_catalogs_store FOREIGN KEY (store_id) REFERENCES stores (id),
  CONSTRAINT fk_catalogs_game  FOREIGN KEY (game_id)  REFERENCES games (id),
  CONSTRAINT ck_catalogs_price CHECK (price > 0)
) ENGINE=InnoDB;

-- 8. Produk top-up ------------------------------------------------------
CREATE TABLE topup_products (
  id           VARCHAR(36)  NOT NULL,
  game_id      INT          NOT NULL,
  name         VARCHAR(100) NOT NULL,
  amount_label VARCHAR(50)  NOT NULL,
  retail_price INT          NOT NULL,
  popular      TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_topup_products_game (game_id),
  CONSTRAINT fk_topup_products_game FOREIGN KEY (game_id) REFERENCES games (id)
) ENGINE=InnoDB;

-- 9. Kode promo top-up --------------------------------------------------
CREATE TABLE promo_codes (
  id         INT          NOT NULL AUTO_INCREMENT,
  code       VARCHAR(30)  NOT NULL,
  kind       ENUM('PERCENT','FIXED') NOT NULL,
  value      INT          NOT NULL,
  min_spend  INT          NOT NULL DEFAULT 0,
  label      VARCHAR(100) NOT NULL,
  quota      INT          NULL,
  used_count INT          NOT NULL DEFAULT 0,
  expires_at DATETIME     NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promo_codes_code (code)
) ENGINE=InnoDB;

-- 10. Pesanan top-up ----------------------------------------------------
CREATE TABLE topup_orders (
  id               VARCHAR(36)  NOT NULL,
  invoice_number   VARCHAR(30)  NOT NULL,
  user_id          VARCHAR(36)  NULL COMMENT 'NULL = tamu (tanpa login)',
  product_id       VARCHAR(36)  NOT NULL,
  promo_code_id    INT          NULL,
  user_game_id     VARCHAR(100) NOT NULL,
  game_zone_id     VARCHAR(30)  NULL,
  contact_email    VARCHAR(191) NULL,
  contact_whatsapp VARCHAR(20)  NULL,
  base_price       INT          NOT NULL,
  discount         INT          NOT NULL DEFAULT 0,
  surcharge        INT          NOT NULL DEFAULT 0,
  amount           INT          NOT NULL COMMENT 'Total dibayar',
  pay_source       ENUM('MIDTRANS','BALANCE') NOT NULL,
  payment_method   ENUM('QRIS','VA','RETAIL','EWALLET','CC','BALANCE') NOT NULL,
  status           ENUM('PENDING','PAID','PROCESSING','SUCCESS','FAILED','EXPIRED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  provider_ref     VARCHAR(50)  NULL COMMENT 'Referensi penyedia top-up (simulasi)',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at          DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_topup_orders_invoice (invoice_number),
  KEY ix_topup_orders_user (user_id, created_at),
  CONSTRAINT fk_topup_orders_user    FOREIGN KEY (user_id)       REFERENCES users (id),
  CONSTRAINT fk_topup_orders_product FOREIGN KEY (product_id)    REFERENCES topup_products (id),
  CONSTRAINT fk_topup_orders_promo   FOREIGN KEY (promo_code_id) REFERENCES promo_codes (id)
) ENGINE=InnoDB;

-- 11. Isi Balance -------------------------------------------------------
CREATE TABLE balance_topups (
  id              VARCHAR(36) NOT NULL,
  invoice_number  VARCHAR(30) NOT NULL,
  user_id         VARCHAR(36) NOT NULL,
  nominal         INT         NOT NULL,
  qty             INT         NOT NULL,
  credit          INT         NOT NULL COMMENT 'BLC yang ditambahkan = nominal x qty',
  payment_method  ENUM('QRIS','VA','RETAIL','EWALLET','CC') NOT NULL,
  surcharge       INT         NOT NULL DEFAULT 0,
  amount          INT         NOT NULL COMMENT 'Total dibayar',
  idempotency_key VARCHAR(64) NOT NULL,
  status          ENUM('PENDING','PAID','FAILED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at         DATETIME    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_balance_topups_invoice (invoice_number),
  UNIQUE KEY uq_balance_topups_idem (user_id, idempotency_key),
  CONSTRAINT fk_balance_topups_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- 12. Mutasi Balance (ledger, append-only) ------------------------------
CREATE TABLE balance_ledger (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  user_id       VARCHAR(36) NOT NULL,
  type          ENUM('TOPUP_CREDIT','SPEND_TOPUP','REFUND_CREDIT','ADJUSTMENT') NOT NULL,
  amount        INT         NOT NULL COMMENT 'Bertanda: + masuk, - keluar',
  balance_after INT         NOT NULL,
  reference     VARCHAR(40) NOT NULL COMMENT 'Nomor invoice terkait',
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_balance_ledger_user (user_id, created_at),
  CONSTRAINT fk_balance_ledger_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- 13. Pesanan akun ------------------------------------------------------
CREATE TABLE orders (
  id              VARCHAR(36)  NOT NULL,
  order_number    VARCHAR(30)  NOT NULL,
  catalog_id      VARCHAR(36)  NOT NULL,
  buyer_id        VARCHAR(36)  NOT NULL,
  store_id        VARCHAR(36)  NOT NULL,
  item_price      INT          NOT NULL,
  handling_fee    INT          NOT NULL,
  protection_fee  INT          NOT NULL,
  total_paid      INT          NOT NULL COMMENT 'item_price + handling_fee + protection_fee',
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500,
  commission      INT          NOT NULL,
  store_receives  INT          NOT NULL COMMENT 'item_price - commission',
  payment_method  ENUM('QRIS','VA','RETAIL','EWALLET','CC') NULL,
  status          ENUM('PENDING_PAYMENT','PAID','IN_REKBER','SAFE','COMPLETED','CANCELLED','REFUNDED','DISPUTED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  room_code       VARCHAR(20)  NOT NULL COMMENT 'Kode rekber = vs_code katalog',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at         DATETIME     NULL,
  safe_at         DATETIME     NULL,
  completed_at    DATETIME     NULL,
  cancelled_at    DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY ix_orders_buyer (buyer_id, created_at),
  KEY ix_orders_store (store_id, status),
  KEY ix_orders_catalog (catalog_id),
  CONSTRAINT fk_orders_catalog FOREIGN KEY (catalog_id) REFERENCES catalogs (id),
  CONSTRAINT fk_orders_buyer   FOREIGN KEY (buyer_id)   REFERENCES users (id),
  CONSTRAINT fk_orders_store   FOREIGN KEY (store_id)   REFERENCES stores (id)
) ENGINE=InnoDB;

-- 14. Pembayaran (Midtrans) ---------------------------------------------
CREATE TABLE payments (
  id                      VARCHAR(36)  NOT NULL,
  midtrans_order_id       VARCHAR(50)  NOT NULL COMMENT 'order_id yang dikirim ke Midtrans (= nomor invoice/pesanan)',
  purpose                 ENUM('TOPUP','BALANCE_FILL','ORDER','STORE_DEPOSIT') NOT NULL,
  ref_id                  VARCHAR(36)  NOT NULL COMMENT 'id di topup_orders / balance_topups / orders / stores (sesuai purpose)',
  user_id                 VARCHAR(36)  NULL,
  amount                  INT          NOT NULL COMMENT 'gross_amount, wajib sama dengan notifikasi Midtrans',
  payment_method          ENUM('QRIS','VA','RETAIL','EWALLET','CC') NOT NULL,
  snap_token              VARCHAR(100) NULL,
  redirect_url            VARCHAR(255) NULL,
  status                  ENUM('PENDING','PAID','EXPIRED','FAILED') NOT NULL DEFAULT 'PENDING',
  midtrans_transaction_id VARCHAR(64)  NULL,
  payment_type            VARCHAR(30)  NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at                 DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_midtrans_order (midtrans_order_id),
  KEY ix_payments_ref (purpose, ref_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- 15. Notifikasi pembayaran (idempotensi) --------------------------------
CREATE TABLE webhook_events (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  source          ENUM('MIDTRANS') NOT NULL DEFAULT 'MIDTRANS',
  external_id     VARCHAR(120) NOT NULL COMMENT 'transaction_id + status, unik per notifikasi',
  payment_id      VARCHAR(36)  NULL,
  payload         JSON         NOT NULL,
  signature_valid TINYINT(1)   NOT NULL DEFAULT 0,
  processed       TINYINT(1)   NOT NULL DEFAULT 0,
  received_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_events (source, external_id),
  CONSTRAINT fk_webhook_events_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE=InnoDB;

-- 16. Penarikan dana ----------------------------------------------------
CREATE TABLE withdrawals (
  id                VARCHAR(36)  NOT NULL,
  withdrawal_number VARCHAR(30)  NOT NULL,
  store_id          VARCHAR(36)  NOT NULL,
  amount            INT          NOT NULL COMMENT 'Total didebit dari saldo tersedia (termasuk biaya)',
  fee               INT          NOT NULL COMMENT 'Biaya tarik + biaya bank',
  bank_name         VARCHAR(50)  NOT NULL,
  account_number    VARCHAR(30)  NOT NULL,
  account_name      VARCHAR(100) NOT NULL,
  name_match        ENUM('MATCH','REVIEW','MISMATCH') NOT NULL,
  status            ENUM('PENDING','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  review_note       VARCHAR(255) NULL,
  reviewed_by       VARCHAR(36)  NULL,
  reviewed_at       DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_withdrawals_number (withdrawal_number),
  KEY ix_withdrawals_store (store_id, created_at),
  KEY ix_withdrawals_status (status),
  CONSTRAINT fk_withdrawals_store    FOREIGN KEY (store_id)    REFERENCES stores (id),
  CONSTRAINT fk_withdrawals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT ck_withdrawals_amount CHECK (amount > fee)
) ENGINE=InnoDB;

-- 17. Pesan rekber ------------------------------------------------------
CREATE TABLE rekber_messages (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  order_id    VARCHAR(36) NOT NULL,
  sender_id   VARCHAR(36) NULL COMMENT 'NULL untuk pesan sistem',
  sender_role ENUM('BUYER','STORE','ADMIN','SYSTEM') NOT NULL,
  body        TEXT        NOT NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_rekber_messages_order (order_id, id),
  CONSTRAINT fk_rekber_messages_order  FOREIGN KEY (order_id)  REFERENCES orders (id),
  CONSTRAINT fk_rekber_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- 18. Artikel bantuan ---------------------------------------------------
CREATE TABLE help_articles (
  id         INT          NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(100) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  category   ENUM('GETTING_STARTED','BECOMING_STORE','FEES_WITHDRAWAL','BEFORE_SALE','AFTER_SALE','DISPUTES','TOPUP','BALANCE','PENALTIES','SECURITY') NOT NULL,
  excerpt    VARCHAR(255) NOT NULL,
  body       JSON         NOT NULL COMMENT 'Array blok: paragraph / heading / list',
  popular    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_help_articles_slug (slug)
) ENGINE=InnoDB;

-- 19. Log audit ---------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  actor_id    VARCHAR(36) NULL COMMENT 'NULL untuk aksi sistem',
  action      VARCHAR(60) NOT NULL COMMENT 'mis. store.approve, withdrawal.approve',
  target_type VARCHAR(30) NOT NULL,
  target_id   VARCHAR(36) NOT NULL,
  detail      JSON        NULL,
  ip          VARCHAR(45) NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_logs_target (target_type, target_id),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users (id)
) ENGINE=InnoDB;
