const { AuditLog } = require('../models');

const auditLog = (action, entityType) => async (req, res, next) => {
  const original = res.json.bind(res);
  res.json = function(data) {
    if (data?.success !== false) {
      const actor = req.superAdmin || req.tenant || req.member;
      const role = req.user?.role || 'unknown';
      AuditLog.create({
        tenantId: req.tenant?.id || req.tenantId || null,
        actorId: actor?.id || 'system',
        actorRole: role,
        actorEmail: actor?.email || null,
        action,
        entityType,
        entityId: data?.data?.id || req.params?.id || null,
        description: `${action} by ${role}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 255),
      }).catch(() => {}); // fire-and-forget
    }
    return original(data);
  };
  next();
};

module.exports = auditLog;
