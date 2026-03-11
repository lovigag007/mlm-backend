const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Normalised: one row per tenant — operational settings
const TenantSettings = sequelize.define('TenantSettings', {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:            { type: DataTypes.UUID, allowNull: false, unique: true },

  // Registration
  registrationOpen:    { type: DataTypes.BOOLEAN, defaultValue: true },
  referralRequired:    { type: DataTypes.BOOLEAN, defaultValue: false },
  autoApproveMembers:  { type: DataTypes.BOOLEAN, defaultValue: true },

  // KYC
  requireKYC:          { type: DataTypes.BOOLEAN, defaultValue: false },
  kycDocumentsRequired:{ type: DataTypes.STRING(500), defaultValue: 'aadhaar,pan' },

  // Wallet & withdrawal
  walletWithdrawalEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  minWithdrawalAmount:     { type: DataTypes.DECIMAL(12,2), defaultValue: 500.00 },
  maxWithdrawalAmount:     { type: DataTypes.DECIMAL(12,2), defaultValue: 100000.00 },
  withdrawalCooldownDays:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 7 },

  // TDS (India)
  tdsEnabled:          { type: DataTypes.BOOLEAN, defaultValue: false },
  tdsPercentage:       { type: DataTypes.DECIMAL(5,2), defaultValue: 10.00 },
  tdsThreshold:        { type: DataTypes.DECIMAL(12,2), defaultValue: 30000.00 },

  // Communication
  emailNotifications:  { type: DataTypes.BOOLEAN, defaultValue: true },
  smsNotifications:    { type: DataTypes.BOOLEAN, defaultValue: false },

  // Member ID format prefix, e.g. "MBR", "USR"
  memberIdPrefix:      { type: DataTypes.STRING(10), defaultValue: 'MBR' },
  memberIdPadLength:   { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 5 },

  // Currency & locale
  currency:            { type: DataTypes.STRING(5), defaultValue: 'INR' },
  currencySymbol:      { type: DataTypes.STRING(5), defaultValue: '₹' },
  timezone:            { type: DataTypes.STRING(60), defaultValue: 'Asia/Kolkata' },
}, {
  tableName: 'tenant_settings',
  indexes: [{ unique: true, fields: ['tenantId'] }],
});

module.exports = TenantSettings;
