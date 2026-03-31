const sequelize = require('../../config/database');
const { Member, MemberWallet, MemberBankAccount, Tenant, TenantSettings, Transaction, Withdrawal, Notification } = require('../models');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { createMember } = require('../services/memberService');
const walletService = require('../services/walletService');
const { v4: uuidv4 } = require('uuid');

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, referralCode, subdomain } = req.body;
    const tenant = await Tenant.findOne({ where: { subdomain } });
    const { member, wallet } = await createMember({ tenantId: tenant?.id, fullName, email, password, phone, referralCode, subdomain });
    const token = generateToken(member.id, 'member', { tenantId: member.tenantId });
    res.status(201).json({ success: true, token, user: {
      ...member.toSafeJSON(), role: 'member',
      wallet: { incomeBalance: wallet.incomeBalance, shoppingBalance: wallet.shoppingBalance },
      businessName: tenant?.businessName,
    }});
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, subdomain } = req.body;
    const tenant = await Tenant.findOne({ where: { subdomain, status: 'active' } });
    if (!tenant) throw new AppError('Business not found', 404);

    const member = await Member.findOne({
      where: { tenantId: tenant.id, email },
      include: ['wallet'],
    });
    if (!member || !(await member.matchPassword(password)))
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (member.status === 'blocked')
      throw new AppError('Account blocked. Contact your upline or admin.', 403, 'BLOCKED');

    await member.update({ lastLogin: new Date() });
    const token = generateToken(member.id, 'member', { tenantId: tenant.id });
    res.json({ success: true, token, user: {
      ...member.toSafeJSON(), role: 'member',
      wallet: member.wallet,
      businessName: tenant.businessName,
    }});
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const member = await Member.findByPk(req.member.id, {
      include: ['wallet','bankAccounts',{ association:'sponsor', attributes:['fullName','memberId','email'] }],
    });
    res.json({ success: true, data: member.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['fullName','phone','dateOfBirth','gender','profilePic'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    await req.member.update(updates);
    res.json({ success: true, data: req.member.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const [member, recentTransactions, directTeam, pendingWithdrawals] = await Promise.all([
      Member.findByPk(req.member.id, { include: ['wallet','sponsor'] }),
      Transaction.findAll({ where: { memberId: req.member.id }, order: [['createdAt','DESC']], limit: 10 }),
      Member.count({ where: { sponsorId: req.member.id, tenantId: req.tenantId } }),
      Withdrawal.count({ where: { memberId: req.member.id, status: 'pending' } }),
    ]);
    res.json({ success: true, data: {
      member: member.toSafeJSON(),
      recentTransactions, directTeam, pendingWithdrawals,
    }});
  } catch (err) { next(err); }
};

exports.getTree = async (req, res, next) => {
  try {
    const buildTree = async (memberId, depth = 0) => {
      if (depth > 4) return null;
      const m = await Member.findByPk(memberId, {
        attributes: ['id','fullName','memberId','rank','status','directCount','teamSize','totalEarned','referralCode'],
      });
      if (!m) return null;
      const children = await Member.findAll({ where: { parentId: memberId, tenantId: req.tenantId }, attributes: ['id'] });
      return { ...m.toJSON(), children: (await Promise.all(children.map(c => buildTree(c.id, depth + 1)))).filter(Boolean) };
    };
    const tree = await buildTree(req.member.id);
    res.json({ success: true, data: tree });
  } catch (err) { next(err); }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { type, walletType, page = 1, limit = 20, from, to } = req.query;
    const where = { memberId: req.member.id };
    if (type) where.type = type;
    if (walletType) where.walletType = walletType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to);
    }
    const { count, rows } = await Transaction.findAndCountAll({
      where, order: [['createdAt','DESC']], offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, bankAccountId } = req.body;
    const t = await sequelize.transaction();
    try {
      const [settings, wallet] = await Promise.all([
        TenantSettings.findOne({ where: { tenantId: req.tenantId }, transaction: t }),
        MemberWallet.findOne({ where: { memberId: req.member.id }, transaction: t, lock: true }),
      ]);

      if (settings && !settings.walletWithdrawalEnabled)
        throw new AppError('Withdrawals are currently disabled', 403);
      const minAmt = parseFloat(settings?.minWithdrawalAmount || 500);
      const reqAmt = parseFloat(amount);
      if (reqAmt < minAmt) throw new AppError(`Minimum withdrawal is ${settings?.currencySymbol || '₹'}${minAmt}`, 400);
      if (parseFloat(wallet.incomeBalance) < reqAmt) throw new AppError('Insufficient income wallet balance', 400);

      // TDS deduction
      let tdsAmount = 0;
      if (settings?.tdsEnabled) {
        tdsAmount = reqAmt * parseFloat(settings.tdsPercentage || 10) / 100;
      }
      const netPayable = reqAmt - tdsAmount;

      const reqNum = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const withdrawal = await Withdrawal.create({
        tenantId: req.tenantId, memberId: req.member.id, walletId: wallet.id,
        bankAccountId: bankAccountId || null, requestNumber: reqNum,
        requestedAmount: reqAmt, tdsAmount, netPayableAmount: netPayable, status: 'pending',
      }, { transaction: t });

      // Lock funds (move from income to hold)
      await wallet.decrement({ incomeBalance: reqAmt }, { transaction: t });
      await wallet.increment({ holdBalance: reqAmt }, { transaction: t });

      await Transaction.create({
        tenantId: req.tenantId, memberId: req.member.id, walletId: wallet.id,
        type: 'withdrawal', walletType: 'income', amount: -reqAmt,
        balanceBefore: parseFloat(wallet.incomeBalance),
        balanceAfter: parseFloat(wallet.incomeBalance) - reqAmt,
        status: 'pending', description: `Withdrawal request ${reqNum}`,
        reference: withdrawal.id,
      }, { transaction: t });

      await t.commit();
      res.status(201).json({ success: true, data: withdrawal });
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.getWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      where: { memberId: req.member.id },
      order: [['createdAt','DESC']],
    });
    res.json({ success: true, data: withdrawals });
  } catch (err) { next(err); }
};

