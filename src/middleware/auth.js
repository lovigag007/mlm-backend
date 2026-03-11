const jwt = require('jsonwebtoken');
const { SuperAdmin, Tenant, Member } = require('../models');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ success: false, code: 'NO_TOKEN', message: 'Authentication required' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.role === 'superadmin') {
      req.superAdmin = await SuperAdmin.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (!req.superAdmin || !req.superAdmin.isActive)
        return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Account not found or disabled' });
    } else if (decoded.role === 'tenant') {
      req.tenant = await Tenant.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: ['branding', 'settings'],
      });
      if (!req.tenant || req.tenant.status !== 'active')
        return res.status(401).json({ success: false, code: 'TENANT_INACTIVE', message: 'Account inactive or suspended' });
    } else if (decoded.role === 'member') {
      req.member = await Member.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: ['wallet'],
      });
      req.tenantId = decoded.tenantId;
      if (!req.member || req.member.tenantId !== decoded.tenantId)
        return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid session' });
      if (req.member.status === 'blocked')
        return res.status(403).json({ success: false, code: 'BLOCKED', message: 'Account blocked. Contact support.' });
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Session expired. Please login again.' });
    return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Insufficient permissions' });
  next();
};

const generateToken = (id, role, extra = {}) =>
  jwt.sign({ id, role, ...extra }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

module.exports = { protect, requireRole, generateToken };
