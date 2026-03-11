'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../../config/database');

/**
 * TenantIncomePlan — a tenant's active, configured copy of an IncomePlan template.
 * Tenants configure parameters (percentages, caps, schedule) here.
 * The source template ID is kept for reference/auditing.
 */
class TenantIncomePlan extends Model {}

TenantIncomePlan.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:         { type: DataTypes.UUID, allowNull: false },
  sourcePlanId:     { type: DataTypes.UUID, allowNull: false }, // FK → income_plans.id

  name:             { type: DataTypes.STRING(150), allowNull: false },
  networkType:      { type: DataTypes.ENUM('binary','unilevel','matrix'), allowNull: false },
  description:      { type: DataTypes.TEXT, allowNull: true },
  isActive:         { type: DataTypes.BOOLEAN, defaultValue: true },

  // Customised commission levels
  levels:           { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

  directBonusEnabled:    { type: DataTypes.BOOLEAN, defaultValue: true },
  directBonusPercentage: { type: DataTypes.DECIMAL(6,2), defaultValue: 10.00 },
  directBonusType:       { type: DataTypes.ENUM('percentage','flat'), defaultValue: 'percentage' },

  roiEnabled:        { type: DataTypes.BOOLEAN, defaultValue: false },
  roiPercentage:     { type: DataTypes.DECIMAL(6,2), defaultValue: 0.00 },
  roiDurationDays:   { type: DataTypes.INTEGER, defaultValue: 0 },

  dailyIncomeCap:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  monthlyIncomeCap:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  minPurchaseAmount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  maxDepth:          { type: DataTypes.INTEGER, defaultValue: 7 },
  matrixWidth:       { type: DataTypes.INTEGER, defaultValue: 2 },

  // Cron schedule
  scheduleFrequency: { type: DataTypes.ENUM('daily','weekly','monthly'), defaultValue: 'monthly' },
  scheduleCronExpr:  { type: DataTypes.STRING(50), defaultValue: '0 0 1 * *' },
  scheduleEnabled:   { type: DataTypes.BOOLEAN, defaultValue: false },
  lastRunAt:         { type: DataTypes.DATE, allowNull: true },
  nextRunAt:         { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'TenantIncomePlan',
  tableName: 'tenant_income_plans',
  indexes: [{ fields: ['tenantId'] }, { fields: ['tenantId', 'isActive'] }],
});

module.exports = TenantIncomePlan;
