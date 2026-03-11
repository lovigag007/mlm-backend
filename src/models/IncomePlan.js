const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Master plan config — templates created by SuperAdmin, copied for tenants
const IncomePlan = sequelize.define('IncomePlan', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:         { type: DataTypes.STRING(150), allowNull: false },
  description:  { type: DataTypes.TEXT, allowNull: true },
  networkType:  { type: DataTypes.ENUM('binary','unilevel','matrix','hybrid'), defaultValue: 'unilevel' },
  isTemplate:   { type: DataTypes.BOOLEAN, defaultValue: false },  // true = SuperAdmin template
  isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
  tenantId:     { type: DataTypes.UUID, allowNull: true },  // null = platform template

  // Direct / referral bonus
  directBonusEnabled:    { type: DataTypes.BOOLEAN, defaultValue: true },
  directBonusType:       { type: DataTypes.ENUM('percentage','flat'), defaultValue: 'percentage' },
  directBonusValue:      { type: DataTypes.DECIMAL(8,2), defaultValue: 10.00 },

  // ROI config
  roiEnabled:            { type: DataTypes.BOOLEAN, defaultValue: false },
  roiPercentage:         { type: DataTypes.DECIMAL(6,2), defaultValue: 0.00 },
  roiFrequency:          { type: DataTypes.ENUM('daily','weekly','monthly'), defaultValue: 'monthly' },
  roiDurationCycles:     { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  roiCap:                { type: DataTypes.DECIMAL(8,2), defaultValue: 0 }, // max ROI % of investment (0=unlimited)

  // Tree / commission config
  maxDepth:              { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 7 },
  matrixWidth:           { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 2 },

  // Matching bonus
  matchingBonusEnabled:  { type: DataTypes.BOOLEAN, defaultValue: false },
  matchingBonusLeg:      { type: DataTypes.ENUM('weaker','stronger','both'), defaultValue: 'weaker' },
  matchingBonusPct:      { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },

  // Caps
  dailyIncomeCap:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },  // 0 = unlimited
  totalIncomeCap:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  minPurchaseToEarn:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Cron scheduling
  cronEnabled:           { type: DataTypes.BOOLEAN, defaultValue: false },
  cronExpression:        { type: DataTypes.STRING(50), defaultValue: '0 0 1 * *' },
  lastCronRun:           { type: DataTypes.DATE, allowNull: true },
  nextCronRun:           { type: DataTypes.DATE, allowNull: true },

  createdBy: { type: DataTypes.UUID, allowNull: true }, // superadmin id for templates
}, {
  tableName: 'income_plans',
  indexes: [
    { fields: ['isTemplate'] },
    { fields: ['tenantId'] },
  ],
});

module.exports = IncomePlan;
