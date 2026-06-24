const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await dbGet("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email.toLowerCase().trim()]);
    if (!user) {
      // Record failed audit log
      await dbRun(
        "INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)",
        ['ADMIN_LOGIN_FAILED', `Failed attempt with email: ${email}`, ipAddress]
      );
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is suspended or revoked.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await dbRun(
        "INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)",
        ['ADMIN_LOGIN_FAILED', `Failed attempt with email: ${email} (incorrect password)`, ipAddress]
      );
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Record success audit log
    await dbRun(
      "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [user.id, 'ADMIN_LOGIN_SUCCESS', 'Successful administrator login', ipAddress]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await dbGet("SELECT id, name, email, role, plan, status, created_at FROM users WHERE id = ?", [req.userId]);
    if (!user) {
      return res.status(444).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error retrieving profile.' });
  }
}

async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new passwords are required.' });
  }

  try {
    const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.userId]);
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await dbRun("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.userId]);

    await dbRun(
      "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [req.userId, 'ADMIN_PASSWORD_CHANGED', 'Administrator changed password', ipAddress]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
}

module.exports = {
  login,
  getProfile,
  changePassword
};
