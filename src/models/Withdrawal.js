const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Withdrawal = sequelize.define('Withdrawal', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:        { type: DataTypes.UUID, allowNull: false },
  memberId:        { type: DataTypes.UUID, allowNull: false },
  walletId:        { type: DataTypes.UUID, allowNull: false },
  bankAccountId:   { type: DataTypes.UUID, allowNull: true },
  requestNumber:   { type: DataTypes.STRING(30), allowNull: false },
  requestedAmount: { type: DataTypes.DECIMAL(15,2), allowNull: false },
  tdsAmount:       { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  processingFee:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  netPayableAmount:{ type: DataTypes.DECIMAL(15,2), allowNull: false },
  status:          { type: DataTypes.ENUM('pending','under_review','approved','rejected','paid','cancelled'), defaultValue: 'pending' },
  adminNote:       { type: DataTypes.STRING(500), allowNull: true },
  paymentRef:      { type: DataTypes.STRING(100), allowNull: true },
  processedAt:     { type: DataTypes.DATE, allowNull: true },
  processedBy:     { type: DataTypes.UUID, allowNull: true },
  paidAt:          { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'withdrawals',
  indexes: [
    { unique: true, fields: ['requestNumber'] },
    { fields: ['tenantId', 'memberId'] },
    { fields: ['tenantId', 'status'] },
    { fields: ['tenantId', 'createdAt'] },
  ],
});

module.exports = Withdrawal;
