const crypto = require('crypto');
const { dbAll, dbGet, dbRun } = require('../db');

// Helper to generate a styled license key
function generateLicenseKey(plan) {
  const prefix = plan.substring(0, 4).toUpperCase();
  const randomHex = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}`;
}

// 1. PUBLIC: Verify License Key (Called by extension)
async function verifyLicense(req, res) {
  const { licenseKey } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required.' });
  }

  try {
    const user = await dbGet("SELECT * FROM users WHERE license_key = ?", [licenseKey.trim()]);
    
    if (!user) {
      await dbRun(
        "INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)",
        ['LICENSE_VERIFY_FAILED', `Invalid license key verification attempt: ${licenseKey}`, ipAddress]
      );
      return res.status(404).json({ valid: false, error: 'License key not found.' });
    }

    // Check status
    if (user.status === 'Suspended') {
      await dbRun(
        "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
        [user.id, 'LICENSE_VERIFY_SUSPENDED', 'Verification attempted on suspended key', ipAddress]
      );
      return res.status(403).json({ valid: false, status: 'Suspended', error: 'License is suspended. Contact support.' });
    }

    if (user.status === 'Revoked') {
      await dbRun(
        "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
        [user.id, 'LICENSE_VERIFY_REVOKED', 'Verification attempted on revoked key', ipAddress]
      );
      return res.status(403).json({ valid: false, status: 'Revoked', error: 'License has been revoked.' });
    }

    // Check expiration
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      const today = new Date();
      if (today > expiryDate) {
        // Automatically mark user status as Active but expired? Or handle expiry in logic
        await dbRun(
          "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
          [user.id, 'LICENSE_VERIFY_EXPIRED', 'Verification attempted on expired key', ipAddress]
        );
        return res.status(403).json({ valid: false, status: 'Expired', error: 'License has expired.' });
      }
    }

    // Valid key
    await dbRun(
      "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [user.id, 'LICENSE_VERIFY_SUCCESS', 'Successful license key verification', ipAddress]
    );

    res.json({
      valid: true,
      licenseKey: user.license_key,
      name: user.name,
      email: user.email,
      plan: user.plan,
      status: user.status,
      expiresAt: user.expires_at
    });
  } catch (err) {
    console.error('License verify error:', err);
    res.status(500).json({ error: 'Internal server error verifying license.' });
  }
}

// 2. ADMIN: Create License Key
async function createLicense(req, res) {
  const { name, email, plan, durationMonths } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!name || !email || !plan) {
    return res.status(400).json({ error: 'Name, email, and plan are required.' });
  }

  try {
    const existingUser = await dbGet("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'A license or user with this email already exists.' });
    }

    const licenseKey = generateLicenseKey(plan);
    
    // Calculate expiration
    let expiresAt = null;
    if (durationMonths && parseInt(durationMonths) > 0) {
      const date = new Date();
      date.setMonth(date.getMonth() + parseInt(durationMonths));
      expiresAt = date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    const result = await dbRun(
      "INSERT INTO users (name, email, role, plan, status, license_key, expires_at) VALUES (?, ?, 'user', ?, 'Active', ?, ?)",
      [name, email.toLowerCase().trim(), plan, licenseKey, expiresAt]
    );

    const newUserId = result.lastID;

    await dbRun(
      "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [req.userId, 'LICENSE_CREATED', `Created ${plan} license key for ${email}. Key: ${licenseKey}`, ipAddress]
    );

    res.status(201).json({
      message: 'License key created successfully.',
      license: {
        id: newUserId,
        name,
        email,
        plan,
        status: 'Active',
        licenseKey,
        expiresAt
      }
    });
  } catch (err) {
    console.error('Create license error:', err);
    res.status(500).json({ error: 'Internal server error creating license.' });
  }
}

// 3. ADMIN: Update/Renew/Modify License
async function updateLicense(req, res) {
  const { id } = req.params;
  const { name, plan, status, expiresAt, extendMonths } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    const user = await dbGet("SELECT * FROM users WHERE id = ? AND role = 'user'", [id]);
    if (!user) {
      return res.status(404).json({ error: 'User/License not found.' });
    }

    let finalExpiresAt = expiresAt !== undefined ? expiresAt : user.expires_at;
    if (extendMonths && parseInt(extendMonths) > 0) {
      const baseDate = user.expires_at ? new Date(user.expires_at) : new Date();
      // Ensure we extend from future date if expiry is in future, otherwise from today
      const today = new Date();
      const start = baseDate > today ? baseDate : today;
      start.setMonth(start.getMonth() + parseInt(extendMonths));
      finalExpiresAt = start.toISOString().split('T')[0];
    }

    const updatedName = name || user.name;
    const updatedPlan = plan || user.plan;
    const updatedStatus = status || user.status;

    await dbRun(
      "UPDATE users SET name = ?, plan = ?, status = ?, expires_at = ? WHERE id = ?",
      [updatedName, updatedPlan, updatedStatus, finalExpiresAt, id]
    );

    const changes = [];
    if (updatedPlan !== user.plan) changes.push(`plan to ${updatedPlan}`);
    if (updatedStatus !== user.status) changes.push(`status to ${updatedStatus}`);
    if (finalExpiresAt !== user.expires_at) changes.push(`expiry to ${finalExpiresAt}`);

    await dbRun(
      "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [req.userId, 'LICENSE_UPDATED', `Updated user ID ${id}: ${changes.join(', ')}`, ipAddress]
    );

    res.json({
      message: 'License updated successfully.',
      license: {
        id: user.id,
        name: updatedName,
        email: user.email,
        plan: updatedPlan,
        status: updatedStatus,
        licenseKey: user.license_key,
        expiresAt: finalExpiresAt
      }
    });
  } catch (err) {
    console.error('Update license error:', err);
    res.status(500).json({ error: 'Internal server error updating license.' });
  }
}

// 4. ADMIN: Get all licenses/users list
async function listLicenses(req, res) {
  try {
    const licenses = await dbAll(
      "SELECT id, name, email, plan, status, license_key as licenseKey, expires_at as expiresAt, created_at as createdAt FROM users WHERE role = 'user' ORDER BY id DESC"
    );
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error listing licenses.' });
  }
}

// 5. ADMIN: Get Stats & Audit Logs
async function getStats(req, res) {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN plan = 'Free' AND status = 'Active' THEN 1 ELSE 0 END) as freeActive,
        SUM(CASE WHEN plan = 'Premium' AND status = 'Active' THEN 1 ELSE 0 END) as premiumActive,
        SUM(CASE WHEN plan = 'Ultimate' AND status = 'Active' THEN 1 ELSE 0 END) as ultimateActive,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeLicenses
      FROM users WHERE role = 'user'
    `);

    // Calculate revenue estimates: Premium $9.99/mo, Ultimate $19.99/mo
    const monthlyRevenue = (
      (stats.premiumActive || 0) * 9.99 + 
      (stats.ultimateActive || 0) * 19.99
    ).toFixed(2);

    const auditLogs = await dbAll(`
      SELECT a.id, a.action, a.details, a.ip_address as ipAddress, a.timestamp, u.email as userEmail
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.id DESC LIMIT 15
    `);

    res.json({
      totalUsers: stats.totalUsers || 0,
      activeLicenses: stats.activeLicenses || 0,
      premiumActive: stats.premiumActive || 0,
      ultimateActive: stats.ultimateActive || 0,
      monthlyRevenue: parseFloat(monthlyRevenue),
      auditLogs
    });
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Internal server error compiling stats.' });
  }
}

module.exports = {
  verifyLicense,
  createLicense,
  updateLicense,
  listLicenses,
  getStats
};
