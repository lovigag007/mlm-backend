const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const bcrypt = require('bcryptjs');

// Core tenant / business owner account
const Tenant = sequelize.define('Tenant', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessName: { type: DataTypes.STRING(150), allowNull: false },
  ownerName:    { type: DataTypes.STRING(100), allowNull: false },
  email:        { type: DataTypes.STRING(191), allowNull: false, unique: true, validate: { isEmail: true } },
  password:     { type: DataTypes.STRING(255), allowNull: false },
  phone:        { type: DataTypes.STRING(20), allowNull: true },
  subdomain:    { type: DataTypes.STRING(80), allowNull: false, unique: true },

  // Status & subscription
  status:       { type: DataTypes.ENUM('pending','active','suspended','cancelled'), defaultValue: 'pending' },
  subscription: { type: DataTypes.ENUM('starter','growth','business','enterprise'), defaultValue: 'starter' },
  trialEndsAt:  { type: DataTypes.DATE, allowNull: true },
  setupFeePaid: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Counters (denormalised for performance)
  memberCount:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },

  // Active income plan FK (set after plan is created)
  activePlanId: { type: DataTypes.UUID, allowNull: true },

  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin:   { type: DataTypes.DATE, allowNull: true },
  approvedAt:  { type: DataTypes.DATE, allowNull: true },
  approvedBy:  { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tenants',
  indexes: [
    { unique: true, fields: ['email'] },
    { unique: true, fields: ['subdomain'] },
    { fields: ['status'] },
  ],
});

Tenant.beforeSave(async (t) => {
  if (t.changed('password')) t.password = await bcrypt.hash(t.password, 12);
});
Tenant.prototype.matchPassword = function(pw) { return bcrypt.compare(pw, this.password); };
Tenant.prototype.toSafeJSON = function() {
  const { password, ...safe } = this.toJSON(); return safe;
};

module.exports = Tenant;
