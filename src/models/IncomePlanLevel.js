const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Normalised level commissions — one row per level per plan
const IncomePlanLevel = sequelize.define('IncomePlanLevel', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  planId:     { type: DataTypes.UUID, allowNull: false },
  level:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  label:      { type: DataTypes.STRING(60), allowNull: true },
  percentage: { type: DataTypes.DECIMAL(6,3), allowNull: false, defaultValue: 0 },
  flatAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  type:       { type: DataTypes.ENUM('percentage','flat'), defaultValue: 'percentage' },
  minTeamSize:{ type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 }, // eligibility condition
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'income_plan_levels',
  indexes: [
    { fields: ['planId'] },
    { unique: true, fields: ['planId', 'level'] },
  ],
});

module.exports = IncomePlanLevel;
