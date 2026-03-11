const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Announcement = sequelize.define('Announcement', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:  { type: DataTypes.UUID, allowNull: false },
  title:     { type: DataTypes.STRING(200), allowNull: false },
  body:      { type: DataTypes.TEXT, allowNull: false },
  type:      { type: DataTypes.ENUM('info','success','warning','promo'), defaultValue: 'info' },
  audience:  { type: DataTypes.ENUM('all','rank','specific'), defaultValue: 'all' },
  targetRank:{ type: DataTypes.STRING(60), allowNull: true },
  imageUrl:  { type: DataTypes.STRING(500), allowNull: true },
  linkUrl:   { type: DataTypes.STRING(500), allowNull: true },
  isPinned:  { type: DataTypes.BOOLEAN, defaultValue: false },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  viewCount: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
}, {
  tableName: 'announcements',
  indexes: [{ fields: ['tenantId', 'isActive'] }, { fields: ['tenantId', 'createdAt'] }],
});

module.exports = Announcement;
