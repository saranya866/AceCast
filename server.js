const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

// ========== BREACHED PASSWORD CHECK ==========
async function isPasswordBreached(password) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    const options = {
      hostname: 'api.pwnedpasswords.com',
      path: `/range/${prefix}`,
      method: 'GET',
      headers: { 'User-Agent': 'AceCast-App' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.includes(suffix)));
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

// ========== PASSWORD VALIDATION ==========
function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 12) errors.push('Password must be at least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Uppercase letter required');
  if (!/[a-z]/.test(password)) errors.push('Lowercase letter required');
  if (!/[0-9]/.test(password)) errors.push('Number required');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Special character required');
  if (/012|123|234|345|456|567|678|789|890/.test(password)) errors.push('No sequential numbers');
  if (/(.)\1{2,}/.test(password)) errors.push('No repeated characters');
  return { valid: errors.length === 0, errors };
}

// ========== RATE LIMITING ==========
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000;

function checkRateLimit(email) {
  const now = Date.now();
  const record = loginAttempts.get(email);
  if (!record) {
    loginAttempts.set(email, { count: 1, lockUntil: null });
    return { allowed: true };
  }
  if (record.lockUntil && now < record.lockUntil) {
    const hoursLeft = Math.ceil((record.lockUntil - now) / (60 * 60 * 1000));
    return { allowed: false, hoursLeft };
  }
  if (record.lockUntil && now >= record.lockUntil) {
    loginAttempts.set(email, { count: 1, lockUntil: null });
    return { allowed: true };
  }
  record.count++;
  if (record.count > MAX_LOGIN_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_DURATION;
    return { allowed: false, hoursLeft: 24 };
  }
  loginAttempts.set(email, record);
  return { allowed: true };
}

function resetRateLimit(email) {
  loginAttempts.delete(email);
}

// ========== PASSWORD EXPIRY ==========
async function checkPasswordExpiry(userId) {
  const [rows] = await pool.query('SELECT password_last_changed FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) return false;
  const lastChanged = new Date(rows[0].password_last_changed);
  const expiryDate = new Date(lastChanged);
  expiryDate.setMonth(expiryDate.getMonth() + 6);
  return new Date() >= expiryDate;
}

// ========== HELPER ==========
function getLevel(xp) {
  if (xp >= 15000) return 'Grandmaster';
  if (xp >= 7500) return 'Master';
  if (xp >= 3500) return 'Expert';
  if (xp >= 1500) return 'Practitioner';
  if (xp >= 500) return 'Apprentice';
  return 'Novice';
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ========== HEALTH CHECK ==========
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== REGISTER ==========
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.errors[0] });
    }
    
    const isBreached = await isPasswordBreached(password);
    if (isBreached) {
      return res.status(400).json({ error: 'This password has been found in data breaches. Please choose another.' });
    }
    
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, xp, streak, level, password_last_changed) 
       VALUES (?, ?, ?, ?, 50, 1, 'Novice', NOW())`,
      [name, email.toLowerCase(), hash, role || 'Undergraduate']
    );
    
    const user = {
      id: result.insertId,
      name: name,
      email: email.toLowerCase(),
      role: role || 'Undergraduate',
      xp: 50,
      streak: 1,
      level: 'Novice',
      questions_answered: 0
    };
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== LOGIN ==========
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Account locked for ${rateCheck.hoursLeft} hours` });
    }
    
    const [users] = await pool.query(
      `SELECT id, name, email, role, xp, streak, level, questions_answered, 
       average_score, password_hash, password_last_changed FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    
    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    resetRateLimit(email);
    
    const passwordExpired = await checkPasswordExpiry(users[0].id);
    if (passwordExpired) {
      const { password_hash, ...user } = users[0];
      user.initial = user.name[0].toUpperCase();
      return res.json({ requiresPasswordChange: true, user });
    }
    
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [users[0].id]);
    
    const { password_hash, ...user } = users[0];
    user.initial = user.name[0].toUpperCase();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== UPDATE PASSWORD ==========
app.post('/api/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    
    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.errors[0] });
    
    const isBreached = await isPasswordBreached(newPassword);
    if (isBreached) return res.status(400).json({ error: 'This password has been found in data breaches. Please choose another.' });
    
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = ?, password_last_changed = NOW() WHERE id = ?', [hash, req.user.id]);
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== LEADERBOARD ==========
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name, email, xp, streak, level FROM users ORDER BY xp DESC LIMIT 50');
    const data = rows.map((r, idx) => ({ ...r, rank: idx + 1, initial: r.name[0].toUpperCase() }));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== ADD XP ==========
app.post('/api/xp', authenticateToken, async (req, res) => {
  try {
    const { amount, questions_delta } = req.body;
    const [user] = await pool.query('SELECT xp, questions_answered FROM users WHERE id = ?', [req.user.id]);
    const newXp = (user[0].xp || 0) + amount;
    const newLevel = getLevel(newXp);
    const newQs = (user[0].questions_answered || 0) + (questions_delta || 0);
    await pool.query('UPDATE users SET xp = ?, level = ?, questions_answered = ? WHERE id = ?', [newXp, newLevel, newQs, req.user.id]);
    res.json({ xp: newXp, level: newLevel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== QUESTIONS ==========
app.get('/api/questions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM questions ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== CODING PROBLEMS ==========
app.get('/api/coding', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coding_problems ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== GAMES ==========
app.get('/api/games', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM games ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
