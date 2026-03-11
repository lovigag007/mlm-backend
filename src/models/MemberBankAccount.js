const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const MemberBankAccount = sequelize.define('MemberBankAccount', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  memberId:      { type: DataTypes.UUID, allowNull: false },
  tenantId:      { type: DataTypes.UUID, allowNull: false },

  accountHolder: { type: DataTypes.STRING(150), allowNull: false },
  bankName:      { type: DataTypes.STRING(100), allowNull: false },
  accountNumber: { type: DataTypes.STRING(30), allowNull: false },
  ifscCode:      { type: DataTypes.STRING(20), allowNull: false },
  branchName:    { type: DataTypes.STRING(100), allowNull: true },
  accountType:   { type: DataTypes.ENUM('savings','current'), defaultValue: 'savings' },
  upiId:         { type: DataTypes.STRING(100), allowNull: true },
  isPrimary:     { type: DataTypes.BOOLEAN, defaultValue: true },
  isVerified:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'member_bank_accounts',
  indexes: [
    { fields: ['memberId'] },
    { fields: ['tenantId', 'memberId'] },
  ],
});

module.exports = MemberBankAccount;
