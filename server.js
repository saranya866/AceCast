const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
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
const otpStore = new Map(); 

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
const GOOGLE_CLIENT_ID = '33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Email configuration using Ethereal (free testing) or your email service
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Reads from Render environment
    pass: process.env.EMAIL_PASS   // Reads from Render environment
  }
});

//==== BREACHED PASSWORD CHECK ==========
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

async function verifyModalOTP() {
  const cells = document.querySelectorAll('#modal-otp-row .otp-cell');
  let otp = '';
  cells.forEach(cell => { otp += cell.value; });
  
  console.log('Verifying OTP:', otp);
  console.log('Token exists:', !!window._verifyToken);
  
  if (otp.length < 6) {
    toast('Please enter all 6 digits', 'error');
    return;
  }
  
  const verifyBtn = document.getElementById('modal-verify-btn');
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
  }
  
  try {
    const response = await fetch(`${API_BASE}/verify-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window._verifyToken}`
      },
      body: JSON.stringify({ otp: otp })
    });
    
    const data = await response.json();
    
    console.log('Verify response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }
    
    toast('Email verified successfully! 🎉', 'success');
    
    // Update session
    const session = JSON.parse(localStorage.getItem('if_session') || '{}');
    if (session.user) {
      session.user.email_verified = true;
      localStorage.setItem('if_session', JSON.stringify(session));
      if (window.currentUser) window.currentUser.email_verified = true;
    }
    
    // Close modal
    const modal = document.getElementById('otp-modal');
    if (modal) modal.style.display = 'none';
    
    // Refresh settings page
    const main = document.getElementById('app-main');
    if (main && main.innerHTML.includes('Email Verification')) {
      renderSettings(main);
    }
    
  } catch (err) {
    console.error('Verify error:', err);
    toast(err.message, 'error');
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Continue →';
    }
  }
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
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token: ' + err.message });
    }
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

// ========== REGISTER (Manual Email/Password only) ==========
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    // Check if user exists
    const [existing] = await pool.query('SELECT id, email, password_hash, google_id FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (existing.length > 0) {
      const existingUser = existing[0];
      
      // If user has google_id (Google user)
      if (existingUser.google_id && existingUser.google_id !== null) {
        return res.status(400).json({ 
          error: '❌ This email is linked to Google Sign-In. Please use "Continue with Google" to login.',
          code: 'GOOGLE_USER'
        });
      }
      
      // If user exists but has no password (OTP user) - convert them
      if (!existingUser.password_hash || existingUser.password_hash === '') {
        const hash = await bcrypt.hash(password, 12);
        await pool.query(
          'UPDATE users SET password_hash = ?, name = ?, role = ? WHERE email = ?',
          [hash, name, role || 'Student', email.toLowerCase()]
        );
        
        const [updatedUser] = await pool.query(
          'SELECT id, name, email, role, xp, streak, level, questions_answered FROM users WHERE email = ?',
          [email.toLowerCase()]
        );
        
        const user = updatedUser[0];
        user.initial = user.name[0].toUpperCase();
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        console.log(`✅ OTP user converted to email/password: ${email}`);
        return res.json({ user, token });
      }
      
      // User exists with password
      return res.status(400).json({ 
        error: '❌ Email already registered. Please login instead.',
        code: 'ALREADY_REGISTERED'
      });
    }
    
    // Create new manual user
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, xp, streak, level, password_last_changed, created_at) 
       VALUES (?, ?, ?, ?, 50, 1, 'Novice', NOW(), NOW())`,
      [name, email.toLowerCase(), hash, role || 'Student']
    );
    
    const user = {
      id: result.insertId,
      name: name,
      email: email.toLowerCase(),
      role: role || 'Student',
      xp: 50,
      streak: 1,
      level: 'Novice',
      questions_answered: 0
    };
    
    user.initial = user.name[0].toUpperCase();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log(`✅ New manual user registered: ${email}`);
    res.json({ user, token });
    
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed: ' + e.message });
  }
});
// ========== LOGIN (Only for email/password registered users) ==========
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Get user from database
    const [users] = await pool.query(
      `SELECT id, name, email, role, xp, streak, level, questions_answered, 
       average_score, password_hash, created_at, google_id 
       FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    
     // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({ 
        error: '❌ No account found with this email. Please REGISTER first.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = users[0];
    
    // Block Google users
    if (user.google_id && user.google_id !== null) {
      return res.status(401).json({ 
        error: '🔐 This email is linked to Google Sign-In. Please click "Continue with Google" button above.',
        code: 'USE_GOOGLE_LOGIN'
      });
    }
    
    // Block OTP users (no password)
    if (!user.password_hash || user.password_hash === '') {
      return res.status(401).json({ 
        error: '📱 This email uses OTP Login. Please click "Login with OTP Email" button below.',
        code: 'USE_OTP_LOGIN'
      });
    }
    
      // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        error: '❌ Incorrect password. Please try again or click "Forgot Password".',
        code: 'WRONG_PASSWORD'
      });
    }
    // After password is verified, check if 2FA is enabled
