const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-prod';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Client ID from Google Cloud Console

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Keep high limit for now if base64 is still sent, but we prefer multer
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT '',
      display_name TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      semester TEXT DEFAULT '',
      department TEXT DEFAULT '',
      profile_setup_complete BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Posts table
        db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image TEXT NOT NULL,
      caption TEXT DEFAULT '',
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      pinned BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        // Likes table
        db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      UNIQUE(user_id, post_id)
    )`);

        // Comments table
        db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    )`);

        // Follows table
        db.run(`CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(follower_id, following_id)
    )`);

        // Notifications table
        db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      from_user_id INTEGER NOT NULL,
      post_id INTEGER,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    )`);

        // Conversations table
        db.run(`CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant1_id INTEGER NOT NULL,
      participant2_id INTEGER NOT NULL,
      last_message_id INTEGER,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant1_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (participant2_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(participant1_id, participant2_id),
      CHECK (participant1_id != participant2_id)
    )`);

        // Messages table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      media_url TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
      CHECK (message_type IN ('text', 'image', 'video'))
    )`);

        console.log('Database tables initialized.');
    });
}

// Google Auth Client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: Upsert User
function upsertUser(googlePayload) {
    return new Promise((resolve, reject) => {
        const { email, name, picture } = googlePayload;

        // Domain Check
        if (!email.endsWith('@cgu-odisha.ac.in')) {
            return reject(new Error('Unauthorized domain. Please use your @cgu-odisha.ac.in email.'));
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) return reject(err);

            if (row) {
                // Update existing user info if needed (e.g. avatar)
                // For now, just return the user
                resolve(row);
            } else {
                // Create new user
                const username = email.split('@')[0];
                db.run(
                    `INSERT INTO users (username, email, avatar, display_name, profile_setup_complete) VALUES (?, ?, ?, ?, ?)`,
                    [username, email, picture, name, 0],
                    function (err) {
                        if (err) return reject(err);
                        // Get the new user
                        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                            if (err) return reject(err);
                            resolve(newUser);
                        });
                    }
                );
            }
        });
    });
}

// Middleware: Authenticate Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // user object contains { id, email, ... }
        next();
    });
}

// --- ROUTES ---

// Auth Route
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const user = await upsertUser(payload);

        // Create App JWT
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: error.message || 'Authentication failed' });
    }
});

// Get Current User
app.get('/api/me', authenticateToken, (req, res) => {
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
    });
});

// Posts Routes
app.get('/api/posts', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const sql = `
    SELECT p.*, u.username, u.avatar as user_avatar 
    FROM posts p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.created_at DESC 
    LIMIT ? OFFSET ?
  `;

    db.all(sql, [limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/posts', authenticateToken, upload.single('image'), (req, res) => {
    const { caption } = req.body;

    let imagePath = '';
    if (req.file) {
        // Store relative path for frontend to access via static middleware
        imagePath = '/uploads/' + req.file.filename;
    } else if (req.body.image) {
        // Fallback for Base64 if client still sends it (though we prefer file upload)
        // Ideally we should reject this or decode it to a file, but for now let's allow it if it's a string
        // But the requirement said "Refactor... use multer". So we prioritize multer.
        // If no file, check if image is in body (maybe base64 string)
        imagePath = req.body.image;
    }

    if (!imagePath) {
        return res.status(400).json({ error: 'Image is required' });
    }

    const sql = `INSERT INTO posts (user_id, image, caption) VALUES (?, ?, ?)`;
    db.run(sql, [req.user.id, imagePath, caption || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Return the created post with user info
        const newPostId = this.lastID;
        const getSql = `
      SELECT p.*, u.username, u.avatar as user_avatar 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `;
        db.get(getSql, [newPostId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(row);
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
