const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Normalised: one row per tenant — branding & visual config
const TenantBranding = sequelize.define('TenantBranding', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:     { type: DataTypes.UUID, allowNull: false, unique: true },
  logoUrl:      { type: DataTypes.STRING(500), defaultValue: '' },
  faviconUrl:   { type: DataTypes.STRING(500), defaultValue: '' },
  primaryColor: { type: DataTypes.STRING(10), defaultValue: '#6366f1' },
  accentColor:  { type: DataTypes.STRING(10), defaultValue: '#8b5cf6' },
  textColor:    { type: DataTypes.STRING(10), defaultValue: '#1e1e2e' },
  tagline:      { type: DataTypes.STRING(255), defaultValue: '' },
  bannerUrl:    { type: DataTypes.STRING(500), defaultValue: '' },
  footerText:   { type: DataTypes.STRING(255), defaultValue: '' },
  customCss:    { type: DataTypes.TEXT, defaultValue: '' },
}, {
  tableName: 'tenant_brandings',
  indexes: [{ unique: true, fields: ['tenantId'] }],
});

module.exports = TenantBranding;
