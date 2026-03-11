const cron = require('node-cron');
const { IncomePlan } = require('../models');
const { distributeROI } = require('./commissionService');
const logger = require('../../config/logger');

const checkAndRun = async () => {
  try {
    const now = new Date();
    const plans = await IncomePlan.findAll({
      where: { cronEnabled: true, isActive: true, isTemplate: false },
    });
    for (const plan of plans) {
      if (plan.nextCronRun && new Date(plan.nextCronRun) <= now) {
        logger.info(`[CRON] Starting ROI for tenant ${plan.tenantId}`);
        const result = await distributeROI(plan, plan.tenantId);
        logger.info(`[CRON] Done: ₹${result.distributed.toFixed(2)} to ${result.count} members | runId: ${result.runId}`);

        // Advance nextCronRun
        const next = new Date();
        if (plan.roiFrequency === 'daily')   next.setDate(next.getDate() + 1);
        else if (plan.roiFrequency === 'weekly') next.setDate(next.getDate() + 7);
        else next.setMonth(next.getMonth() + 1);
        await plan.update({ nextCronRun: next });
      }
    }
  } catch (err) {
    logger.error(`[CRON] Scheduler error: ${err.message}`);
  }
};

const initCronJobs = () => {
  // Check every hour
  cron.schedule('0 * * * *', checkAndRun);
  logger.info('✅ Cron scheduler initialised (hourly check)');
};

module.exports = { initCronJobs, checkAndRun };
