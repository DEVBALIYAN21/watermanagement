const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors'); // Import CORS

const app = express();
const port = 3000;

// CORS options
const corsOptions = {
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Allow specific origins
  methods: ['GET', 'POST'],
  credentials: true // Allow credentials
};

// Middleware
app.use(cors(corsOptions)); // Enable CORS for specified origins
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: true
}));

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Dev@123',
  database: 'water_usage_tracker'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to database');
});

// Signup Route
app.post('/api/signup', async (req, res) => {
  const { username, password, familySize } = req.body; // Added familySize parameter

  if (!username || !password || !familySize) {
    return res.status(400).json({ message: 'Username, password, and family size are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, password, family_size) VALUES (?, ?, ?)';
    
    db.query(query, [username, hashedPassword, familySize], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Username already exists' });
        }
        return res.status(500).json({ message: 'Error creating user' });
      }
      res.json({ message: 'User created successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (results.length > 0) {
      const comparison = await bcrypt.compare(password, results[0].password);
      if (comparison) {
        req.session.loggedin = true;
        req.session.username = username;
        console.log(username);
        res.json({ message: 'Login successful'  });
      } else {
        res.status(400).json({ message: 'Incorrect password' });
      }
    } else {
      res.status(400).json({ message: 'User not found' });
    }
  });
});

// Logout Route
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Usage Data Route
app.post('/api/usage', (req, res) => {
    console.log(req.session.loggedin);
  if (!req.session.loggedin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { familySize, usage } = req.body;
  const username = req.session.username;
  console.log(username);

  if (!familySize || !usage) {
    return res.status(400).json({ message: 'Family size and usage data are required.' });
  }

  const total = Object.values(usage).reduce((sum, val) => sum + val, 0);
  const date = new Date().toISOString().slice(0, 10);

  const query = 'INSERT INTO usage_data (username, date, family_size, drinking, cooking, bathing, cleaning, laundry, flushes, miscellaneous, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  const values = [username, date, familySize, usage.drinking, usage.cooking, usage.bathing, usage.cleaning, usage.laundry, usage.flushes, usage.miscellaneous, total];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error saving usage data:', err);
      return res.status(500).json({ message: 'Error saving usage data' });
    }
    res.json({ message: 'Usage data saved successfully' });
  });
});

// Average Usage Route
app.get('/api/average', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const username = req.session.username;
  const query = 'SELECT AVG(drinking) as avg_drinking, AVG(cooking) as avg_cooking, AVG(bathing) as avg_bathing, AVG(cleaning) as avg_cleaning, AVG(laundry) as avg_laundry, AVG(flushes) as avg_flushes, AVG(miscellaneous) as avg_miscellaneous, AVG(total) as avg_total FROM usage_data WHERE username = ?';

  db.query(query, [username], (err, result) => {
    if (err) {
      console.error('Error fetching average usage:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(result[0]);
  });
});

// Prediction Route
app.get('/api/predict', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const username = req.session.username;
  const query = 'SELECT drinking, cooking, bathing, cleaning, laundry, flushes, miscellaneous, total FROM usage_data WHERE username = ? ORDER BY date DESC LIMIT 7';

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error fetching prediction data:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    const prediction = results.reduce((acc, curr) => {
      for (let key in curr) {
        acc[key] = (acc[key] || 0) + curr[key];
      }
      return acc;
    }, {});

    for (let key in prediction) {
      prediction[key] = Math.round(prediction[key] / results.length);
    }

    res.json(prediction);
  });
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
