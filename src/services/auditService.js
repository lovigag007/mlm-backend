'use strict';
const { AuditLog } = require('../models');
const logger = require('../../config/logger');

const log = async ({ tenantId, actorId, actorRole, action, targetType, targetId,
                     oldValue, newValue, req }) => {
  try {
    await AuditLog.create({
      tenantId, actorId, actorRole, action,
      targetType, targetId, oldValue, newValue,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
};

module.exports = { log };
