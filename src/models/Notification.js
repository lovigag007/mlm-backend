const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Notification = sequelize.define('Notification', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:   { type: DataTypes.UUID, allowNull: false },
  memberId:   { type: DataTypes.UUID, allowNull: false },
  type:       { type: DataTypes.STRING(60), allowNull: false },
  title:      { type: DataTypes.STRING(150), allowNull: false },
  message:    { type: DataTypes.TEXT, allowNull: false },
  isRead:     { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt:     { type: DataTypes.DATE, allowNull: true },
  link:       { type: DataTypes.STRING(255), allowNull: true },
  meta:       { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'notifications',
  indexes: [
    { fields: ['tenantId', 'memberId', 'isRead'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Notification;
