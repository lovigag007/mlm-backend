const sequelize = require('../../config/database');
const { Member, MemberWallet, IncomePlan, IncomePlanLevel, TenantSettings } = require('../models');
const walletService = require('./walletService');
const { v4: uuidv4 } = require('uuid');

/**
 * Process all commissions triggered by a purchase.
 * Runs inside a DB transaction for atomicity.
 */
const processPurchaseCommissions = async (order, tenantId) => {
  const runId = uuidv4();
  const t = await sequelize.transaction();
  try {
    const plan = await IncomePlan.findOne({
      where: { tenantId, isActive: true },
      include: [{ association: 'levels', where: { isActive: true }, required: false, order: [['level', 'ASC']] }],
      transaction: t,
    });

    if (!plan) { await t.commit(); return { runId, distributed: 0, transactions: [] }; }

    const buyer = await Member.findByPk(order.memberId, { include: ['wallet'], transaction: t });
    const txns = [];
    const totalBV = parseFloat(order.totalBV) || parseFloat(order.totalAmount);

    // 1. Direct bonus → sponsor
    if (plan.directBonusEnabled && buyer.sponsorId) {
      const sponsor = await Member.findByPk(buyer.sponsorId, { include: ['wallet'], transaction: t });
      if (sponsor && sponsor.status === 'active') {
        const bonusAmt = plan.directBonusType === 'percentage'
          ? totalBV * parseFloat(plan.directBonusValue) / 100
          : parseFloat(plan.directBonusValue);

        const txn = await walletService.credit(
          sponsor.id, sponsor.wallet.id, tenantId,
          { type: 'direct_bonus', amount: bonusAmt, fromMemberId: buyer.id, orderId: order.id, runId,
            description: `Direct bonus from ${buyer.fullName}` },
          t
        );
        txns.push(txn);
        await Member.increment({ totalEarned: bonusAmt }, { where: { id: sponsor.id }, transaction: t });
      }
    }

    // 2. Level commissions → upline chain
    if (plan.levels && plan.levels.length > 0) {
      let current = buyer;
      const processedIds = new Set();

      for (const levelConfig of plan.levels) {
        if (!current.parentId || processedIds.has(current.parentId)) break;
        const upline = await Member.findByPk(current.parentId, { include: ['wallet'], transaction: t });
        if (!upline) break;
        processedIds.add(upline.id);

        if (upline.status === 'active' && parseFloat(levelConfig.percentage) > 0) {
          const commAmt = levelConfig.type === 'percentage'
            ? totalBV * parseFloat(levelConfig.percentage) / 100
            : parseFloat(levelConfig.flatAmount);

          if (commAmt > 0) {
            const txn = await walletService.credit(
              upline.id, upline.wallet.id, tenantId,
              { type: 'level_commission', amount: commAmt, fromMemberId: buyer.id,
                orderId: order.id, level: levelConfig.level, runId,
                description: `Level ${levelConfig.level} commission from ${buyer.fullName}` },
              t
            );
            txns.push(txn);
            await Member.increment({ totalEarned: commAmt }, { where: { id: upline.id }, transaction: t });
          }
        }
        current = upline;
      }
    }

    await t.commit();
    return { runId, distributed: txns.reduce((s, tx) => s + Math.abs(tx.amount), 0), transactions: txns };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * ROI batch distribution — called by cron or manual trigger.
 */
const distributeROI = async (plan, tenantId) => {
  const runId = uuidv4();
  const t = await sequelize.transaction();
  try {
    if (!plan.roiEnabled || parseFloat(plan.roiPercentage) <= 0) {
      await t.commit(); return { runId, distributed: 0, count: 0 };
    }
    const members = await Member.findAll({
      where: { tenantId, status: 'active' },
      include: ['wallet'],
      transaction: t,
    });
    let distributed = 0, count = 0;
    for (const m of members) {
      if (parseFloat(m.totalPurchase) <= 0) continue;
      const roiAmt = parseFloat(m.totalPurchase) * parseFloat(plan.roiPercentage) / 100;
      if (roiAmt <= 0) continue;

      await walletService.credit(
        m.id, m.wallet.id, tenantId,
        { type: 'roi_income', amount: roiAmt, runId,
          description: `ROI @ ${plan.roiPercentage}% on ₹${m.totalPurchase}` },
        t
      );
      await Member.increment({ totalEarned: roiAmt }, { where: { id: m.id }, transaction: t });
      distributed += roiAmt;
      count++;
    }
    await plan.update({ lastCronRun: new Date() }, { transaction: t });
    await t.commit();
    return { runId, distributed, count };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { processPurchaseCommissions, distributeROI };
