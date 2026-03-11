/**
 * Rank Engine — evaluates member against plan's rank configs and upgrades if qualified.
 * Called after every purchase or commission run.
 */
const { Member, RankConfig, Notification } = require('../models');

const evaluateRank = async (memberId, tenantId, planId, t) => {
  try {
    const member = await Member.findByPk(memberId, { transaction: t });
    if (!member) return;

    const ranks = await RankConfig.findAll({
      where: { planId, tenantId },
      order: [['rankOrder', 'DESC']], // highest first
      transaction: t,
    });
    if (!ranks.length) return;

    for (const rank of ranks) {
      const qualifies =
        member.directCount    >= rank.minDirectCount &&
        member.teamSize       >= rank.minTeamSize &&
        parseFloat(member.totalPurchase) >= parseFloat(rank.minPersonalSales) &&
        parseFloat(member.totalEarned)   >= 0; // always pass this basic check

      if (qualifies && member.rank !== rank.rankName) {
        const prevRank = member.rank;
        await member.update({ rank: rank.rankName, rankUpdatedAt: new Date() }, { transaction: t });

        // Fire rank achievement notification (non-blocking)
        Notification.create({
          tenantId, memberId,
          type: 'rank_upgrade',
          title: `🏆 Rank Upgraded to ${rank.rankName}!`,
          message: `Congratulations! You have been promoted from ${prevRank} to ${rank.rankName}. Keep building your team!`,
          meta: { previousRank: prevRank, newRank: rank.rankName },
        }).catch(() => {});
        break; // Only set the highest qualifying rank
      }
    }
  } catch (err) {
    // Non-fatal — rank evaluation should not break main flow
    require('../../config/logger').warn(`Rank eval failed for ${memberId}: ${err.message}`);
  }
};

module.exports = { evaluateRank };
