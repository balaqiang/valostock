-- Opsional: user MySQL khusus aplikasi (least privilege: hanya baca/tulis data).
-- Jalankan di phpMyAdmin (tab SQL) SETELAH schema.sql di-import.
-- Password di bawah hanya untuk pengembangan lokal — samakan dengan DB_PASSWORD di back/.env.
CREATE USER IF NOT EXISTS 'valostock'@'localhost' IDENTIFIED BY 'valostock_dev';
CREATE USER IF NOT EXISTS 'valostock'@'127.0.0.1' IDENTIFIED BY 'valostock_dev';
GRANT SELECT, INSERT, UPDATE, DELETE ON valostock.* TO 'valostock'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON valostock.* TO 'valostock'@'127.0.0.1';
FLUSH PRIVILEGES;
