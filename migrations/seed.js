require('dotenv').config({ path: '../.env' });
const sequelize = require('../config/database');
require('../src/models'); // load all models + associations
const { SuperAdmin, IncomePlan, IncomePlanLevel } = require('../src/models');
const logger = require('../config/logger');

const PLAN_TEMPLATES = [
  {
    name: 'Binary Plan — 7 Levels',
    description: 'Classic binary two-leg structure with 7-level commissions. Direct bonus 10%. Ideal for structured teams.',
    networkType: 'binary', isTemplate: true, isActive: true,
    directBonusEnabled: true, directBonusType: 'percentage', directBonusValue: 10,
    roiEnabled: false, maxDepth: 7, matrixWidth: 2,
    levels: [
      { level:1, label:'Direct Level', percentage:10, type:'percentage' },
      { level:2, label:'Level 2', percentage:5, type:'percentage' },
      { level:3, label:'Level 3', percentage:3, type:'percentage' },
      { level:4, label:'Level 4', percentage:2, type:'percentage' },
      { level:5, label:'Level 5', percentage:1, type:'percentage' },
      { level:6, label:'Level 6', percentage:1, type:'percentage' },
      { level:7, label:'Level 7', percentage:1, type:'percentage' },
    ],
  },
  {
    name: 'Unilevel Plan — 10 Levels',
    description: 'Unlimited-width unilevel with 10-level deep commissions. No binary leg balancing required. Great for large referral networks.',
    networkType: 'unilevel', isTemplate: true, isActive: true,
    directBonusEnabled: true, directBonusType: 'percentage', directBonusValue: 12,
    roiEnabled: false, maxDepth: 10, matrixWidth: 0,
    levels: [
      { level:1, percentage:8 }, { level:2, percentage:5 }, { level:3, percentage:3 },
      { level:4, percentage:2 }, { level:5, percentage:2 }, { level:6, percentage:1 },
      { level:7, percentage:1 }, { level:8, percentage:1 }, { level:9, percentage:0.5 }, { level:10, percentage:0.5 },
    ],
  },
  {
    name: 'Daily ROI Investment Plan',
    description: '1.5% daily ROI on purchase value for up to 200 days (300% cap). 5-level referral commissions. Ideal for investment-style MLM.',
    networkType: 'unilevel', isTemplate: true, isActive: true,
    directBonusEnabled: true, directBonusType: 'percentage', directBonusValue: 8,
    roiEnabled: true, roiPercentage: 1.5, roiFrequency: 'daily', roiDurationCycles: 200, roiCap: 300,
    maxDepth: 5, cronEnabled: true, cronExpression: '0 8 * * *',
    levels: [
      { level:1, percentage:5 }, { level:2, percentage:3 }, { level:3, percentage:2 },
      { level:4, percentage:1 }, { level:5, percentage:1 },
    ],
  },
  {
    name: 'Matrix 3×7 Forced Matrix',
    description: '3-wide 7-deep forced matrix. Overflow placement from upline. Weekly distribution. Great for predictable team-building.',
    networkType: 'matrix', isTemplate: true, isActive: true,
    directBonusEnabled: true, directBonusType: 'percentage', directBonusValue: 5,
    roiEnabled: false, maxDepth: 7, matrixWidth: 3,
    levels: [
      { level:1, percentage:6 }, { level:2, percentage:4 }, { level:3, percentage:3 },
      { level:4, percentage:2 }, { level:5, percentage:2 }, { level:6, percentage:1 }, { level:7, percentage:1 },
    ],
  },
  {
    name: 'Hybrid Plan — Binary + ROI + Matching',
    description: 'Advanced plan combining binary commissions, monthly ROI, and 30% matching bonus on downline earnings. Enterprise use.',
    networkType: 'hybrid', isTemplate: true, isActive: true,
    directBonusEnabled: true, directBonusType: 'percentage', directBonusValue: 10,
    roiEnabled: true, roiPercentage: 0.5, roiFrequency: 'monthly',
    matchingBonusEnabled: true, matchingBonusLeg: 'weaker', matchingBonusPct: 30,
    maxDepth: 6, matrixWidth: 2,
    levels: [
      { level:1, percentage:8 }, { level:2, percentage:5 }, { level:3, percentage:3 },
      { level:4, percentage:2 }, { level:5, percentage:1 }, { level:6, percentage:1 },
    ],
  },
];

const seed = async () => {
  await sequelize.authenticate();
  logger.info('DB connected');
  await sequelize.sync({ alter: true });
  logger.info('Schema synced');

  // Super Admin
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@mlmplatform.com';
  const [admin, adminCreated] = await SuperAdmin.findOrCreate({
    where: { email: adminEmail },
    defaults: { email: adminEmail, password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123', name: 'Super Admin' },
  });
  logger.info(adminCreated ? '✅ Super Admin created' : 'ℹ️  Super Admin exists');

  // Income plan templates
  for (const tmpl of PLAN_TEMPLATES) {
    const { levels, ...planData } = tmpl;
    const [plan, created] = await IncomePlan.findOrCreate({
      where: { name: tmpl.name, isTemplate: true },
      defaults: { ...planData, createdBy: admin.id },
    });
    if (created && levels?.length > 0) {
      await IncomePlanLevel.bulkCreate(levels.map(l => ({ ...l, planId: plan.id })));
    }
    logger.info(`${created ? '✅' : 'ℹ️ '} Plan: ${tmpl.name}`);
  }

  logger.info('\n🎉 Seeding complete!');
  logger.info(`\nCredentials:\n  Super Admin: ${adminEmail} / ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}\n`);
  process.exit(0);
};

seed().catch(err => { logger.error(err.message); process.exit(1); });
