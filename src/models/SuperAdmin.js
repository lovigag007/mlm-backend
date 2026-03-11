const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const bcrypt = require('bcryptjs');

const SuperAdmin = sequelize.define('SuperAdmin', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email:     { type: DataTypes.STRING(191), allowNull: false, unique: true, validate: { isEmail: true } },
  password:  { type: DataTypes.STRING(255), allowNull: false },
  name:      { type: DataTypes.STRING(100), defaultValue: 'Super Admin' },
  role:      { type: DataTypes.STRING(30), defaultValue: 'superadmin' },
  isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'super_admins', indexes: [{ unique: true, fields: ['email'] }] });

SuperAdmin.beforeSave(async (admin) => {
  if (admin.changed('password')) admin.password = await bcrypt.hash(admin.password, 12);
});
SuperAdmin.prototype.matchPassword = function(pw) { return bcrypt.compare(pw, this.password); };
SuperAdmin.prototype.toSafeJSON = function() {
  const { password, ...safe } = this.toJSON(); return safe;
};

module.exports = SuperAdmin;
