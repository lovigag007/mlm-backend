const SuperAdmin        = require('./SuperAdmin');
const Tenant            = require('./Tenant');
const TenantBranding    = require('./TenantBranding');
const TenantSettings    = require('./TenantSettings');
const Member            = require('./Member');
const MemberWallet      = require('./MemberWallet');
const MemberBankAccount = require('./MemberBankAccount');
const IncomePlan        = require('./IncomePlan');
const IncomePlanLevel   = require('./IncomePlanLevel');
const RankConfig        = require('./RankConfig');
const Product           = require('./Product');
const Order             = require('./Order');
const OrderItem         = require('./OrderItem');
const Transaction       = require('./Transaction');
const Withdrawal        = require('./Withdrawal');
const AuditLog          = require('./AuditLog');
const Notification      = require('./Notification');
const KYCDocument       = require('./KYCDocument');
const SupportTicket     = require('./SupportTicket');
const Announcement      = require('./Announcement');

// ── Tenant 1:1 ────────────────────────────────────────────────
Tenant.hasOne(TenantBranding,  { foreignKey:'tenantId', as:'branding',  onDelete:'CASCADE' });
TenantBranding.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });

Tenant.hasOne(TenantSettings,  { foreignKey:'tenantId', as:'settings',  onDelete:'CASCADE' });
TenantSettings.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });

// ── Tenant → Members ─────────────────────────────────────────
Tenant.hasMany(Member,  { foreignKey:'tenantId', as:'members', onDelete:'CASCADE' });
Member.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });

// ── Member 1:1 wallet ────────────────────────────────────────
Member.hasOne(MemberWallet,      { foreignKey:'memberId', as:'wallet',       onDelete:'CASCADE' });
MemberWallet.belongsTo(Member,   { foreignKey:'memberId', as:'member' });

// ── Member → BankAccounts ────────────────────────────────────
Member.hasMany(MemberBankAccount, { foreignKey:'memberId', as:'bankAccounts', onDelete:'CASCADE' });
MemberBankAccount.belongsTo(Member, { foreignKey:'memberId', as:'member' });

// ── MLM self-referential tree ────────────────────────────────
Member.belongsTo(Member, { foreignKey:'sponsorId', as:'sponsor' });
Member.belongsTo(Member, { foreignKey:'parentId',  as:'parent' });
Member.hasMany(Member,   { foreignKey:'parentId',  as:'children' });
Member.hasMany(Member,   { foreignKey:'sponsorId', as:'referrals' });

// ── Tenant → IncomePlan ──────────────────────────────────────
Tenant.hasMany(IncomePlan,   { foreignKey:'tenantId', as:'incomePlans' });
IncomePlan.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });
Tenant.belongsTo(IncomePlan, { foreignKey:'activePlanId', as:'activePlan' });

IncomePlan.hasMany(IncomePlanLevel, { foreignKey:'planId', as:'levels', onDelete:'CASCADE' });
IncomePlanLevel.belongsTo(IncomePlan, { foreignKey:'planId', as:'plan' });

IncomePlan.hasMany(RankConfig, { foreignKey:'planId', as:'ranks', onDelete:'CASCADE' });
RankConfig.belongsTo(IncomePlan, { foreignKey:'planId', as:'plan' });

// ── Tenant → Products ────────────────────────────────────────
Tenant.hasMany(Product,   { foreignKey:'tenantId', as:'products' });
Product.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });

// ── Orders ───────────────────────────────────────────────────
Member.hasMany(Order, { foreignKey:'memberId', as:'orders' });
Order.belongsTo(Member, { foreignKey:'memberId', as:'member' });
Order.hasMany(OrderItem,  { foreignKey:'orderId', as:'items', onDelete:'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey:'orderId', as:'order' });
Product.hasMany(OrderItem, { foreignKey:'productId', as:'orderItems' });
OrderItem.belongsTo(Product, { foreignKey:'productId', as:'product' });

// ── Transactions ─────────────────────────────────────────────
Member.hasMany(Transaction,     { foreignKey:'memberId', as:'transactions' });
Transaction.belongsTo(Member,   { foreignKey:'memberId', as:'member' });
MemberWallet.hasMany(Transaction, { foreignKey:'walletId', as:'transactions' });
Transaction.belongsTo(MemberWallet, { foreignKey:'walletId', as:'wallet' });
Order.hasMany(Transaction, { foreignKey:'orderId', as:'transactions' });

// ── Withdrawals ──────────────────────────────────────────────
Member.hasMany(Withdrawal,        { foreignKey:'memberId',    as:'withdrawals' });
Withdrawal.belongsTo(Member,      { foreignKey:'memberId',    as:'member' });
MemberWallet.hasMany(Withdrawal,  { foreignKey:'walletId',    as:'withdrawals' });
MemberBankAccount.hasMany(Withdrawal, { foreignKey:'bankAccountId', as:'withdrawals' });
Withdrawal.belongsTo(MemberBankAccount, { foreignKey:'bankAccountId', as:'bankAccount' });

// ── KYC ──────────────────────────────────────────────────────
Member.hasMany(KYCDocument,   { foreignKey:'memberId', as:'kycDocuments', onDelete:'CASCADE' });
KYCDocument.belongsTo(Member, { foreignKey:'memberId', as:'member' });

// ── Support Tickets ──────────────────────────────────────────
Member.hasMany(SupportTicket,   { foreignKey:'memberId', as:'tickets' });
SupportTicket.belongsTo(Member, { foreignKey:'memberId', as:'member' });

// ── Announcements ─────────────────────────────────────────────
Tenant.hasMany(Announcement,   { foreignKey:'tenantId', as:'announcements', onDelete:'CASCADE' });
Announcement.belongsTo(Tenant, { foreignKey:'tenantId', as:'tenant' });

// ── Notifications ────────────────────────────────────────────
Member.hasMany(Notification,   { foreignKey:'memberId', as:'notifications' });
Notification.belongsTo(Member, { foreignKey:'memberId', as:'member' });

module.exports = {
  SuperAdmin, Tenant, TenantBranding, TenantSettings,
  Member, MemberWallet, MemberBankAccount,
  IncomePlan, IncomePlanLevel, RankConfig,
  Product, Order, OrderItem,
  Transaction, Withdrawal,
  AuditLog, Notification, KYCDocument, SupportTicket, Announcement,
};
