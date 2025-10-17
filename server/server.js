import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import db from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Users endpoints
app.post('/api/users', async (req, res) => {
  const { username, email, password, avatar, displayName, bio, semester, department } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    `INSERT INTO users (username, email, password, avatar, display_name, bio, semester, department) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, email, hashedPassword, avatar || '', displayName || username, bio || '', semester || '', department || ''],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, username, email, avatar, displayName, bio, semester, department });
    }
  );
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    const { password, ...user } = row;
    res.json(user);
  });
});

app.get('/api/users/username/:username', (req, res) => {
  db.get('SELECT * FROM users WHERE username = ?', [req.params.username], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    const { password, ...user } = row;
    res.json(user);
  });
});

app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    const users = rows.map(row => {
      const { password, ...user } = row;
      return user;
    });
    res.json(users);
  });
});

app.get('/api/posts/user/:userId', (req, res) => {
  db.all(
    `SELECT p.*, u.username, u.avatar as user_avatar 
     FROM posts p 
     JOIN users u ON p.user_id = u.id 
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC`,
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/follows/check/:followerId/:followingId', (req, res) => {
  db.get(
    'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
    [req.params.followerId, req.params.followingId],
    (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ following: !!row });
    }
  );
});

app.post('/api/notifications', (req, res) => {
  const { user_id, type, from_user_id, post_id, message } = req.body;
  
  db.run(
    'INSERT INTO notifications (user_id, type, from_user_id, post_id, message) VALUES (?, ?, ?, ?, ?)',
    [user_id, type, from_user_id, post_id || null, message],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, user_id, type, from_user_id, post_id, message });
    }
  );
});

app.put('/api/notifications/:userId/read', (req, res) => {
  db.run(
    'UPDATE notifications SET read = 1 WHERE user_id = ?',
    [req.params.userId],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Posts endpoints
app.post('/api/posts', (req, res) => {
  const { user_id, image, caption } = req.body;
  
  db.run(
    'INSERT INTO posts (user_id, image, caption) VALUES (?, ?, ?)',
    [user_id, image, caption || ''],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, user_id, image, caption });
    }
  );
});

app.get('/api/posts', (req, res) => {
  db.all(
    `SELECT p.*, u.username, u.avatar as user_avatar 
     FROM posts p 
     JOIN users u ON p.user_id = u.id 
     ORDER BY p.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Follow endpoints
app.post('/api/follows/toggle', (req, res) => {
  const { follower_id, following_id } = req.body;
  
  db.get(
    'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
    [follower_id, following_id],
    (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      
      if (row) {
        // Unfollow
        db.run(
          'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
          [follower_id, following_id],
          (err) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ following: false });
          }
        );
      } else {
        // Follow
        db.run(
          'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
          [follower_id, following_id],
          (err) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ following: true });
          }
        );
      }
    }
  );
});

// Notifications endpoints
app.get('/api/notifications/:userId', (req, res) => {
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Messaging endpoints
app.post('/api/conversations', (req, res) => {
  const { participant1_id, participant2_id } = req.body;
  
  // Ensure participant1_id is smaller for consistent uniqueness
  const [p1, p2] = participant1_id < participant2_id ? [participant1_id, participant2_id] : [participant2_id, participant1_id];
  
  // Check if conversation already exists
  db.get(
    'SELECT * FROM conversations WHERE participant1_id = ? AND participant2_id = ?',
    [p1, p2],
    (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      
      if (row) {
        res.json(row);
      } else {
        db.run(
          'INSERT INTO conversations (participant1_id, participant2_id) VALUES (?, ?)',
          [p1, p2],
          function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, participant1_id: p1, participant2_id: p2 });
          }
        );
      }
    }
  );
});

app.get('/api/conversations/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  db.all(`
    SELECT 
      c.id,
      c.participant1_id,
      c.participant2_id,
      c.last_message_id,
      c.last_message_at,
      c.created_at,
      c.updated_at,
      m.content as last_message_content,
      (SELECT COUNT(*) FROM messages 
       WHERE conversation_id = c.id 
       AND sender_id != ? 
       AND is_read = FALSE) as unread_count
    FROM conversations c
    LEFT JOIN messages m ON c.last_message_id = m.id
    WHERE c.participant1_id = ? OR c.participant2_id = ?
    ORDER BY c.last_message_at DESC
  `, [userId, userId, userId], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/messages', (req, res) => {
  const { conversation_id, sender_id, content, message_type, media_url } = req.body;
  
  db.run(
    'INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
    [conversation_id, sender_id, content, message_type || 'text', media_url || null],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      
      // Update conversation's last message info
      db.run(
        'UPDATE conversations SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
        [this.lastID, conversation_id],
        (err) => {
          if (err) console.error('Error updating conversation:', err);
        }
      );
      
      res.json({ 
        id: this.lastID, 
        conversation_id, 
        sender_id, 
        content, 
        message_type: message_type || 'text',
        media_url,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
  );
});

app.get('/api/messages/:conversationId', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  db.all(`
    SELECT 
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.message_type,
      m.is_read,
      m.created_at,
      m.updated_at
    FROM messages m
    WHERE m.conversation_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.params.conversationId, limit, offset], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows.reverse()); // Return in chronological order
  });
});

app.put('/api/messages/:conversationId/read/:userId', (req, res) => {
  db.run(
    'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
    [req.params.conversationId, req.params.userId],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.get('/api/messages/unread/:userId', (req, res) => {
  db.get(`
    SELECT COUNT(*) as count FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (c.participant1_id = ? OR c.participant2_id = ?)
    AND m.sender_id != ?
    AND m.is_read = FALSE
  `, [req.params.userId, req.params.userId, req.params.userId], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ count: row.count });
  });
});

// Clear database endpoint (for development only)
app.delete('/api/reset-database', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM messages');
    db.run('DELETE FROM conversations');
    db.run('DELETE FROM saved_posts');
    db.run('DELETE FROM notifications');
    db.run('DELETE FROM follows');
    db.run('DELETE FROM comments');
    db.run('DELETE FROM likes');
    db.run('DELETE FROM posts');
    db.run('DELETE FROM otp_codes');
    db.run('DELETE FROM users');
    
    // Reset auto-increment counters
    db.run('DELETE FROM sqlite_sequence');
    
    res.json({ message: 'Database cleared successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});