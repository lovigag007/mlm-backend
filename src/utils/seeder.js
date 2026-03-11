'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { connectDB, sequelize } = require('../../config/database');

// Must load all models before sync
require('../models');

const { SuperAdmin, IncomePlan } = require('../models');

const PLANS = [
  {
    name: 'Binary Plan — 7 Levels',
    networkType: 'binary',
    isActive: true,
    sortOrder: 1,
    description: 'Classic binary structure. Two legs (left/right), commissions paid up to 7 levels. Best for balanced team growth.',
    levels: [
      { level: 1, percentage: 10, label: 'Level 1' },
      { level: 2, percentage: 5,  label: 'Level 2' },
      { level: 3, percentage: 3,  label: 'Level 3' },
      { level: 4, percentage: 2,  label: 'Level 4' },
      { level: 5, percentage: 1,  label: 'Level 5' },
      { level: 6, percentage: 1,  label: 'Level 6' },
      { level: 7, percentage: 1,  label: 'Level 7' },
    ],
    directBonusEnabled: true, directBonusPercentage: 10, directBonusType: 'percentage',
    roiEnabled: false, roiPercentage: 0, roiDurationDays: 0,
    maxDepth: 7, matrixWidth: 2, defaultScheduleFrequency: 'monthly',
  },
  {
    name: 'Unilevel Plan — 10 Levels',
    networkType: 'unilevel',
    isActive: true,
    sortOrder: 2,
    description: 'Unlimited-width network with 10-level deep commissions. Great for viral referral campaigns.',
    levels: [
      { level: 1, percentage: 8,   label: 'Level 1' },
      { level: 2, percentage: 5,   label: 'Level 2' },
      { level: 3, percentage: 3,   label: 'Level 3' },
      { level: 4, percentage: 2,   label: 'Level 4' },
      { level: 5, percentage: 2,   label: 'Level 5' },
      { level: 6, percentage: 1,   label: 'Level 6' },
      { level: 7, percentage: 1,   label: 'Level 7' },
      { level: 8, percentage: 1,   label: 'Level 8' },
      { level: 9, percentage: 0.5, label: 'Level 9' },
      { level: 10, percentage: 0.5, label: 'Level 10' },
    ],
    directBonusEnabled: true, directBonusPercentage: 12, directBonusType: 'percentage',
    roiEnabled: false, roiPercentage: 0, roiDurationDays: 0,
    maxDepth: 10, matrixWidth: 0, defaultScheduleFrequency: 'monthly',
  },
  {
    name: 'ROI Investment Plan',
    networkType: 'unilevel',
    isActive: true,
    sortOrder: 3,
    description: 'Earn daily ROI on total purchase volume. Referral commissions paid on 5 levels. Ideal for investment products.',
    levels: [
      { level: 1, percentage: 5, label: 'Level 1' },
      { level: 2, percentage: 3, label: 'Level 2' },
      { level: 3, percentage: 2, label: 'Level 3' },
      { level: 4, percentage: 1, label: 'Level 4' },
      { level: 5, percentage: 1, label: 'Level 5' },
    ],
    directBonusEnabled: true, directBonusPercentage: 8, directBonusType: 'percentage',
    roiEnabled: true, roiPercentage: 1.5, roiDurationDays: 200,
    maxDepth: 5, matrixWidth: 0, defaultScheduleFrequency: 'daily',
  },
  {
    name: 'Matrix 3×7 Plan',
    networkType: 'matrix',
    isActive: true,
    sortOrder: 4,
    description: '3-wide × 7-deep forced matrix. Earn from spillover placements made by your upline.',
    levels: [
      { level: 1, percentage: 6, label: 'Level 1' },
      { level: 2, percentage: 4, label: 'Level 2' },
      { level: 3, percentage: 3, label: 'Level 3' },
      { level: 4, percentage: 2, label: 'Level 4' },
      { level: 5, percentage: 2, label: 'Level 5' },
      { level: 6, percentage: 1, label: 'Level 6' },
      { level: 7, percentage: 1, label: 'Level 7' },
    ],
    directBonusEnabled: true, directBonusPercentage: 5, directBonusType: 'percentage',
    roiEnabled: false, roiPercentage: 0, roiDurationDays: 0,
    maxDepth: 7, matrixWidth: 3, defaultScheduleFrequency: 'weekly',
  },
];

const seed = async () => {
  await connectDB();

  // Super Admin
  const saEmail = process.env.SA_EMAIL || 'superadmin@mlmplatform.com';
  const saPass  = process.env.SA_PASSWORD || 'SuperAdmin@123';
  const [sa, saCreated] = await SuperAdmin.findOrCreate({
    where: { email: saEmail },
    defaults: { name: process.env.SA_NAME || 'Super Admin', email: saEmail, passwordHash: saPass },
  });
  console.log(saCreated ? `✅ Super Admin created: ${saEmail}` : `ℹ️  Super Admin exists: ${saEmail}`);

  // Income Plan Templates
  for (const plan of PLANS) {
    const [, created] = await IncomePlan.findOrCreate({
      where: { name: plan.name },
      defaults: { ...plan, createdBy: sa.id },
    });
    console.log(created ? `✅ Plan: ${plan.name}` : `ℹ️  Plan exists: ${plan.name}`);
  }

  console.log('\n🎉 Seed complete');
  console.log(`   Super Admin → ${saEmail} / ${saPass}\n`);
  await sequelize.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
