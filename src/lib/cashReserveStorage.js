import { query } from './db';
import { assertSchemaReady } from './schemaReadiness';

const toMoneyNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '').replace(/[^0-9.-]/g, '')) : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};

const toCents = (value) => Math.round(toMoneyNumber(value) * 100);
const fromCents = (value) => Math.round(value) / 100;



export async function recalculateBalances() {
  await assertSchemaReady('financial');
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
