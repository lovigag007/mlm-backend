'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../../config/database');

class MemberBankDetail extends Model {}

MemberBankDetail.init({
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  memberId:      { type: DataTypes.UUID, allowNull: false },
  tenantId:      { type: DataTypes.UUID, allowNull: false },

  label:         { type: DataTypes.STRING(60), defaultValue: 'Primary' },
  accountName:   { type: DataTypes.STRING(150), allowNull: true },
  accountNumber: { type: DataTypes.STRING(30),  allowNull: true },
  ifsc:          { type: DataTypes.STRING(20),  allowNull: true },
  bankName:      { type: DataTypes.STRING(100), allowNull: true },
  branchName:    { type: DataTypes.STRING(100), allowNull: true },

  // UPI
  upiId:         { type: DataTypes.STRING(100), allowNull: true },

  isPrimary:     { type: DataTypes.BOOLEAN, defaultValue: true },
  isVerified:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'MemberBankDetail',
  tableName: 'member_bank_details',
  indexes: [{ fields: ['memberId'] }, { fields: ['tenantId'] }],
});

module.exports = MemberBankDetail;
