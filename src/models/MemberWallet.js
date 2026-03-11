const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Normalised: one wallet row per member — separate from identity
const MemberWallet = sequelize.define('MemberWallet', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  memberId:         { type: DataTypes.UUID, allowNull: false, unique: true },
  tenantId:         { type: DataTypes.UUID, allowNull: false },

  // Balances (DECIMAL for financial accuracy)
  incomeBalance:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  shoppingBalance:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  holdBalance:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },  // Pending withdrawal lock

  // Lifetime totals (for dashboard)
  totalCredited:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  totalDebited:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  totalWithdrawn:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
  totalTdsDeducted: { type: DataTypes.DECIMAL(15,2), defaultValue: 0.00 },
}, {
  tableName: 'member_wallets',
  indexes: [
    { unique: true, fields: ['memberId'] },
    { fields: ['tenantId'] },
  ],
});

module.exports = MemberWallet;
