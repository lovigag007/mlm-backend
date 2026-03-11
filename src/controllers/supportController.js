const { SupportTicket } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const genTicketNum = () => `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,5).toUpperCase()}`;

// ── Member ────────────────────────────────────────────────────
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message, category, priority } = req.body;
    const ticket = await SupportTicket.create({
      tenantId: req.tenantId, memberId: req.member.id,
      ticketNumber: genTicketNum(), subject, message, category, priority,
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) { next(err); }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { memberId: req.member.id }, order: [['createdAt','DESC']],
    });
    res.json({ success: true, data: tickets });
  } catch (err) { next(err); }
};

// ── Tenant ────────────────────────────────────────────────────
exports.getTenantTickets = async (req, res, next) => {
  try {
    const { status, priority, page=1, limit=20 } = req.query;
    const where = { tenantId: req.tenant.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [{ association:'member', attributes:['fullName','memberId','email'], required:false }],
      order: [['createdAt','DESC']],
      offset: (page-1)*limit, limit: Number(limit),
    });
    res.json({ success:true, data:rows, pagination:{ total:count, page:Number(page), pages:Math.ceil(count/limit) } });
  } catch (err) { next(err); }
};

exports.replyTicket = async (req, res, next) => {
  try {
    const { adminReply, status } = req.body;
    const ticket = await SupportTicket.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!ticket) throw new AppError('Ticket not found', 404);
    await ticket.update({ adminReply, status: status || 'in_progress',
      ...(status === 'resolved' ? { resolvedAt: new Date(), resolvedBy: req.tenant.id } : {}) });
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
};
