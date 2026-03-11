const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Transaction = sequelize.define('Transaction', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:     { type: DataTypes.UUID, allowNull: false },
  memberId:     { type: DataTypes.UUID, allowNull: false },
  walletId:     { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'direct_bonus','level_commission','roi_income','matching_bonus','rank_bonus',
      'pool_income','fast_start','leadership_bonus',
      'purchase_debit','withdrawal','tds_deduction',
      'refund','admin_credit','admin_debit','adjustment'
    ),
    allowNull: false,
  },
  walletType:   { type: DataTypes.ENUM('income','shopping'), defaultValue: 'income' },
  amount:       { type: DataTypes.DECIMAL(15,2), allowNull: false },
  balanceBefore:{ type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0 },
  balanceAfter: { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0 },
  status:       { type: DataTypes.ENUM('pending','completed','failed','reversed'), defaultValue: 'completed' },
  description:  { type: DataTypes.STRING(500), allowNull: true },
  reference:    { type: DataTypes.STRING(100), allowNull: true },
  fromMemberId: { type: DataTypes.UUID, allowNull: true },   // who triggered the income
  orderId:      { type: DataTypes.UUID, allowNull: true },
  level:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  runId:        { type: DataTypes.STRING(50), allowNull: true }, // batch run identifier
  meta:         { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['tenantId', 'memberId'] },
    { fields: ['tenantId', 'type'] },
    { fields: ['tenantId', 'createdAt'] },
    { fields: ['runId'] },
    { fields: ['orderId'] },
  ],
});

module.exports = Transaction;