if (user.two_fa_enabled) {
  return res.json({ 
    requires2FA: true, 
    userId: user.id,
    message: '2FA code required' 
  });
}
    
    // Update last login
   await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    
    // Remove sensitive data
    const { password_hash, google_id, ...userData } = user;
    userData.initial = userData.name[0].toUpperCase();
    
    // Generate token
    const token = jwt.sign(
      { id: userData.id, email: userData.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log(`✅ Email login: ${email} (manual registration)`);
    res.json({ user: userData, token });
    
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed: ' + e.message });
  }
});

// ========== GOOGLE SIGN-IN ==========
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, email_verified, sub: google_id } = payload;
    
    console.log(`👤 Google user attempt: ${email}`);
    
    // Check if user exists in database
    let [users] = await pool.query(
      'SELECT id, name, email, role, xp, streak, level, questions_answered, password_hash FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    let user;
    if (users.length === 0) {
      // USER DOES NOT EXIST - ASK TO REGISTER FIRST
      return res.status(401).json({ 
        error: '❌ No account found with this Google email. Please REGISTER first using email/password, then link Google account.',
        code: 'GOOGLE_USER_NOT_REGISTERED',
        requiresRegistration: true
      });
    }
    
    user = users[0];
    
    // Check if this is a Google user (has google_id) OR regular user
    // If regular user, update with google_id for future logins
    try {
      // Try to update google_id (if column exists)
      await pool.query('UPDATE users SET google_id = ?, picture = ?, last_login = NOW() WHERE id = ?', 
        [google_id, picture || null, user.id]);
    } catch (updateError) {
      console.log('Google columns not available, continuing...');
    }
    
    console.log(`✅ Google user logged in: ${email}`);
    
    user.initial = user.name[0].toUpperCase();
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      user: user,
      token: token
    });
    
  } catch (error) {
    console.error('❌ Google auth error:', error);
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


// ========== SEND OTP WITH RESEND (FINAL WORKING) ==========
app.post('/api/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📧 OTP request for:', email);
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    
    otpStore.set(email, { otp, expires });
    
    console.log(`✅ OTP generated: ${otp}`);
    
    // Try to send email using Resend
    let emailSent = false;
    let errorMessage = null;
    
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      
      if (!RESEND_API_KEY) {
        console.log('❌ RESEND_API_KEY not found in environment!');
        errorMessage = 'API key missing';
      } else {
        console.log('📡 Sending via Resend API...');
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'AceCast <onboarding@resend.dev>',
            to: email,
            subject: '🔐 Your AceCast Login OTP',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #ef4444; text-align: center;">AceCast</h2>
                <h3 style="text-align: center;">Your Login OTP</h3>
                <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="text-align: center; color: #666;">This OTP is valid for <strong>5 minutes</strong>.</p>
                <p style="text-align: center; color: #666;">If you didn't request this, please ignore this email.</p>
                <hr style="margin: 20px 0;">
                <p style="text-align: center; font-size: 12px; color: #999;">AceCast - Ace It. Cast It. Own It.</p>
              </div>
            `
          })
        });
        
        if (response.ok) {
          emailSent = true;
          console.log(`✅ Email sent successfully to ${email}`);
        } else {
          const error = await response.text();
          console.error('Resend API error:', error);
          errorMessage = error;
        }
      }
    } catch (err) {
      console.error('Email send error:', err);
      errorMessage = err.message;
    }
    
    // Always return response
    if (emailSent) {
      res.json({ 
        success: true, 
        message: 'OTP sent to your email! Check inbox/spam.'
      });
    } else {
      // Fallback: Show OTP on screen
      res.json({ 
        success: true, 
        message: `OTP generated (email failed: ${errorMessage})`,
        otp: otp,
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});
// ========== VERIFY OTP ==========
app.post('/api/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log(`🔐 Verifying OTP for ${email}: ${otp}`);
    
    // Check if OTP exists
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
    
    // Find or create user
    let [users] = await pool.query('SELECT id, name, email, role, xp, streak, level, questions_answered FROM users WHERE email = ?', [email.toLowerCase()]);
    
    let user;
    if (users.length === 0) {
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
        questions_answered: 0
      };
      console.log(`✅ New OTP user created: ${email}`);
    } else {
      user = users[0];
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
      console.log(`✅ Existing OTP user logged in: ${email}`);
    }
    
    // Delete used OTP
    otpStore.delete(email);
    
    user.initial = user.name[0].toUpperCase();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log(`✅ Login successful for ${email}`);
    
    res.json({ 
      user: user, 
      token: token 
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP: ' + error.message });
  }
});

// ========== FORGOT PASSWORD - SEND OTP ==========
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`🔐 Forgot password request for: ${email}`);
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' });
    }
    
    const user = users[0];
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    otpStore.set(`reset_${email}`, { otp, expires, userId: user.id });
    
    console.log(`🔐 Password reset OTP for ${email}: ${otp}`);
    
    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;
    
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'AceCast <onboarding@resend.dev>',
            to: email,
            subject: '🔐 Reset Your AceCast Password',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #ef4444; text-align: center;">AceCast</h2>
                <h3 style="text-align: center;">Password Reset OTP</h3>
                <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="text-align: center; color: #666;">Enter this OTP to reset your password.</p>
                <p style="text-align: center; color: #666;">Valid for <strong>5 minutes</strong>.</p>
                <p style="text-align: center; color: #666;">If you didn't request this, please ignore this email.</p>
              </div>
            `
          })
        });
        emailSent = true;
        console.log(`✅ Password reset email sent to ${email}`);
      } catch (err) {
        console.error('Resend error:', err);
      }
    }
    
    res.json({ 
      success: true, 
      message: emailSent ? 'Password reset OTP sent to your email!' : 'OTP generated',
      debug_otp: emailSent ? undefined : otp
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
    
    console.log(`🔐 Verifying reset OTP for ${email}: ${otp}`);
    
    const stored = otpStore.get(`reset_${email}`);
    
    if (!stored) {
      return res.status(400).json({ error: 'No OTP requested. Please request a new one.' });
    }
    
    if (Date.now() > stored.expires) {
      otpStore.delete(`reset_${email}`);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Store verified status
    otpStore.set(`verified_${email}`, { userId: stored.userId, expires: Date.now() + 10 * 60 * 1000 });
    
    res.json({ success: true, message: 'OTP verified. You can now reset your password.' });
    
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ========== RESET PASSWORD ==========
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    
    console.log(`🔐 Resetting password for ${email}`);
    
    // Check if OTP was verified
    const verified = otpStore.get(`verified_${email}`);
    
    if (!verified) {
      return res.status(400).json({ error: 'Please verify OTP first.' });
    }
    
    if (Date.now() > verified.expires) {
      otpStore.delete(`verified_${email}`);
      return res.status(400).json({ error: 'Verification expired. Please request a new OTP.' });
    }
    
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
    
    // Hash new password
    const hash = await bcrypt.hash(new_password, 12);
    
    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = ?, password_last_changed = NOW() WHERE email = ?',
      [hash, email.toLowerCase()]
    );
    
    // Clean up OTPs
    otpStore.delete(`reset_${email}`);
    otpStore.delete(`verified_${email}`);
    
    console.log(`✅ Password reset successful for ${email}`);
    
    res.json({ success: true, message: 'Password reset successful! Please login with your new password.' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});
// ========== PROPER 2FA SETUP ==========
app.post('/api/setup-2fa', authenticateToken, async (req, res) => {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `AceCast:${req.user.email}`
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    // Store temp secret in memory (will be verified before saving)
    otpStore.set(`2fa_temp_${req.user.id}`, {
      secret: secret.base32,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    res.json({
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-2fa-setup', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const tempData = otpStore.get(`2fa_temp_${req.user.id}`);
    
    if (!tempData) {
      return res.status(400).json({ error: '2FA setup expired. Please try again.' });
    }
    
    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: tempData.secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }
    
    // Save 2FA secret to database
    await pool.query(
      'UPDATE users SET two_fa_secret = ?, two_fa_enabled = true WHERE id = ?',
      [tempData.secret, req.user.id]
    );
    
    // Generate recovery codes
    const recoveryCodes = [];
    for (let i = 0; i < 8; i++) {
      recoveryCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    
    // Store recovery codes (hashed)
    const hashedRecoveryCodes = recoveryCodes.map(code => {
      return crypto.createHash('sha256').update(code).digest('hex');
    });
    
    await pool.query(
      'UPDATE users SET recovery_codes = ? WHERE id = ?',
      [JSON.stringify(hashedRecoveryCodes), req.user.id]
    );
    
    // Clean up temp data
    otpStore.delete(`2fa_temp_${req.user.id}`);
    
    res.json({
      success: true,
      recovery_codes: recoveryCodes
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/disable-2fa', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET two_fa_secret = NULL, two_fa_enabled = false, recovery_codes = NULL WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 2FA LOGIN VERIFICATION ==========
app.post('/api/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const [users] = await pool.query(
      'SELECT id, two_fa_secret FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    if (users.length === 0 || !users[0].two_fa_secret) {
      return res.status(400).json({ error: '2FA not enabled for this account' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: users[0].two_fa_secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: users[0].id, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SEND VERIFICATION OTP ==========
app.post('/api/send-verification-otp', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    
    console.log(`📧 Sending verification OTP to: ${email}`);
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Store in otpStore with proper key
    otpStore.set(`verify_${email}`, { otp, expires });
    
    console.log(`✅ Verification OTP generated for ${email}: ${otp}`);
    console.log(`📦 Current OTP store keys:`, Array.from(otpStore.keys()));
    
    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'AceCast <onboarding@resend.dev>',
            to: email,
            subject: '✅ Verify Your AceCast Email',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #ef4444; text-align: center;">AceCast</h2>
                <h3 style="text-align: center;">Email Verification</h3>
                <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="text-align: center; color: #666;">Enter this OTP to verify your email address.</p>
                <p style="text-align: center; color: #666;">Valid for <strong>10 minutes</strong>.</p>
              </div>
            `
          })
        });
        console.log(`✅ Verification email sent to ${email}`);
      } catch (err) {
        console.error('Resend error:', err);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Verification OTP sent to your email!'
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});
// ========== VERIFY EMAIL ==========
app.post('/api/verify-email', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.user.email;
    
    console.log(`🔐 Verifying email for ${email} with OTP: ${otp}`);
    console.log(`📦 Looking for key: verify_${email}`);
    console.log(`📦 Available keys:`, Array.from(otpStore.keys()));
    
    const stored = otpStore.get(`verify_${email}`);
    
    if (!stored) {
      return res.status(400).json({ error: 'No verification OTP found. Request a new one.' });
    }
    
    console.log(`Stored OTP: ${stored.otp}, Expires: ${new Date(stored.expires)}`);
    
    if (Date.now() > stored.expires) {
      otpStore.delete(`verify_${email}`);
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Update user as verified
    await pool.query('UPDATE users SET email_verified = true WHERE id = ?', [req.user.id]);
    
    // Clean up
    otpStore.delete(`verify_${email}`);
    
    console.log(`✅ Email verified for ${email}`);
    
    res.json({ success: true, message: 'Email verified successfully!' });
    
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// ========== LEADERBOARD ==========
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT id, name, email, xp, streak, level, questions_answered
       FROM users 
       WHERE name IS NOT NULL 
         AND name != '' 
         AND email IS NOT NULL 
         AND email != ''
         AND password_hash IS NOT NULL
         AND password_hash != ''
       GROUP BY id
       ORDER BY xp DESC 
       LIMIT 50`
    );
    
    const data = rows.map((r, idx) => ({ 
      ...r, 
      rank: idx + 1, 
      initial: r.name ? r.name[0].toUpperCase() : '?',
      email: r.email ? r.email.substring(0, 3) + '***' : null
    }));
    
    res.json(data);
  } catch (e) {
    console.error('Leaderboard error:', e);
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

// ========== SEND VERIFICATION OTP (after registration) ==========
app.post('/api/send-verification-otp', async (req, res) => {
  try {
    // Get email from request body or from authenticated user
    const { email } = req.body;
    const userEmail = email || (req.user?.email);
    
    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(`verify_${userEmail}`, { otp, expires });
    
    console.log(`📧 Verification OTP for ${userEmail}: ${otp}`);
    
    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;
    
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'AceCast <onboarding@resend.dev>',
            to: userEmail,
            subject: '✅ Verify Your AceCast Email',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #ef4444; text-align: center;">AceCast</h2>
                <h3 style="text-align: center;">Email Verification</h3>
                <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="text-align: center; color: #666;">Enter this OTP to verify your email address.</p>
                <p style="text-align: center; color: #666;">Valid for <strong>10 minutes</strong>.</p>
              </div>
            `
          })
        });
        emailSent = true;
        console.log(`✅ Verification email sent to ${userEmail}`);
      } catch (err) {
        console.error('Resend error:', err);
      }
    }
    
    res.json({ 
      success: true, 
      message: emailSent ? 'Verification OTP sent to your email!' : 'OTP generated',
      debug_otp: emailSent ? undefined : otp
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// ========== VERIFY EMAIL OTP ==========
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log(`🔐 Verifying email for ${email} with OTP: ${otp}`);
    
    const stored = otpStore.get(`verify_${email}`);
    
    if (!stored) {
      return res.status(400).json({ error: 'No verification OTP found. Request a new one.' });
    }
    
    if (Date.now() > stored.expires) {
      otpStore.delete(`verify_${email}`);
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Update user as verified
    await pool.query('UPDATE users SET email_verified = true WHERE email = ?', [email.toLowerCase()]);
    
    // Clean up
    otpStore.delete(`verify_${email}`);
    
    console.log(`✅ Email verified for ${email}`);
    
    res.json({ success: true, message: 'Email verified successfully!' });
    
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
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
