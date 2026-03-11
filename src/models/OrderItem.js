const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:   { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  productName:{ type: DataTypes.STRING(150), allowNull: false },
  quantity:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  unitPrice: { type: DataTypes.DECIMAL(15,2), allowNull: false },
  totalPrice:{ type: DataTypes.DECIMAL(15,2), allowNull: false },
  bv:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
}, {
  tableName: 'order_items',
  indexes: [{ fields: ['orderId'] }],
});

module.exports = OrderItem;
