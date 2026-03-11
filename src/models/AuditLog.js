const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:    { type: DataTypes.UUID, allowNull: true },
  actorId:     { type: DataTypes.UUID, allowNull: false },
  actorRole:   { type: DataTypes.STRING(30), allowNull: false },
  actorEmail:  { type: DataTypes.STRING(191), allowNull: true },
  action:      { type: DataTypes.STRING(100), allowNull: false },
  entityType:  { type: DataTypes.STRING(60), allowNull: true },
  entityId:    { type: DataTypes.UUID, allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: true },
  oldValues:   { type: DataTypes.JSON, allowNull: true },
  newValues:   { type: DataTypes.JSON, allowNull: true },
  ipAddress:   { type: DataTypes.STRING(45), allowNull: true },
  userAgent:   { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'audit_logs',
  indexes: [
    { fields: ['tenantId', 'actorId'] },
    { fields: ['tenantId', 'action'] },
    { fields: ['createdAt'] },
  ],
  updatedAt: false,
});

module.exports = AuditLog;
