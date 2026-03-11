'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../../config/database');

class MemberKyc extends Model {}

MemberKyc.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  memberId:    { type: DataTypes.UUID, allowNull: false },
  tenantId:    { type: DataTypes.UUID, allowNull: false },

  docType:     { type: DataTypes.ENUM('aadhaar','pan','passport','voter_id','driving_licence'),
                 allowNull: false },
  docNumber:   { type: DataTypes.STRING(50), allowNull: true },
  frontUrl:    { type: DataTypes.STRING(500), allowNull: true },
  backUrl:     { type: DataTypes.STRING(500), allowNull: true },
  selfieUrl:   { type: DataTypes.STRING(500), allowNull: true },

  status:      { type: DataTypes.ENUM('submitted','approved','rejected'), defaultValue: 'submitted' },
  reviewNote:  { type: DataTypes.STRING(500), allowNull: true },
  reviewedBy:  { type: DataTypes.STRING(100), allowNull: true },
  reviewedAt:  { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'MemberKyc',
  tableName: 'member_kyc',
  indexes: [{ fields: ['memberId'] }, { fields: ['tenantId', 'status'] }],
});

module.exports = MemberKyc;
