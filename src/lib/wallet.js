/* ============================================================
   Wallet operations — transaction-safe credit/debit with ledger
   ============================================================ */
const { poolOrThrow } = require('./db');

async function creditWallet(userId, amount, reason, ref = null) {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id=?', [amount, userId]);
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query(
      'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)',
      [userId, amount, u.wallet_balance, reason, ref]
    );
    await conn.commit();
    return u.wallet_balance;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function debitWallet(userId, amount, reason, ref = null) {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!u || Number(u.wallet_balance) < Number(amount)) {
      throw new Error('Insufficient balance');
    }
    await conn.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id=?', [amount, userId]);
    const [[u2]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query(
      'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)',
      [userId, -amount, u2.wallet_balance, reason, ref]
    );
    await conn.commit();
    return u2.wallet_balance;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function transferToExpert(expertId, amount, reason, ref = null) {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE users SET wallet_balance = wallet_balance + ?, total_earnings = total_earnings + ? WHERE id=?',
      [amount, amount, expertId]
    );
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [expertId]);
    await conn.query(
      'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)',
      [expertId, amount, u.wallet_balance, reason, ref]
    );
    await conn.commit();
    return u.wallet_balance;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { creditWallet, debitWallet, transferToExpert };
