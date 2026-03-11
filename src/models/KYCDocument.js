const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const KYCDocument = sequelize.define('KYCDocument', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  memberId:     { type: DataTypes.UUID, allowNull: false },
  tenantId:     { type: DataTypes.UUID, allowNull: false },
  docType:      { type: DataTypes.ENUM('aadhaar','pan','passport','voter_id','driving_license','bank_statement','other'), allowNull: false },
  docNumber:    { type: DataTypes.STRING(50), allowNull: true },
  docUrl:       { type: DataTypes.STRING(500), allowNull: false },
  backUrl:      { type: DataTypes.STRING(500), allowNull: true },
  status:       { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  reviewNote:   { type: DataTypes.STRING(500), allowNull: true },
  reviewedAt:   { type: DataTypes.DATE, allowNull: true },
  reviewedBy:   { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'kyc_documents',
  indexes: [
    { fields: ['memberId'] },
    { fields: ['tenantId', 'status'] },
  ],
});

module.exports = KYCDocument;
