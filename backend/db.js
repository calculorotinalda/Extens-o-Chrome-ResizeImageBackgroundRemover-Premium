const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.json');

// Read current database state
function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], audit_logs: [] }, null, 2));
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database.json, resetting:', err);
    const initial = { users: [], audit_logs: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
}

// Write database state to file
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Helper: matches simple sql statements to JS executions
async function dbGet(sql, params = []) {
  const db = readDB();
  const sqlClean = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT * FROM users WHERE role = 'admin'
  if (sqlClean.includes("SELECT * FROM users WHERE role = 'admin'")) {
    return db.users.find(u => u.role === 'admin');
  }

  // 2. SELECT * FROM users WHERE email = ? AND role = 'admin'
  if (sqlClean.includes("SELECT * FROM users WHERE email = ? AND role = 'admin'")) {
    const email = params[0].toLowerCase().trim();
    return db.users.find(u => u.email.toLowerCase().trim() === email && u.role === 'admin');
  }

  // 3. SELECT id, name, email, role, plan, status, created_at FROM users WHERE id = ?
  if (sqlClean.includes("SELECT id, name, email, role, plan, status, created_at FROM users WHERE id = ?")) {
    const id = parseInt(params[0]);
    return db.users.find(u => u.id === id);
  }

  // 4. SELECT * FROM users WHERE license_key = ?
  if (sqlClean.includes("SELECT * FROM users WHERE license_key = ?")) {
    const key = params[0].trim();
    return db.users.find(u => u.license_key === key);
  }

  // 5. SELECT id FROM users WHERE email = ?
  if (sqlClean.includes("SELECT id FROM users WHERE email = ?")) {
    const email = params[0].toLowerCase().trim();
    return db.users.find(u => u.email.toLowerCase().trim() === email);
  }

  // 6. SELECT * FROM users WHERE id = ? AND role = 'user'
  if (sqlClean.includes("SELECT * FROM users WHERE id = ? AND role = 'user'")) {
    const id = parseInt(params[0]);
    return db.users.find(u => u.id === id && u.role === 'user');
  }

  // 7. General user query (stats aggregate helper)
  if (sqlClean.includes("FROM users WHERE role = 'user'") && sqlClean.includes("COUNT(*)")) {
    const activeUserCount = db.users.filter(u => u.role === 'user').length;
    const freeActive = db.users.filter(u => u.role === 'user' && u.plan === 'Free' && u.status === 'Active').length;
    const premiumActive = db.users.filter(u => u.role === 'user' && u.plan === 'Premium' && u.status === 'Active').length;
    const ultimateActive = db.users.filter(u => u.role === 'user' && u.plan === 'Ultimate' && u.status === 'Active').length;
    const activeLicenses = db.users.filter(u => u.role === 'user' && u.status === 'Active').length;

    return {
      totalUsers: activeUserCount,
      freeActive,
      premiumActive,
      ultimateActive,
      activeLicenses
    };
  }

  console.warn('Unhandled SQL GET Query:', sqlClean);
  return null;
}

