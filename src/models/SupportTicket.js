const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:    { type: DataTypes.UUID, allowNull: false },
  memberId:    { type: DataTypes.UUID, allowNull: false },
  ticketNumber:{ type: DataTypes.STRING(20), allowNull: false },
  subject:     { type: DataTypes.STRING(255), allowNull: false },
  message:     { type: DataTypes.TEXT, allowNull: false },
  category:    { type: DataTypes.ENUM('withdrawal','commission','account','technical','other'), defaultValue: 'other' },
  status:      { type: DataTypes.ENUM('open','in_progress','resolved','closed'), defaultValue: 'open' },
  priority:    { type: DataTypes.ENUM('low','medium','high','urgent'), defaultValue: 'medium' },
  adminReply:  { type: DataTypes.TEXT, allowNull: true },
  resolvedAt:  { type: DataTypes.DATE, allowNull: true },
  resolvedBy:  { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'support_tickets',
  indexes: [
    { unique: true, fields: ['ticketNumber'] },
    { fields: ['tenantId', 'status'] },
    { fields: ['memberId'] },
  ],
});

module.exports = SupportTicket;
