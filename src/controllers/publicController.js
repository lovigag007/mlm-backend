'use strict';
const { asyncHandler, AppError } = require('../middleware/asyncHandler');
const { Tenant, TenantBranding, TenantSettings } = require('../models');

exports.getTenantBySubdomain = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({
    where: { subdomain: req.params.subdomain, status: 'active' },
    attributes: ['id', 'businessName', 'subdomain'],
    include: [
      { association: 'branding', required: false },
      {
        association: 'settings',
        attributes: ['registrationOpen', 'referralRequired', 'currency', 'currencySymbol'],
        required: false,
      },
    ],
  });
  if (!tenant) throw new AppError('Business not found', 404);
  res.json({ success: true, data: tenant });
});