async function dbRun(sql, params = []) {
  const db = readDB();
  const sqlClean = sql.replace(/\s+/g, ' ').trim();
  const now = new Date().toISOString();

  // 1. Seed Admin INSERT
  if (sqlClean.startsWith("INSERT INTO users") && sqlClean.includes("admin")) {
    const [name, email, hash, role, plan, status] = params;
    const id = db.users.length + 1;
    const newUser = { id, name, email, password_hash: hash, role, plan, status, created_at: now };
    db.users.push(newUser);
    writeDB(db);
    return { lastID: id };
  }

  // 2. Audit logs general insert
  if (sqlClean.startsWith("INSERT INTO audit_logs")) {
    const id = db.audit_logs.length + 1;
    let userId = null;
    let action = '';
    let details = '';
    let ipAddress = '';

    if (params.length === 3) {
      [action, details, ipAddress] = params;
    } else {
      [userId, action, details, ipAddress] = params;
    }

    const newLog = { id, user_id: userId, action, details, ip_address: ipAddress, timestamp: now };
    db.audit_logs.push(newLog);
    writeDB(db);
    return { lastID: id };
  }

  // 3. Admin change password UPDATE
  if (sqlClean.includes("UPDATE users SET password_hash = ? WHERE id = ?")) {
    const [hash, id] = params;
    const user = db.users.find(u => u.id === parseInt(id));
    if (user) {
      user.password_hash = hash;
      writeDB(db);
      return { changes: 1 };
    }
  }

  // 4. Create license key client insert
  if (sqlClean.startsWith("INSERT INTO users") && sqlClean.includes("license_key")) {
    const [name, email, plan, license_key, expires_at] = params;
    const id = db.users.length + 1;
    const newUser = {
      id, name, email, role: 'user', plan, status: 'Active', license_key, expires_at, created_at: now
    };
    db.users.push(newUser);
    writeDB(db);
    return { lastID: id };
  }

  // 5. Update user plan/expiry/status
  if (sqlClean.includes("UPDATE users SET name = ?, plan = ?, status = ?, expires_at = ? WHERE id = ?")) {
    const [name, plan, status, expires_at, id] = params;
    const user = db.users.find(u => u.id === parseInt(id));
    if (user) {
      user.name = name;
      user.plan = plan;
      user.status = status;
      user.expires_at = expires_at;
      writeDB(db);
      return { changes: 1 };
    }
  }

  // 6. Quick status update
  if (sqlClean.includes("UPDATE users SET name = ?, plan = ?, status = ?") || sqlClean.includes("UPDATE users SET name = ?")) {
    // Controller dynamic helper fields
    // Let's implement broad updates based on params matching structure
    console.log("dbRun Dynamic Update:", sqlClean, params);
  }

  // 7. Change Status quick
  if (sqlClean.includes("UPDATE users SET") && sqlClean.includes("status = ?") && params.length === 2) {
    const [status, id] = params;
    const user = db.users.find(u => u.id === parseInt(id));
    if (user) {
      user.status = status;
      writeDB(db);
      return { changes: 1 };
    }
  }

  console.warn('Unhandled SQL RUN statement:', sqlClean);
  return { changes: 0 };
}

async function dbAll(sql, params = []) {
  const db = readDB();
  const sqlClean = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT all users where role = 'user'
  if (sqlClean.includes("SELECT id, name, email, plan, status, license_key as licenseKey")) {
    return db.users
      .filter(u => u.role === 'user')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        status: u.status,
        licenseKey: u.license_key,
        expiresAt: u.expires_at,
        createdAt: u.created_at
      }))
      .reverse(); // ID DESC
  }

  // 2. Select recent audit logs
  if (sqlClean.includes("SELECT a.id, a.action, a.details, a.ip_address")) {
    return db.audit_logs
      .map(log => {
        const user = db.users.find(u => u.id === log.user_id);
        return {
          id: log.id,
          action: log.action,
          details: log.details,
          ipAddress: log.ip_address,
          timestamp: log.timestamp,
          userEmail: user ? user.email : null
        };
      })
      .reverse() // ID DESC
      .slice(0, 15); // LIMIT 15
  }

  console.warn('Unhandled SQL ALL statement:', sqlClean);
  return [];
}

// DB initializer
async function initDatabase() {
  const db = readDB();
  const adminExists = db.users.find(u => u.role === 'admin');
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin1234', salt);
    const id = db.users.length + 1;
    db.users.push({
      id,
      name: 'System Administrator',
      email: 'admin@premiumresize.com',
      password_hash: hash,
      role: 'admin',
      plan: 'Ultimate',
      status: 'Active',
      created_at: new Date().toISOString()
    });
    writeDB(db);
    console.log('Seeded initial admin user in database.json: admin@premiumresize.com / admin1234');
  }
}

module.exports = {
  dbRun,
  dbAll,
  dbGet,
  initDatabase
};
