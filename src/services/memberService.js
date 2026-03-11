const sequelize = require('../../config/database');
const { Member, MemberWallet, TenantSettings, Tenant } = require('../models');
const { v4: uuidv4 } = require('uuid');

const generateMemberId = async (tenantId, settings) => {
  const prefix = settings?.memberIdPrefix || 'MBR';
  const pad    = settings?.memberIdPadLength || 5;
  const count  = await Member.count({ where: { tenantId } });
  return `${prefix}-${String(count + 1).padStart(pad, '0')}`;
};

const generateReferralCode = () => uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();

/**
 * Create a new member with wallet (atomic).
 */
const createMember = async ({ tenantId, fullName, email, password, phone, referralCode, subdomain }) => {
  const t = await sequelize.transaction();
  try {
    const tenant = await Tenant.findOne({
      where: { subdomain, status: 'active' },
      include: ['settings'],
      transaction: t,
    });
    if (!tenant) throw Object.assign(new Error('Business not found or inactive'), { statusCode: 404 });

    const settings = tenant.settings;
    if (settings && !settings.registrationOpen)
      throw Object.assign(new Error('Registration is currently closed'), { statusCode: 403 });

    // Find sponsor
    let sponsorId = null, parentId = null, depth = 0;
    if (referralCode) {
      const sponsor = await Member.findOne({ where: { tenantId, referralCode, status: 'active' }, transaction: t });
      if (sponsor) {
        sponsorId = sponsor.id;
        parentId  = sponsor.id;
        depth     = sponsor.depth + 1;
        await Member.increment({ directCount: 1, teamSize: 1 }, { where: { id: sponsor.id }, transaction: t });
        // Increment teamSize for all ancestors
        if (sponsor.parentId) {
          await Member.increment({ teamSize: 1 }, { where: { id: sponsor.parentId }, transaction: t });
        }
      } else if (settings?.referralRequired) {
        throw Object.assign(new Error('Valid referral code is required'), { statusCode: 400 });
      }
    }

    const memberId = await generateMemberId(tenantId, settings);
    const member = await Member.create({
      tenantId, memberId, fullName, email, password, phone,
      sponsorId, parentId, depth,
      referralCode: generateReferralCode(),
      status: settings?.autoApproveMembers !== false ? 'active' : 'pending_approval',
    }, { transaction: t });

    // Create wallet
    const wallet = await MemberWallet.create({ memberId: member.id, tenantId }, { transaction: t });

    await Tenant.increment('memberCount', { where: { id: tenantId }, transaction: t });
    await t.commit();

    return { member, wallet };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { createMember, generateMemberId, generateReferralCode };
