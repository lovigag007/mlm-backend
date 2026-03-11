const sequelize = require('../../config/database');
const { MemberWallet, Transaction } = require('../models');

/**
 * Credit a member's wallet inside an existing transaction (or standalone).
 * All balance mutations go through this service to maintain audit trail.
 */
const credit = async (memberId, walletId, tenantId, {
  type, amount, description, reference, fromMemberId,
  orderId, level, runId, walletType = 'income', meta,
}, t) => {
  const opts = t ? { transaction: t, lock: true } : {};
  const wallet = await MemberWallet.findOne({ where: { id: walletId }, ...opts });
  if (!wallet) throw new Error(`Wallet ${walletId} not found`);

  const balanceBefore = walletType === 'income'
    ? parseFloat(wallet.incomeBalance)
    : parseFloat(wallet.shoppingBalance);
  const balanceAfter = balanceBefore + parseFloat(amount);

  if (walletType === 'income') {
    await wallet.increment({ incomeBalance: amount, totalCredited: amount }, opts);
  } else {
    await wallet.increment({ shoppingBalance: amount, totalCredited: amount }, opts);
  }

  return Transaction.create({
    tenantId, memberId, walletId, type, walletType,
    amount: parseFloat(amount),
    balanceBefore, balanceAfter,
    status: 'completed',
    description, reference, fromMemberId, orderId, level, runId, meta,
  }, t ? { transaction: t } : {});
};

/**
 * Debit a member's wallet (e.g. purchase, withdrawal).
 */
const debit = async (memberId, walletId, tenantId, {
  type, amount, description, orderId, walletType = 'income', meta,
}, t) => {
  const opts = t ? { transaction: t, lock: true } : {};
  const wallet = await MemberWallet.findOne({ where: { id: walletId }, ...opts });
  if (!wallet) throw new Error(`Wallet ${walletId} not found`);

  const balance = walletType === 'income'
    ? parseFloat(wallet.incomeBalance)
    : parseFloat(wallet.shoppingBalance);

  if (balance < parseFloat(amount))
    throw Object.assign(new Error('Insufficient balance'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });

  const balanceBefore = balance;
  const balanceAfter = balance - parseFloat(amount);

  if (walletType === 'income') {
    await wallet.decrement({ incomeBalance: amount, totalDebited: amount }, opts);
  } else {
    await wallet.decrement({ shoppingBalance: amount, totalDebited: amount }, opts);
  }

  return Transaction.create({
    tenantId, memberId, walletId, type, walletType,
    amount: -parseFloat(amount),
    balanceBefore, balanceAfter,
    status: 'completed',
    description, orderId, meta,
  }, t ? { transaction: t } : {});
};

module.exports = { credit, debit };