exports.addBankAccount = async (req, res, next) => {
  try {
    const account = await MemberBankAccount.create({ ...req.body, memberId: req.member.id, tenantId: req.tenantId });
    res.status(201).json({ success: true, data: account });
  } catch (err) { next(err); }
};

exports.getBankAccounts = async (req, res, next) => {
  try {
    const accounts = await MemberBankAccount.findAll({ where: { memberId: req.member.id } });
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
};

exports.deleteBankAccount = async (req, res, next) => {
  try {
    const account = await MemberBankAccount.findOne({ where: { id: req.params.id, memberId: req.member.id } });
    if (!account) throw new AppError('Bank account not found', 404);
    await account.destroy();
    res.json({ success: true, message: 'Bank account removed' });
  } catch (err) { next(err); }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly = false } = req.query;
    const where = { memberId: req.member.id };
    if (unreadOnly === 'true') where.isRead = false;
    const notifications = await Notification.findAll({ where, order: [['createdAt','DESC']], limit: 30 });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

exports.markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.update({ isRead: true, readAt: new Date() }, { where: { memberId: req.member.id, isRead: false } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Both passwords required', 400);
    if (newPassword.length < 6) throw new AppError('New password min 6 chars', 400);
    const member = await Member.findByPk(req.member.id);
    if (!(await member.matchPassword(currentPassword)))
      throw new AppError('Current password incorrect', 400, 'WRONG_PASSWORD');
    await member.update({ password: newPassword });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};

exports.getWallet = async (req, res, next) => {
  try {
    const { MemberWallet } = require('../models');
    const wallet = await MemberWallet.findOne({ where: { memberId: req.member.id } });
    res.json({ success: true, data: wallet });
  } catch (err) { next(err); }
};

exports.updateBankAccount = async (req, res, next) => {
  try {
    const { MemberBankAccount } = require('../models');
    const account = await MemberBankAccount.findOne({ where: { id: req.params.id, memberId: req.member.id } });
    if (!account) throw new AppError('Bank account not found', 404);
    await account.update(req.body);
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
};

exports.markOneRead = async (req, res, next) => {
  try {
    const { Notification } = require('../models');
    await Notification.update({ isRead: true, readAt: new Date() }, { where: { id: req.params.id, memberId: req.member.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
};
