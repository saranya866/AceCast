const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const { OAuth2Client } = require('google-auth-library');
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

// OTP storage for passwordless login
const otpStore = new Map(); // email -> { otp, expires }

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

// ========== GOOGLE SIGN-IN ==========
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client('33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com');

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: '33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;
    
    console.log(`✅ Google login: ${email}`);
    
    // Check if user exists
    let [users] = await pool.query('SELECT id, name, email, role, xp, streak, level, questions_answered, average_score FROM users WHERE email = ?', [email.toLowerCase()]);
    
    let user;
    if (users.length === 0) {
      // Create new user
      const [result] = await pool.query(
        `INSERT INTO users (name, email, role, xp, streak, level, email_verified, created_at) 
         VALUES (?, ?, 'Student', 50, 1, 'Novice', ?, NOW())`,
        [name || email.split('@')[0], email.toLowerCase(), email_verified || false]
      );
      
      user = {
        id: result.insertId,
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        role: 'Student',
        xp: 50,
        streak: 1,
        level: 'Novice',
        questions_answered: 0,
        average_score: 0
      };
    } else {
      user = users[0];
      // Update last login
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    }
    
    user.initial = user.name[0].toUpperCase();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ error: 'Google authentication failed: ' + error.message });
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

// ========== SEND OTP (Passwordless Login) ==========
app.post('/api/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    otpStore.set(email, { otp, expires });
    
    console.log(`📧 OTP for ${email}: ${otp}`);
    
    // For now, return OTP in response (for testing)
    // In production, send via email using nodemailer
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      debug_otp: otp // Remove this in production!
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ========== VERIFY OTP & LOGIN ==========
app.post('/api/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const stored = otpStore.get(email);
    
    if (!stored) {
      return res.status(400).json({ error: 'No OTP requested. Please request a new one.' });
    }
    
    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // OTP verified - find or create user
    let [users] = await pool.query('SELECT id, name, email, role, xp, streak, level, questions_answered, average_score FROM users WHERE email = ?', [email.toLowerCase()]);
    
    let user;
    if (users.length === 0) {
      // Create new user
      const [result] = await pool.query(
        `INSERT INTO users (name, email, role, xp, streak, level, created_at) 
         VALUES (?, ?, 'Student', 50, 1, 'Novice', NOW())`,
        [email.split('@')[0], email.toLowerCase()]
      );
      
      user = {
        id: result.insertId,
        name: email.split('@')[0],
        email: email.toLowerCase(),
        role: 'Student',
        xp: 50,
        streak: 1,
        level: 'Novice',
        questions_answered: 0,
        average_score: 0
      };
    } else {
      user = users[0];
      // Update last login
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    }
    
    // Clean up used OTP
    otpStore.delete(email);
    
    user.initial = user.name[0].toUpperCase();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// ========== FORGOT PASSWORD - SEND OTP ==========
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    
    otpStore.set(`reset_${email}`, { otp, expires });
    
    console.log(`🔐 Password reset OTP for ${email}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      debug_otp: otp // Remove in production
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset OTP' });
  }
});

// ========== VERIFY RESET OTP ==========
app.post('/api/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const stored = otpStore.get(`reset_${email}`);
    
    if (!stored) {
      return res.status(400).json({ error: 'No OTP requested' });
    }
    
    if (Date.now() > stored.expires) {
      otpStore.delete(`reset_${email}`);
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    res.json({ success: true, message: 'OTP verified' });
    
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ========== RESET PASSWORD ==========
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    
    // Validate password strength
    const passwordCheck = validatePasswordStrength(new_password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.errors[0] });
    }
    
    // Check if password is breached
    const isBreached = await isPasswordBreached(new_password);
    if (isBreached) {
      return res.status(400).json({ error: 'This password has been found in data breaches. Please choose another.' });
    }
    
    const hash = await bcrypt.hash(new_password, 12);
    
    await pool.query(
      'UPDATE users SET password_hash = ?, password_last_changed = NOW() WHERE email = ?',
      [hash, email.toLowerCase()]
    );
    
    // Clean up OTP
    otpStore.delete(`reset_${email}`);
    
    res.json({ success: true, message: 'Password reset successful' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
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
