const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Rank thresholds per tenant plan
const RankConfig = sequelize.define('RankConfig', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  planId:           { type: DataTypes.UUID, allowNull: false },
  tenantId:         { type: DataTypes.UUID, allowNull: false },
  rankName:         { type: DataTypes.STRING(80), allowNull: false },
  rankOrder:        { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
  minDirectCount:   { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  minTeamSize:      { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  minPersonalSales: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  minTeamSales:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  bonusOnAchieve:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  badgeUrl:         { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'rank_configs',
  indexes: [{ fields: ['planId'] }, { fields: ['tenantId'] }],
});

module.exports = RankConfig;
