-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  displayName VARCHAR(100) NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  semester VARCHAR(20) DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  profileSetupComplete BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type VARCHAR(10) NOT NULL DEFAULT 'image', -- 'image' or 'video'
  duration INTEGER DEFAULT NULL, -- video duration in seconds (max 60)
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (media_type IN ('image', 'video')),
  CHECK (duration IS NULL OR (duration > 0 AND duration <= 60))
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant1_id INTEGER NOT NULL,
  participant2_id INTEGER NOT NULL,
  last_message_id INTEGER,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(participant1_id, participant2_id),
  CHECK (participant1_id != participant2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(10) DEFAULT 'text', -- 'text', 'image', 'video'
  media_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (message_type IN ('text', 'image', 'video'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Triggers to update likes_count and comments_count
CREATE TRIGGER IF NOT EXISTS update_likes_count_insert
  AFTER INSERT ON likes
BEGIN
  UPDATE posts 
  SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
END;

CREATE TRIGGER IF NOT EXISTS update_likes_count_delete
  AFTER DELETE ON likes
BEGIN
  UPDATE posts 
  SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = OLD.post_id)
  WHERE id = OLD.post_id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_count_insert
  AFTER INSERT ON comments
BEGIN
  UPDATE posts 
  SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_count_delete
  AFTER DELETE ON comments
BEGIN
  UPDATE posts 
  SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
  WHERE id = OLD.post_id;
END;

-- Trigger to update conversation's last message info
CREATE TRIGGER IF NOT EXISTS update_conversation_last_message
  AFTER INSERT ON messages
BEGIN
  UPDATE conversations 
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;
END;