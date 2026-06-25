import { query } from './db';

const toMoneyNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '').replace(/[^0-9.-]/g, '')) : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};

const toCents = (value) => Math.round(toMoneyNumber(value) * 100);
const fromCents = (value) => Math.round(value) / 100;

export async function ensureCashReserveTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS cash_reserve_transactions (
      id VARCHAR(64) PRIMARY KEY,
      transaction_date DATE NOT NULL,
      transaction_time TIME NULL,
      type VARCHAR(50) NOT NULL,
      detail TEXT NOT NULL,
      vehicle_ref VARCHAR(255) NULL,
      case_ref VARCHAR(255) NULL,
      person_name VARCHAR(255) NULL,
      payment_channel VARCHAR(100) NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      direction VARCHAR(20) NOT NULL,
      balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      receipt_image_url TEXT NULL,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function recalculateBalances() {
  const rows = await query(`
    SELECT id, direction, amount, balance_after 
    FROM cash_reserve_transactions 
    ORDER BY transaction_date ASC, COALESCE(transaction_time, '00:00:00') ASC, created_at ASC
  `);
  let currentBalanceCents = 0;
  let totalInCents = 0;
  let totalOutCents = 0;

  for (const row of rows) {
    const amountCents = toCents(row.amount);
    if (row.direction === 'IN') {
      currentBalanceCents += amountCents;
      totalInCents += amountCents; 
    } else if (row.direction === 'OUT') {
      currentBalanceCents -= amountCents;
      totalOutCents += amountCents;
    } else if (row.direction === 'ADJUST') {
      currentBalanceCents += amountCents;
    }

    const currentBalance = fromCents(currentBalanceCents);

    if (Number(row.balance_after) !== currentBalance) {
      await query('UPDATE cash_reserve_transactions SET balance_after = ? WHERE id = ?', [currentBalance, row.id]);
    }
  }

  return { balance: fromCents(currentBalanceCents), totalIn: fromCents(totalInCents), totalOut: fromCents(totalOutCents) };
}
