const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const bcrypt = require('bcryptjs');

const Member = sequelize.define('Member', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:     { type: DataTypes.UUID, allowNull: false },
  memberId:     { type: DataTypes.STRING(30), allowNull: false }, // e.g. MBR-00001

  // Identity
  fullName:     { type: DataTypes.STRING(150), allowNull: false },
  email:        { type: DataTypes.STRING(191), allowNull: false },
  password:     { type: DataTypes.STRING(255), allowNull: false },
  phone:        { type: DataTypes.STRING(20), allowNull: true },
  profilePic:   { type: DataTypes.STRING(500), defaultValue: '' },
  dateOfBirth:  { type: DataTypes.DATEONLY, allowNull: true },
  gender:       { type: DataTypes.ENUM('male','female','other','prefer_not_to_say'), allowNull: true },

  // KYC
  kycStatus:    { type: DataTypes.ENUM('not_submitted','pending','approved','rejected'), defaultValue: 'not_submitted' },
  kycDocUrl:    { type: DataTypes.STRING(500), allowNull: true },
  kycNote:      { type: DataTypes.STRING(255), allowNull: true },

  // Status
  status:       { type: DataTypes.ENUM('active','inactive','blocked','pending_approval'), defaultValue: 'active' },
  rank:         { type: DataTypes.STRING(60), defaultValue: 'Associate' },
  rankUpdatedAt:{ type: DataTypes.DATE, allowNull: true },

  // MLM Tree — using Adjacency List (simple, queryable)
  sponsorId:    { type: DataTypes.UUID, allowNull: true },   // Who referred (direct upline in sponsor chain)
  parentId:     { type: DataTypes.UUID, allowNull: true },   // Binary/matrix tree parent
  position:     { type: DataTypes.ENUM('left','right','center'), defaultValue: 'center' },
  depth:        { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },

  // Stats (denormalised for dashboard performance)
  directCount:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  teamSize:     { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  totalPurchase:{ type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  totalEarned:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Referral
  referralCode: { type: DataTypes.STRING(20), allowNull: true },
  joiningDate:  { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },

  lastLogin:    { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'members',
  indexes: [
    { unique: true, fields: ['tenantId', 'email'] },
    { unique: true, fields: ['tenantId', 'memberId'] },
    { unique: true, fields: ['referralCode'] },
    { fields: ['tenantId', 'sponsorId'] },
    { fields: ['tenantId', 'parentId'] },
    { fields: ['tenantId', 'status'] },
  ],
});

Member.beforeSave(async (m) => {
  if (m.changed('password')) m.password = await bcrypt.hash(m.password, 12);
});
Member.prototype.matchPassword = function(pw) { return bcrypt.compare(pw, this.password); };
Member.prototype.toSafeJSON = function() {
  const { password, ...safe } = this.toJSON(); return safe;
};

module.exports = Member;
