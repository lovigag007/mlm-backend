const { KYCDocument, Member, Notification } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const notifService = require('../services/notificationService');
const { Op } = require('sequelize');

// ── Member: submit KYC ────────────────────────────────────────
exports.submitKYC = async (req, res, next) => {
  try {
    const { docType, docNumber, docUrl, backUrl } = req.body;
    const doc = await KYCDocument.create({
      memberId: req.member.id, tenantId: req.tenantId,
      docType, docNumber, docUrl, backUrl, status: 'pending',
    });
    // Update member KYC status
    await req.member.update({ kycStatus: 'pending' });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.getMyKYC = async (req, res, next) => {
  try {
    const docs = await KYCDocument.findAll({ where: { memberId: req.member.id }, order: [['createdAt','DESC']] });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
};

// ── Tenant: review KYC ────────────────────────────────────────
exports.getPendingKYC = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const { count, rows } = await KYCDocument.findAndCountAll({
      where: { tenantId: req.tenant.id, status },
      include: [{ association: 'member', attributes: ['fullName','memberId','email','kycStatus'], required: false }],
      order: [['createdAt','ASC']],
      offset: (page-1)*limit, limit: Number(limit),
    });
    res.json({ success: true, data: rows, pagination: { total:count, page:Number(page), pages:Math.ceil(count/limit) } });
  } catch (err) { next(err); }
};

exports.reviewKYC = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved','rejected'].includes(status)) throw new AppError('Invalid status', 400);
    const doc = await KYCDocument.findOne({ where: { id: req.params.id, tenantId: req.tenant.id } });
    if (!doc) throw new AppError('Document not found', 404);
    await doc.update({ status, reviewNote, reviewedAt: new Date(), reviewedBy: req.tenant.id });

    // Update member KYC status
    const allDocs = await KYCDocument.findAll({ where: { memberId: doc.memberId } });
    const allApproved = allDocs.every(d => d.id === doc.id ? status === 'approved' : d.status === 'approved');
    const anyRejected = allDocs.some(d => d.id === doc.id ? status === 'rejected' : d.status === 'rejected');
    const memberKycStatus = allApproved ? 'approved' : anyRejected ? 'rejected' : 'pending';
    await Member.update({ kycStatus: memberKycStatus }, { where: { id: doc.memberId } });

    // Notify member
    await notifService.create(
      req.tenant.id, doc.memberId,
      status === 'approved' ? notifService.TYPES.KYC_APPROVED : notifService.TYPES.KYC_REJECTED,
      status === 'approved' ? '✅ KYC Approved!' : '❌ KYC Document Rejected',
      status === 'approved' ? 'Your KYC document has been verified. You can now make withdrawals.'
        : `Your ${doc.docType} was rejected. Reason: ${reviewNote || 'Please resubmit a clearer document.'}`,
    );

    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};
