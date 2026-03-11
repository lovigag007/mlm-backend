const express   = require('express');
const { body }  = require('express-validator');
const router    = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const validate  = require('../middleware/validate');

const sa   = require('../controllers/superAdminController');
const te   = require('../controllers/tenantController');
const me   = require('../controllers/memberController');
const pr   = require('../controllers/productController');
const kyc  = require('../controllers/kycController');
const sup  = require('../controllers/supportController');
const ann  = require('../controllers/announcementController');

// ── Validators ────────────────────────────────────────────────
const loginV = [body('email').isEmail(), body('password').notEmpty()];
const regMemberV = [
  body('fullName').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('subdomain').trim().notEmpty(),
];
const regTenantV = [
  body('businessName').trim().notEmpty(),
  body('ownerName').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('subdomain').trim().matches(/^[a-z0-9-]+$/),
];

// ══════════════════════════════════════════════════════════════
// PUBLIC
// ══════════════════════════════════════════════════════════════
router.post('/auth/superadmin/login',  loginV,      validate, sa.login);
router.post('/auth/tenant/register',   regTenantV,  validate, te.register);
router.post('/auth/tenant/login',      loginV,      validate, te.login);
router.post('/auth/member/register',   regMemberV,  validate, me.register);
router.post('/auth/member/login',      loginV,      validate, me.login);

router.get('/public/tenant/:subdomain', async (req, res) => {
  try {
    const { Tenant } = require('../models');
    const t = await Tenant.findOne({
      where: { subdomain: req.params.subdomain, status: 'active' },
      include: ['branding'],
      attributes: ['id','businessName','subdomain'],
    });
    if (!t) return res.status(404).json({ success:false, message:'Business not found' });
    res.json({ success:true, data: t });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN
// ══════════════════════════════════════════════════════════════
const SA = [protect, requireRole('superadmin')];
router.get('/superadmin/profile',                   ...SA, sa.getProfile);
router.get('/superadmin/dashboard',                 ...SA, sa.getDashboard);
router.get('/superadmin/stats',                     ...SA, sa.getPlatformStats);
router.get('/superadmin/tenants',                   ...SA, sa.getTenants);
router.get('/superadmin/tenants/:id',               ...SA, sa.getTenant);
router.patch('/superadmin/tenants/:id/status',      ...SA, sa.updateTenantStatus);
router.get('/superadmin/income-plans',              ...SA, sa.getIncomePlans);
router.get('/superadmin/income-plans/:id',          ...SA, sa.getIncomePlan);
router.post('/superadmin/income-plans',             ...SA, sa.createIncomePlan);
router.put('/superadmin/income-plans/:id',          ...SA, sa.updateIncomePlan);
router.delete('/superadmin/income-plans/:id',       ...SA, sa.deleteIncomePlan);

// ══════════════════════════════════════════════════════════════
// TENANT (business owner)
// ══════════════════════════════════════════════════════════════
const TE = [protect, requireRole('tenant')];
router.get('/tenant/profile',                       ...TE, te.getProfile);
router.get('/tenant/dashboard',                     ...TE, te.getDashboard);
router.put('/tenant/branding',                      ...TE, te.updateBranding);
router.put('/tenant/settings',                      ...TE, te.updateSettings);

// Members
router.get('/tenant/members',                       ...TE, te.getMembers);
router.get('/tenant/members/:id',                   ...TE, te.getMember);
router.patch('/tenant/members/:id/status',          ...TE, te.updateMemberStatus);
router.get('/tenant/members/:id/tree',              ...TE, te.getMemberTree);

// Withdrawals
router.get('/tenant/withdrawals',                   ...TE, te.getWithdrawals);
router.patch('/tenant/withdrawals/:id',             ...TE, te.processWithdrawal);

// Income
router.get('/tenant/income/reports',                ...TE, te.getIncomeReports);
// ✅ FIX: Tenant reads plan templates via own authenticated endpoint (no superadmin token needed)
router.get('/tenant/income/plan-templates',         ...TE, te.getAvailablePlanTemplates);
router.post('/tenant/income/select-plan',           ...TE, te.selectIncomePlan);
router.post('/tenant/income/distribute',            ...TE, te.distributeIncome);

// Products & Orders
router.get('/tenant/products/categories',           ...TE, pr.getProductCategories);
router.get('/tenant/products',                      ...TE, pr.getProducts);
router.post('/tenant/products',                     ...TE, pr.createProduct);
router.put('/tenant/products/:id',                  ...TE, pr.updateProduct);
router.delete('/tenant/products/:id',               ...TE, pr.deleteProduct);
router.get('/tenant/orders',                        ...TE, pr.getTenantOrders);

// KYC
router.get('/tenant/kyc',                           ...TE, kyc.getPendingKYC);
router.patch('/tenant/kyc/:id/review',              ...TE, kyc.reviewKYC);

// Support tickets
router.get('/tenant/support',                       ...TE, sup.getTenantTickets);
router.patch('/tenant/support/:id/reply',           ...TE, sup.replyTicket);

// Announcements
router.get('/tenant/announcements',                 ...TE, ann.list);
router.post('/tenant/announcements',                ...TE, ann.create);
router.put('/tenant/announcements/:id',             ...TE, ann.update);
router.delete('/tenant/announcements/:id',          ...TE, ann.deleteAnn);

// ══════════════════════════════════════════════════════════════
// MEMBER
// ══════════════════════════════════════════════════════════════
const ME = [protect, requireRole('member')];
router.get('/member/profile',                       ...ME, me.getProfile);
router.patch('/member/profile',                     ...ME, me.updateProfile);
router.put('/member/password',                      ...ME, me.changePassword);
router.get('/member/dashboard',                     ...ME, me.getDashboard);
router.get('/member/tree',                          ...ME, me.getTree);

// Transactions & Wallet
router.get('/member/transactions',                  ...ME, me.getTransactions);
router.get('/member/wallet',                        ...ME, me.getWallet);

// Withdrawals
router.post('/member/withdrawal',                   ...ME, me.requestWithdrawal);
router.get('/member/withdrawals',                   ...ME, me.getWithdrawals);

// Bank accounts
router.get('/member/bank-accounts',                 ...ME, me.getBankAccounts);
router.post('/member/bank-accounts',                ...ME, me.addBankAccount);
router.put('/member/bank-accounts/:id',             ...ME, me.updateBankAccount);
router.delete('/member/bank-accounts/:id',          ...ME, me.deleteBankAccount);

// Notifications
router.get('/member/notifications',                 ...ME, me.getNotifications);
router.post('/member/notifications/read-all',       ...ME, me.markNotificationsRead);
router.patch('/member/notifications/:id/read',      ...ME, me.markOneRead);

// Products & Shop
router.get('/member/products',                      ...ME, pr.getMemberProducts);
router.get('/member/products/:id',                  ...ME, pr.getMemberProduct);
router.post('/member/purchase',                     ...ME, pr.memberPurchase);
router.get('/member/orders',                        ...ME, pr.getOrders);
router.get('/member/orders/:id',                    ...ME, pr.getOrder);

// KYC
router.get('/member/kyc',                           ...ME, kyc.getMyKYC);
router.post('/member/kyc',                          ...ME, kyc.submitKYC);

// Support
router.get('/member/support',                       ...ME, sup.getMyTickets);
router.post('/member/support',                      ...ME, sup.createTicket);

// Announcements
router.get('/member/announcements',                 ...ME, ann.memberList);

module.exports = router;
