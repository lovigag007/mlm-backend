const sequelize = require('../../config/database');
const {
  Tenant, TenantBranding, TenantSettings, Member, MemberWallet,
  IncomePlan, IncomePlanLevel, Transaction, Withdrawal, Product, Order
} = require('../models');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { Op, fn, col, literal } = require('sequelize');
const { distributeROI } = require('../services/commissionService');

exports.register = async (req, res, next) => {
  try {
    const { businessName, ownerName, email, password, phone, subdomain } = req.body;
    const exists = await Tenant.findOne({ where: { [Op.or]: [{ email }, { subdomain }] } });
    if (exists) throw new AppError(
      exists.email === email ? 'Email already registered' : 'Subdomain already taken', 400
    );

    const t = await sequelize.transaction();
    try {
      const tenant = await Tenant.create({ businessName, ownerName, email, password, phone, subdomain }, { transaction: t });
      // Create default branding and settings rows
      await TenantBranding.create({ tenantId: tenant.id }, { transaction: t });
      await TenantSettings.create({ tenantId: tenant.id }, { transaction: t });
      await t.commit();
      res.status(201).json({ success: true, message: 'Registration submitted. Awaiting admin approval.' });
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const tenant = await Tenant.findOne({
      where: { email },
      include: ['branding', 'settings', { association: 'activePlan', include: [{ association: 'levels', order: [['level','ASC']] }] }],
    });
    if (!tenant || !(await tenant.matchPassword(password)))
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (tenant.status !== 'active')
      throw new AppError(`Account is ${tenant.status}. Contact platform support.`, 403, 'ACCOUNT_INACTIVE');

    await tenant.update({ lastLogin: new Date() });
    const token = generateToken(tenant.id, 'tenant');
    const safe = tenant.toSafeJSON();
    res.json({ success: true, token, user: { ...safe, role: 'tenant' } });
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.tenant.id, {
      include: ['branding','settings', { association: 'activePlan', include: ['levels','ranks'] }],
    });
    res.json({ success: true, data: tenant.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const [totalMembers, activeMembers, pendingWithdrawals, totalProducts, totalOrders] = await Promise.all([
      Member.count({ where: { tenantId } }),
      Member.count({ where: { tenantId, status: 'active' } }),
      Withdrawal.count({ where: { tenantId, status: 'pending' } }),
      Product.count({ where: { tenantId, status: 'active' } }),
      Order.count({ where: { tenantId } }),
    ]);
    const recentMembers = await Member.findAll({
      where: { tenantId }, order: [['createdAt','DESC']], limit: 6,
      attributes: ['id','fullName','email','memberId','rank','status','directCount','createdAt'],
    });
    const incomeByType = await Transaction.findAll({
      where: { tenantId },
      attributes: ['type', [fn('SUM', col('amount')), 'total']],
      group: ['type'], raw: true,
    });
    // Monthly income chart (last 6 months)
    const monthlyIncome = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
        amount: { [Op.gt]: 0 },
      },
      attributes: [
        [fn('YEAR', col('createdAt')), 'year'],
        [fn('MONTH', col('createdAt')), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      group: [literal('YEAR(createdAt)'), literal('MONTH(createdAt)')],
      order: [[literal('YEAR(createdAt)'), 'ASC'], [literal('MONTH(createdAt)'), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: {
      stats: { totalMembers, activeMembers, pendingWithdrawals, totalProducts, totalOrders },
      recentMembers, incomeByType, monthlyIncome,
    }});
  } catch (err) { next(err); }
};

exports.updateBranding = async (req, res, next) => {
  try {
    const [branding] = await TenantBranding.findOrCreate({ where: { tenantId: req.tenant.id } });
    await branding.update(req.body);
    res.json({ success: true, data: branding });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const [settings] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenant.id } });
    await settings.update(req.body);
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
};

exports.getMembers = async (req, res, next) => {
  try {
    const { status, kycStatus, search, page = 1, limit = 20, sortBy = 'createdAt', order = 'DESC' } = req.query;
    const where = { tenantId: req.tenant.id };
    if (status) where.status = status;
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) where[Op.or] = [
      { fullName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { memberId: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await Member.findAndCountAll({
      where,
      include: [
        { association: 'sponsor', attributes: ['fullName','memberId'], required: false },
        { association: 'wallet', attributes: ['incomeBalance','shoppingBalance','totalEarned'], required: false },
      ],
      order: [[sortBy, order]],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows.map(m => m.toSafeJSON()),
      pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.getMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({
      where: { id: req.params.id, tenantId: req.tenant.id },
      include: ['sponsor','wallet','bankAccounts'],
    });
    if (!member) throw new AppError('Member not found', 404);
    const [directCount, recentTransactions] = await Promise.all([
      Member.count({ where: { tenantId: req.tenant.id, sponsorId: req.params.id } }),
      Transaction.findAll({ where: { memberId: req.params.id }, order: [['createdAt','DESC']], limit: 10 }),
    ]);
    res.json({ success: true, data: { ...member.toSafeJSON(), directCount, recentTransactions } });
  } catch (err) { next(err); }
};

exports.updateMemberStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const member = await Member.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!member) throw new AppError('Member not found', 404);
    await member.update({ status });
    res.json({ success: true, data: member.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getMemberTree = async (req, res, next) => {
  try {
    const buildTree = async (memberId, depth = 0) => {
      if (depth > 5) return null;
      const m = await Member.findOne({
        where: { id: memberId, tenantId: req.tenant.id },
        attributes: ['id','fullName','memberId','rank','status','directCount','teamSize','totalEarned'],
      });
      if (!m) return null;
      const children = await Member.findAll({ where: { parentId: memberId }, attributes: ['id'] });
      return { ...m.toJSON(), children: (await Promise.all(children.map(c => buildTree(c.id, depth + 1)))).filter(Boolean) };
    };
    const tree = await buildTree(req.params.id);
    res.json({ success: true, data: tree });
  } catch (err) { next(err); }
};

exports.getWithdrawals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenant.id };
    if (status) where.status = status;
    const { count, rows } = await Withdrawal.findAndCountAll({
      where,
      include: [{ association: 'member', attributes: ['fullName','memberId','email','phone'], required: false }],
      order: [['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.processWithdrawal = async (req, res, next) => {
  try {
    const { status, adminNote, paymentRef } = req.body;
    const withdrawal = await Withdrawal.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!withdrawal) throw new AppError('Withdrawal not found', 404);
    if (!['approved','rejected','paid'].includes(status))
      throw new AppError('Invalid status', 400);

    await withdrawal.update({ status, adminNote, paymentRef, processedAt: new Date(), processedBy: req.tenant.id,
      ...(status === 'paid' ? { paidAt: new Date() } : {}) });
    res.json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
};

exports.getIncomeReports = async (req, res, next) => {
  try {
    const { from, to, memberId } = req.query;
    const where = { tenantId: req.tenant.id, amount: { [Op.gt]: 0 } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to);
    }
    if (memberId) where.memberId = memberId;

    const summary = await Transaction.findAll({
      where,
      attributes: ['type', [fn('SUM',col('amount')),'total'], [fn('COUNT',col('id')),'count']],
      group: ['type'], raw: true,
    });
    const monthly = await Transaction.findAll({
      where,
      attributes: [[fn('YEAR',col('createdAt')),'year'],[fn('MONTH',col('createdAt')),'month'],'type',[fn('SUM',col('amount')),'total']],
      group: [literal('YEAR(createdAt)'), literal('MONTH(createdAt)'), 'type'],
      order: [[literal('YEAR(createdAt)'),'DESC'], [literal('MONTH(createdAt)'),'DESC']],
      raw: true,
    });
    res.json({ success: true, data: { summary, monthly } });
  } catch (err) { next(err); }
};

// ── Income Plan for this tenant ───────────────────────────────
exports.selectIncomePlan = async (req, res, next) => {
  try {
    const { templatePlanId, customise } = req.body;
    const template = await IncomePlan.findOne({
      where: { id: templatePlanId, isTemplate: true },
      include: [{ association: 'levels' }],
    });
    if (!template) throw new AppError('Plan template not found', 404);

    const t = await sequelize.transaction();
    try {
      // Clone plan for this tenant
      const { id, createdAt, updatedAt, isTemplate, tenantId: _, levels, ...planData } = template.toJSON();
      const tenantPlan = await IncomePlan.create({
        ...planData, ...(customise || {}),
        isTemplate: false, tenantId: req.tenant.id,
      }, { transaction: t });

      // Clone levels
      if (levels?.length > 0) {
        await IncomePlanLevel.bulkCreate(
          levels.map(l => ({ ...l, id: undefined, planId: tenantPlan.id })),
          { transaction: t }
        );
      }

      // Set as active plan
      await req.tenant.update({ activePlanId: tenantPlan.id }, { transaction: t });
      await t.commit();

      const full = await IncomePlan.findByPk(tenantPlan.id, { include: ['levels'] });
      res.status(201).json({ success: true, data: full });
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.distributeIncome = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({
      where: { tenantId: req.tenant.id, isActive: true, isTemplate: false },
    });
    if (!plan) throw new AppError('No active income plan configured', 400);
    const result = await distributeROI(plan, req.tenant.id);
    res.json({ success: true, data: result, message: `Distributed ₹${result.distributed.toFixed(2)} to ${result.count} members` });
  } catch (err) { next(err); }
};

// ── Tenant-accessible: view plan templates (read-only) ────────
exports.getAvailablePlanTemplates = async (req, res, next) => {
  try {
    const plans = await IncomePlan.findAll({
      where: { isTemplate: true, isActive: true },
      include: [
        { association: 'levels', order: [['level', 'ASC']], required: false },
        { association: 'ranks', required: false },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
};
