const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Product = sequelize.define('Product', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:     { type: DataTypes.UUID, allowNull: false },
  name:         { type: DataTypes.STRING(150), allowNull: false },
  description:  { type: DataTypes.TEXT, allowNull: true },
  sku:          { type: DataTypes.STRING(50), allowNull: true },
  price:        { type: DataTypes.DECIMAL(15,2), allowNull: false },
  mrp:          { type: DataTypes.DECIMAL(15,2), allowNull: true },
  bv:           { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },  // Business Volume for commission calc
  imageUrl:     { type: DataTypes.STRING(500), defaultValue: '' },
  images:       { type: DataTypes.JSON, defaultValue: [] },           // Additional image URLs
  category:     { type: DataTypes.STRING(100), defaultValue: 'General' },
  stock:        { type: DataTypes.INTEGER, defaultValue: -1 },        // -1 = unlimited
  soldCount:    { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  status:       { type: DataTypes.ENUM('active','inactive','out_of_stock'), defaultValue: 'active' },
  isQualifying: { type: DataTypes.BOOLEAN, defaultValue: true },      // Triggers commissions
  isDigital:    { type: DataTypes.BOOLEAN, defaultValue: false },
  sortOrder:    { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  gstPercentage:{ type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
}, {
  tableName: 'products',
  indexes: [
    { fields: ['tenantId', 'status'] },
    { fields: ['tenantId', 'category'] },
  ],
});

module.exports = Product;
