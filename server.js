const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (your Aiven connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'your-aiven-mongodb-connection-string';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  googleId: { type: String },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  level: { type: String, default: 'Novice' },
  questions_answered: { type: Number, default: 0 },
  email_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  password_changed_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Question Schema
const questionSchema = new mongoose.Schema({
  text: String,
  category: String,
  difficulty: String,
  model_answer: String,
  xp_reward: Number
});

const Question = mongoose.model('Question', questionSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Google OAuth Client
const googleClient = new OAuth2Client('33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com');

// ============ AUTH ENDPOINTS ============

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'Student'
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level,
        questions_answered: user.questions_answered
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level,
        questions_answered: user.questions_answered
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google Auth (THIS IS THE FIXED ENDPOINT)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: '33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, email_verified } = payload;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        email,
        name: name || email.split('@')[0],
        googleId,
        email_verified,
        xp: 0,
        streak: 0,
        level: 'Novice'
      });
      await user.save();
    }
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level,
        questions_answered: user.questions_answered
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ error: 'Google authentication failed: ' + error.message });
  }
});

// Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Update XP
app.post('/api/xp', authenticateToken, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.xp += amount;
    user.questions_answered += 1;
    
    // Update level based on XP
    if (user.xp >= 15000) user.level = 'Grandmaster';
    else if (user.xp >= 7500) user.level = 'Master';
    else if (user.xp >= 3500) user.level = 'Expert';
    else if (user.xp >= 1500) user.level = 'Practitioner';
    else if (user.xp >= 500) user.level = 'Apprentice';
    else user.level = 'Novice';
    
    await user.save();
    
    res.json({ xp: user.xp, level: user.level });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update XP' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email xp streak level questions_answered')
      .sort({ xp: -1 })
      .limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
