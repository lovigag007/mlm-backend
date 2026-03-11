const { Announcement } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

exports.create = async (req, res, next) => {
  try {
    const ann = await Announcement.create({ ...req.body, tenantId: req.tenant.id });
    res.status(201).json({ success: true, data: ann });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const anns = await Announcement.findAll({
      where: { tenantId: req.tenant.id },
      order: [['isPinned','DESC'], ['createdAt','DESC']],
    });
    res.json({ success: true, data: anns });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const ann = await Announcement.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!ann) throw new AppError('Not found', 404);
    await ann.update(req.body);
    res.json({ success: true, data: ann });
  } catch (err) { next(err); }
};

exports.deleteAnn = async (req, res, next) => {
  try {
    const ann = await Announcement.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!ann) throw new AppError('Not found', 404);
    await ann.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

// ── Member: get announcements ─────────────────────────────────
exports.memberList = async (req, res, next) => {
  try {
    const where = {
      tenantId: req.tenantId, isActive: true,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
    };
    const anns = await Announcement.findAll({ where, order: [['isPinned','DESC'],['createdAt','DESC']], limit: 20 });
    res.json({ success: true, data: anns });
  } catch (err) { next(err); }
};
