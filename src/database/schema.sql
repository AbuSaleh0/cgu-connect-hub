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
  image VARCHAR(500) NOT NULL,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

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