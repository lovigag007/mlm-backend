const sequelize = require('../../config/database');
const { Product, Order, OrderItem, Member, MemberWallet, TenantSettings } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { processPurchaseCommissions } = require('../services/commissionService');
const { v4: uuidv4 } = require('uuid');

// ── Tenant product management ────────────────────────────────

exports.getProducts = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenant.id };
    if (status) where.status = status;
    if (category) where.category = category;
    const { count, rows } = await Product.findAndCountAll({
      where, order: [['sortOrder','ASC'],['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, tenantId: req.tenant.id });
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!product) throw new AppError('Product not found', 404);
    await product.update(req.body);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!product) throw new AppError('Product not found', 404);
    await product.update({ status: 'inactive' }); // soft delete
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) { next(err); }
};

exports.getProductCategories = async (req, res, next) => {
  try {
    const cats = await Product.findAll({
      where: { tenantId: req.tenant.id },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      raw: true,
    });
    res.json({ success: true, data: cats.map(c => c.category) });
  } catch (err) { next(err); }
};

// ── Member product browsing & purchase ───────────────────────

exports.getMemberProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenantId, status: 'active' };
    if (category) where.category = category;
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await Product.findAndCountAll({
      where, order: [['sortOrder','ASC'],['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.memberPurchase = async (req, res, next) => {
  try {
    const { items, paymentMethod = 'wallet' } = req.body;
    // items: [{ productId, quantity }]
    if (!items || items.length === 0) throw new AppError('No items in order', 400);

    const t = await sequelize.transaction();
    try {
      let totalAmount = 0, totalBV = 0, totalGST = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findOne({
          where: { id: item.productId, tenantId: req.tenantId, status: 'active' }, transaction: t,
        });
        if (!product) throw new AppError(`Product ${item.productId} not found`, 404);
        if (product.stock !== -1 && product.stock < item.quantity)
          throw new AppError(`Insufficient stock for ${product.name}`, 400);

        const lineTotal = parseFloat(product.price) * item.quantity;
        const lineGST = lineTotal * parseFloat(product.gstPercentage || 0) / 100;
        totalAmount += lineTotal;
        totalBV += parseFloat(product.bv) * item.quantity;
        totalGST += lineGST;
        orderItems.push({ product, quantity: item.quantity, unitPrice: product.price, totalPrice: lineTotal });
      }

      // Validate wallet if paying by wallet
      const wallet = await MemberWallet.findOne({ where: { memberId: req.member.id }, transaction: t, lock: true });
      if (paymentMethod === 'wallet' && parseFloat(wallet.shoppingBalance) < totalAmount) {
        throw new AppError('Insufficient shopping wallet balance', 400);
      }

      // Create order
      const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0,4).toUpperCase()}`;
      const order = await Order.create({
        tenantId: req.tenantId, memberId: req.member.id, orderNumber,
        totalAmount, totalBV, gstAmount: totalGST, paymentMethod, paymentStatus: 'paid',
      }, { transaction: t });

      // Create order items + decrement stock
      for (const oi of orderItems) {
        await OrderItem.create({
          orderId: order.id, productId: oi.product.id, productName: oi.product.name,
          quantity: oi.quantity, unitPrice: oi.unitPrice, totalPrice: oi.totalPrice, bv: oi.product.bv,
        }, { transaction: t });
        if (oi.product.stock !== -1) {
          await oi.product.decrement('stock', { by: oi.quantity, transaction: t });
        }
        await oi.product.increment('soldCount', { by: oi.quantity, transaction: t });
      }

      // Debit wallet
      if (paymentMethod === 'wallet') {
        await wallet.decrement({ shoppingBalance: totalAmount, totalDebited: totalAmount }, { transaction: t });
      }

      // Update member's totalPurchase for ROI eligibility
      await Member.increment({ totalPurchase: totalAmount }, { where: { id: req.member.id }, transaction: t });

      await t.commit();

      // Process commissions async (outside main transaction for performance)
      processPurchaseCommissions(order, req.tenantId).catch(err =>
        require('../../config/logger').error(`Commission error for order ${order.id}: ${err.message}`)
      );

      res.status(201).json({ success: true, data: { orderId: order.id, orderNumber, totalAmount } });
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { count, rows } = await Order.findAndCountAll({
      where: { memberId: req.member.id },
      include: [{ association: 'items', include: ['product'] }],
      order: [['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.getTenantOrders = async (req, res, next) => {
  try {
    const { memberId, status, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenant.id };
    if (memberId) where.memberId = memberId;
    if (status) where.status = status;
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [{ association: 'member', attributes: ['fullName','memberId','email'], required: false }],
      order: [['createdAt','DESC']],
      offset: (page - 1) * limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.getMemberProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, tenantId: req.tenantId, status: 'active' } });
    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, memberId: req.member.id },
      include: [{ association: 'items', include: ['product'] }],
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};
