const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const googleClient = new OAuth2Client('33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com');

// In-memory storage (for testing - will work without MongoDB)
let users = [];
let nextId = 1;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running!' });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: nextId++,
      email,
      password: hashedPassword,
      name,
      role: role || 'Student',
      xp: 0,
      streak: 0,
      level: 'Novice',
      questions_answered: 0,
      created_at: new Date().toISOString()
    };
    
    users.push(user);
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level
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
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google Auth (FIXED - returns JSON, not HTML)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    console.log('Received Google credential:', credential ? 'Yes' : 'No');
    
    // For testing without valid token
    if (!credential || credential === 'test') {
      // Return mock response for testing
      return res.json({
        token: 'test_token_' + Date.now(),
        user: {
          id: 999,
          email: 'test@example.com',
          name: 'Test User',
          xp: 100,
          streak: 1,
          level: 'Novice'
        }
      });
    }
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: '33094377002-1mjjld2nn5ng96sfk2almb4os9e2rdoh.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    
    let user = users.find(u => u.email === email);
    
    if (!user) {
      user = {
        id: nextId++,
        email,
        name: name || email.split('@')[0],
        googleId,
        xp: 0,
        streak: 0,
        level: 'Novice',
        questions_answered: 0,
        created_at: new Date().toISOString()
      };
      users.push(user);
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: user.level
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error.message);
    // Return JSON error, not HTML
    res.status(400).json({ error: 'Google authentication failed: ' + error.message });
  }
});

// Get questions
app.get('/api/questions', (req, res) => {
  const questions = [
    { id: 1, text: "What is the difference between == and .equals() in Java?", category: "Java", difficulty: "Medium", model_answer: "== compares references, .equals() compares content.", xp_reward: 10 },
    { id: 2, text: "What is a deadlock?", category: "OS", difficulty: "Medium", model_answer: "Two or more processes waiting indefinitely for resources held by each other.", xp_reward: 10 },
    { id: 3, text: "What is Big O notation?", category: "DSA", difficulty: "Easy", model_answer: "Describes algorithm complexity as input size grows.", xp_reward: 10 }
  ];
  res.json(questions);
});

// Update XP
app.post('/api/xp', (req, res) => {
  const { amount } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    
    if (user) {
      user.xp += amount;
      user.questions_answered += 1;
      
      if (user.xp >= 15000) user.level = 'Grandmaster';
      else if (user.xp >= 7500) user.level = 'Master';
      else if (user.xp >= 3500) user.level = 'Expert';
      else if (user.xp >= 1500) user.level = 'Practitioner';
      else if (user.xp >= 500) user.level = 'Apprentice';
      
      res.json({ xp: user.xp, level: user.level });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const sorted = [...users].sort((a, b) => b.xp - a.xp).slice(0, 50);
  res.json(sorted.map(u => ({
    name: u.name,
    email: u.email,
    xp: u.xp,
    streak: u.streak,
    level: u.level,
    questions_answered: u.questions_answered
  })));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
