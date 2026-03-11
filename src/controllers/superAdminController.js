const { SuperAdmin, Tenant, TenantBranding, TenantSettings, Member, IncomePlan, IncomePlanLevel, Transaction } = require('../models');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { Op, fn, col } = require('sequelize');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ where: { email } });
    if (!admin || !(await admin.matchPassword(password)))
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    await admin.update({ lastLogin: new Date() });
    const token = generateToken(admin.id, 'superadmin');
    res.json({ success: true, token, user: admin.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.superAdmin.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const [total, active, pending, suspended, totalMembers] = await Promise.all([
      Tenant.count(),
      Tenant.count({ where: { status: 'active' } }),
      Tenant.count({ where: { status: 'pending' } }),
      Tenant.count({ where: { status: 'suspended' } }),
      Member.count(),
    ]);
    const recentTenants = await Tenant.findAll({
      order: [['createdAt','DESC']], limit: 8,
      attributes: ['id','businessName','ownerName','email','subdomain','status','subscription','memberCount','createdAt'],
    });
    const recentMembers = await Member.findAll({
      order: [['createdAt','DESC']], limit: 5,
      attributes: ['id','fullName','email','memberId','rank','status','createdAt','tenantId'],
    });
    res.json({ success: true, data: {
      stats: { total, active, pending, suspended, totalMembers },
      recentTenants, recentMembers,
    }});
  } catch (err) { next(err); }
};

exports.getTenants = async (req, res, next) => {
  try {
    const { status, subscription, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (subscription) where.subscription = subscription;
    if (search) where[Op.or] = [
      { businessName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { subdomain: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await Tenant.findAndCountAll({
      where,
      include: [
        { association: 'branding', attributes: ['logoUrl','primaryColor'], required: false },
        { association: 'activePlan', attributes: ['id','name','networkType'], required: false },
      ],
      order: [['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows.map(t => t.toSafeJSON()),
      pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit), limit: Number(limit) } });
  } catch (err) { next(err); }
};

exports.getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id, {
      include: ['branding','settings','activePlan'],
    });
    if (!tenant) throw new AppError('Tenant not found', 404);
    const memberCount = await Member.count({ where: { tenantId: req.params.id } });
    res.json({ success: true, data: { ...tenant.toSafeJSON(), memberCount } });
  } catch (err) { next(err); }
};

exports.updateTenantStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) throw new AppError('Tenant not found', 404);
    const updates = { status };
    if (status === 'active') { updates.approvedAt = new Date(); updates.approvedBy = req.superAdmin.id; }
    await tenant.update(updates);
    res.json({ success: true, data: tenant.toSafeJSON(), message: `Tenant ${status}` });
  } catch (err) { next(err); }
};

// ── Income Plan Templates (SuperAdmin CRUD) ───────────────────
exports.getIncomePlans = async (req, res, next) => {
  try {
    const plans = await IncomePlan.findAll({
      where: { isTemplate: true },
      include: [{ association: 'levels', order: [['level','ASC']] }],
      order: [['createdAt','DESC']],
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
};

exports.getIncomePlan = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({
      where: { id: req.params.id, isTemplate: true },
      include: [{ association: 'levels', order: [['level','ASC']] }, { association: 'ranks' }],
    });
    if (!plan) throw new AppError('Plan not found', 404);
    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
};

exports.createIncomePlan = async (req, res, next) => {
  try {
    const { levels = [], ...planData } = req.body;
    const plan = await IncomePlan.create({ ...planData, isTemplate: true, createdBy: req.superAdmin.id });
    if (levels.length > 0) {
      await IncomePlanLevel.bulkCreate(levels.map((l, i) => ({ ...l, planId: plan.id, level: l.level || (i+1) })));
    }
    const full = await IncomePlan.findByPk(plan.id, { include: [{ association: 'levels' }] });
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
};

exports.updateIncomePlan = async (req, res, next) => {
  try {
    const { levels, ...planData } = req.body;
    const plan = await IncomePlan.findOne({ where: { id: req.params.id, isTemplate: true } });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.update(planData);
    if (levels) {
      await IncomePlanLevel.destroy({ where: { planId: plan.id } });
      if (levels.length > 0) {
        await IncomePlanLevel.bulkCreate(levels.map((l, i) => ({ ...l, planId: plan.id, level: l.level || (i+1) })));
      }
    }
    const full = await IncomePlan.findByPk(plan.id, { include: [{ association: 'levels' }] });
    res.json({ success: true, data: full });
  } catch (err) { next(err); }
};

exports.deleteIncomePlan = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ where: { id: req.params.id, isTemplate: true } });
    if (!plan) throw new AppError('Plan not found', 404);
    const inUse = await Tenant.count({ where: { activePlanId: req.params.id } });
    if (inUse > 0) throw new AppError('Cannot delete plan currently in use by tenants', 409);
    await plan.destroy();
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) { next(err); }
};

exports.getPlatformStats = async (req, res, next) => {
  try {
    const incomeStats = await Transaction.findAll({
      attributes: ['type', [fn('SUM', col('amount')), 'total'], [fn('COUNT', col('id')), 'count']],
      group: ['type'],
      raw: true,
    });
    res.json({ success: true, data: { incomeStats } });
  } catch (err) { next(err); }
};
