const { Notification } = require('../models');

const create = async (tenantId, memberId, type, title, message, meta = null, link = null) => {
  return Notification.create({ tenantId, memberId, type, title, message, meta, link });
};

const bulkCreate = async (notifications) => {
  return Notification.bulkCreate(notifications, { ignoreDuplicates: true });
};

const TYPES = {
  WELCOME:        'welcome',
  INCOME_CREDIT:  'income_credit',
  WITHDRAWAL_REQ: 'withdrawal_requested',
  WITHDRAWAL_APP: 'withdrawal_approved',
  WITHDRAWAL_REJ: 'withdrawal_rejected',
  KYC_APPROVED:   'kyc_approved',
  KYC_REJECTED:   'kyc_rejected',
  RANK_UPGRADE:   'rank_upgrade',
  NEW_MEMBER:     'new_member_joined',
  ANNOUNCEMENT:   'announcement',
  ORDER_CONFIRM:  'order_confirmed',
};

module.exports = { create, bulkCreate, TYPES };
