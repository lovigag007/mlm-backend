const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Order = sequelize.define('Order', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:     { type: DataTypes.UUID, allowNull: false },
  memberId:     { type: DataTypes.UUID, allowNull: false },
  orderNumber:  { type: DataTypes.STRING(30), allowNull: false },
  status:       { type: DataTypes.ENUM('pending','confirmed','shipped','delivered','cancelled','refunded'), defaultValue: 'confirmed' },
  totalAmount:  { type: DataTypes.DECIMAL(15,2), allowNull: false },
  totalBV:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  gstAmount:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  paymentMethod:{ type: DataTypes.ENUM('wallet','online','cod'), defaultValue: 'wallet' },
  paymentStatus:{ type: DataTypes.ENUM('pending','paid','failed','refunded'), defaultValue: 'paid' },
  notes:        { type: DataTypes.STRING(500), allowNull: true },
  commissionProcessed: { type: DataTypes.BOOLEAN, defaultValue: false },
  commissionRunId:     { type: DataTypes.STRING(50), allowNull: true },
}, {
  tableName: 'orders',
  indexes: [
    { unique: true, fields: ['orderNumber'] },
    { fields: ['tenantId', 'memberId'] },
    { fields: ['tenantId', 'createdAt'] },
  ],
});

module.exports = Order;
