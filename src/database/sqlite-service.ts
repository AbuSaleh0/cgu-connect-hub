/**
 * Client-Side SQLite Database Service
 * This service provides a complete SQLite implementation running in the browser
 * All data is stored in a local SQLite database file in browser storage
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { 
  User, 
  UserPublic,
  Post, 
  PostWithUser, 
  Like, 
  Comment, 
  CommentWithUser,
  Follow,
  Conversation,
  ConversationWithUsers,
  Message,
  MessageWithSender,
  CreateConversationData,
  CreateMessageData,
  Notification,
  SavedPost,
  CreateUserData, 
  CreatePostData, 
  CreateCommentData, 
  CreateLikeData,
  CreateFollowData,
  CreateNotificationData,
  CreateSavedPostData,
  LoginData,
  AuthResult,
  OTPCode,
  CreateOTPData,
  VerifyOTPData,
  GoogleUserData,
  UpdateProfileData
} from './types';

class SQLiteService {
  private sql: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized = false;
  private readonly dbKey = 'cgu-connect-sqlite-db';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Loading SQL.js with WASM file from public directory...');
      
      // Initialize SQL.js
      this.sql = await initSqlJs({
        // Load WASM file from public directory
        locateFile: file => {
          console.log(`📁 Loading file: ${file} from /${file}`);
          return `/${file}`;
        }
      });

      console.log('✅ SQL.js initialized successfully');

      // Try to load existing database from localStorage with robust error handling
      await this.loadDatabaseWithFallback();

      this.isInitialized = true;
      console.log('🚀 SQLite service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite service:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      throw new Error(`Failed to initialize SQLite database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadDatabaseWithFallback(): Promise<void> {
    try {
      console.log('📂 Attempting to load existing database from localStorage...');
      
      // Check if localStorage is available
      if (typeof Storage === 'undefined') {
        console.warn('⚠️ localStorage not available, creating new database');
        this.createNewDatabase();
        return;
      }

      const existingData = localStorage.getItem(this.dbKey);
      
      if (!existingData) {
        console.log('📝 No existing database found, creating new one');
        this.createNewDatabase();
        return;
      }

      console.log(`📊 Found existing database data (${(existingData.length / 1024).toFixed(1)} KB)`);

      try {
        // Parse the JSON data
        const parsedData = JSON.parse(existingData);
        
        if (!Array.isArray(parsedData)) {
          throw new Error('Invalid data format: not an array');
        }

        // Convert to Uint8Array
        const binaryData = new Uint8Array(parsedData);
        
        if (binaryData.length === 0) {
          throw new Error('Empty database data');
        }

        // Create database from binary data
        if (!this.sql) throw new Error('SQL.js not initialized');
        this.db = new this.sql.Database(binaryData);
        
        // Verify the database is functional by doing a simple query
        const result = this.db.exec('SELECT name FROM sqlite_master WHERE type="table"');
        console.log(`✅ Successfully loaded database with ${result.length > 0 ? result[0].values.length : 0} tables`);
        
      } catch (parseError) {
        console.error('❌ Failed to parse/load existing database:', parseError);
        console.log('🔄 Clearing corrupted data and creating fresh database...');
        
        // Clear the corrupted data
        try {
          localStorage.removeItem(this.dbKey);
        } catch (clearError) {
          console.warn('⚠️ Failed to clear corrupted database:', clearError);
        }
        
        // Create new database
        this.createNewDatabase();
      }

    } catch (storageError) {
      console.error('❌ localStorage access failed:', storageError);
      console.log('🧠 Falling back to in-memory database...');
      this.createInMemoryDatabase();
    }
  }

  private createInMemoryDatabase(): void {
    if (!this.sql) throw new Error('SQL.js not initialized');
    
    this.db = new this.sql.Database();
    console.log('🧠 Created in-memory SQLite database (no persistence)');
    
    // Create all tables but do NOT save to localStorage
    this.createTables();
    // Note: No saveDatabase() call - this is truly in-memory only
  }

  private createNewDatabase(): void {
    if (!this.sql) throw new Error('SQL.js not initialized');
    
    this.db = new this.sql.Database();
    console.log('📊 Created new SQLite database');
    
    // Create all tables
    this.createTables();
    this.saveDatabase();
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        display_name TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        semester TEXT DEFAULT '',
        department TEXT DEFAULT '',
        profile_setup_complete BOOLEAN DEFAULT 0,
        password_setup_complete BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Posts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS posts (
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
      )
    `);

    // Likes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        UNIQUE(user_id, post_id)
      )
    `);

    // Comments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
      )
    `);

    // Follows table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(follower_id, following_id)
      )
    `);

    // Notifications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
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
      )
    `);

    // Conversations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
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
      )
    `);

    // Messages table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
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
      )
    `);

    // OTP codes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Saved posts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS saved_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        UNIQUE(user_id, post_id)
      )
    `);

    // Create indexes for better performance
    this.createIndexes();
    
    // Create triggers for automatic counters
    this.createTriggers();

    console.log('📋 All database tables and triggers created successfully');
  }

  private createIndexes(): void {
    if (!this.db) return;

    try {
      this.db.run('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)');
    } catch (error) {
      console.warn('Warning: Some indexes may already exist:', error);
    }
  }

  private createTriggers(): void {
    if (!this.db) return;

    try {
      // Triggers to update likes_count
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_likes_count_insert
        AFTER INSERT ON likes
        BEGIN
          UPDATE posts 
          SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = NEW.post_id)
          WHERE id = NEW.post_id;
        END
      `);

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_likes_count_delete
        AFTER DELETE ON likes
        BEGIN
          UPDATE posts 
          SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = OLD.post_id)
          WHERE id = OLD.post_id;
        END
      `);

      // Triggers to update comments_count
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_comments_count_insert
        AFTER INSERT ON comments
        BEGIN
          UPDATE posts 
          SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
          WHERE id = NEW.post_id;
        END
      `);

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_comments_count_delete
        AFTER DELETE ON comments
        BEGIN
          UPDATE posts 
          SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
          WHERE id = OLD.post_id;
        END
      `);

      // Trigger to update conversation's last message info
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_conversation_last_message
        AFTER INSERT ON messages
        BEGIN
          UPDATE conversations 
          SET 
            last_message_id = NEW.id,
            last_message_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.conversation_id;
        END
      `);
    } catch (error) {
      console.warn('Warning: Some triggers may already exist:', error);
    }
  }

  private saveDatabase(): void {
    if (!this.db) return;

    try {
      // Check if localStorage is available and has space
      if (typeof Storage === 'undefined') {
        console.warn('⚠️ localStorage not available, skipping database save');
        return;
      }

      const data = this.db.export();
      const dataArray = Array.from(data);
      const jsonData = JSON.stringify(dataArray);
      
      // Check approximate size before saving
      const sizeKB = (jsonData.length / 1024).toFixed(1);
      console.log(`💾 Saving database to localStorage (${sizeKB} KB)...`);

      localStorage.setItem(this.dbKey, jsonData);
      console.log('✅ Database saved successfully');

    } catch (error) {
      console.error('❌ Failed to save database to localStorage:', error);
      
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
          console.error('� localStorage quota exceeded! Consider clearing old data.');
          this.handleStorageQuotaExceeded();
        } else if (error.message.includes('not available') || error.message.includes('disabled')) {
          console.warn('⚠️ localStorage appears to be disabled or unavailable');
        } else {
          console.error('💥 Unexpected save error:', error.message);
        }
      }
      
      // Don't throw - the app should continue functioning even if save fails
    }
  }

  private handleStorageQuotaExceeded(): void {
    console.log('🧹 Attempting to clear old localStorage data to free up space...');
    
    try {
      // Try to clear just our database key first
      localStorage.removeItem(this.dbKey);
      console.log('🗑️ Cleared existing database from localStorage');
      
      // Try saving again with a fresh start
      if (this.db) {
        const data = this.db.export();
        const dataArray = Array.from(data);
        localStorage.setItem(this.dbKey, JSON.stringify(dataArray));
        console.log('✅ Database saved after cleanup');
      }
      
    } catch (retryError) {
      console.error('❌ Failed to save even after cleanup:', retryError);
      console.warn('⚠️ App will continue without localStorage persistence');
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('SQLite service not initialized. Call initialize() first.');
    }
  }

  // ===== USER OPERATIONS =====

  async createUser(userData: CreateUserData): Promise<User> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (username, email, password, avatar, display_name, bio, semester, department, profile_setup_complete, password_setup_complete) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        userData.username,
        userData.email,
        userData.password,
        userData.avatar || '',
        userData.displayName || userData.username,
        userData.bio || '',
        userData.semester || '',
        userData.department || '',
        userData.profileSetupComplete ? 1 : 0,
        userData.passwordSetupComplete ? 1 : 0
      ]);

      // Get the last insert ID
      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      const newUserId = idResult.id as number;
      
      stmt.free();
      idStmt.free();
      this.saveDatabase();

      // Get the created user
      const user = this.getUserById(newUserId);
      if (!user) throw new Error('Failed to retrieve created user');
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  getUserById(id: number): User | null {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const result = stmt.getAsObject([id]);
      stmt.free();

      if (Object.keys(result).length === 0) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        password: result.password as string,
        avatar: result.avatar as string,
        displayName: result.display_name as string,
        bio: result.bio as string,
        semester: result.semester as string,
        department: result.department as string,
        profileSetupComplete: Boolean(result.profile_setup_complete),
        passwordSetupComplete: Boolean(result.password_setup_complete),
        created_at: result.created_at as string,
        updated_at: result.updated_at as string
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  getUserByUsername(username: string): User | null {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
      const result = stmt.getAsObject([username]);
      stmt.free();

      if (Object.keys(result).length === 0) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        password: result.password as string,
        avatar: result.avatar as string,
        displayName: result.display_name as string,
        bio: result.bio as string,
        semester: result.semester as string,
        department: result.department as string,
        profileSetupComplete: Boolean(result.profile_setup_complete),
        passwordSetupComplete: Boolean(result.password_setup_complete),
        created_at: result.created_at as string,
        updated_at: result.updated_at as string
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  getUserByEmail(email: string): User | null {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const result = stmt.getAsObject([email]);
      stmt.free();

      if (Object.keys(result).length === 0) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        password: result.password as string,
        avatar: result.avatar as string,
        displayName: result.display_name as string,
        bio: result.bio as string,
        semester: result.semester as string,
        department: result.department as string,
        profileSetupComplete: Boolean(result.profile_setup_complete),
        passwordSetupComplete: Boolean(result.password_setup_complete),
        created_at: result.created_at as string,
        updated_at: result.updated_at as string
      };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  getAllUsers(): User[] {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
      let results: User[] = [];
      
      stmt.bind([]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          username: row.username as string,
          email: row.email as string,
          password: row.password as string,
          avatar: row.avatar as string,
          displayName: row.display_name as string,
          bio: row.bio as string,
          semester: row.semester as string,
          department: row.department as string,
          profileSetupComplete: Boolean(row.profile_setup_complete),
          passwordSetupComplete: Boolean(row.password_setup_complete),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // ===== POST OPERATIONS =====

  async createPost(postData: CreatePostData): Promise<Post> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT INTO posts (user_id, image, caption) 
        VALUES (?, ?, ?)
      `);
      
      stmt.run([
        postData.user_id,
        postData.image,
        postData.caption || ''
      ]);

      // Get the last insert ID
      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      const newPostId = idResult.id as number;

      stmt.free();
      idStmt.free();
      this.saveDatabase();

      // Get the created post
      const post = this.getPostById(newPostId);
      if (!post) throw new Error('Failed to retrieve created post');
      
      return post;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  getPostById(id: number): Post | null {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM posts WHERE id = ?');
      const result = stmt.getAsObject([id]);
      stmt.free();

      if (Object.keys(result).length === 0) return null;

      return {
        id: result.id as number,
        user_id: result.user_id as number,
        image: result.image as string,
        caption: result.caption as string,
        likes_count: result.likes_count as number,
        comments_count: result.comments_count as number,
        created_at: result.created_at as string,
        updated_at: result.updated_at as string
      };
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
  }

  getAllPosts(): PostWithUser[] {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT p.*, u.username, u.avatar as user_avatar 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
      `);
      
      let results: PostWithUser[] = [];
      stmt.bind([]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          user_id: row.user_id as number,
          image: row.image as string,
          caption: row.caption as string,
          likes_count: row.likes_count as number,
          comments_count: row.comments_count as number,
          pinned: Boolean(row.pinned),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          username: row.username as string,
          user_avatar: row.user_avatar as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting all posts:', error);
      return [];
    }
  }

  getPostsByUser(userId: number): PostWithUser[] {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT p.*, u.username, u.avatar as user_avatar 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      
      let results: PostWithUser[] = [];
      stmt.bind([userId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          user_id: row.user_id as number,
          image: row.image as string,
          caption: row.caption as string,
          likes_count: row.likes_count as number,
          comments_count: row.comments_count as number,
          pinned: Boolean(row.pinned),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          username: row.username as string,
          user_avatar: row.user_avatar as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting posts by user:', error);
      return [];
    }
  }

  // ===== LIKE OPERATIONS =====

  toggleLike(likeData: CreateLikeData): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      // Check if like exists
      const checkStmt = this.db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?');
      const existing = checkStmt.getAsObject([likeData.user_id, likeData.post_id]);
      checkStmt.free();

      if (Object.keys(existing).length > 0) {
        // Unlike
        const deleteStmt = this.db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?');
        deleteStmt.run([likeData.user_id, likeData.post_id]);
        deleteStmt.free();
        this.saveDatabase();
        return false;
      } else {
        // Like
        const insertStmt = this.db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)');
        insertStmt.run([likeData.user_id, likeData.post_id]);
        insertStmt.free();
        this.saveDatabase();
        return true;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  isPostLikedByUser(userId: number, postId: number): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?');
      const result = stmt.getAsObject([userId, postId]);
      stmt.free();

      return Object.keys(result).length > 0;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  // ===== FOLLOW OPERATIONS =====

  async toggleFollow(followData: CreateFollowData): Promise<boolean> {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      // Check if follow exists
      const checkStmt = this.db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?');
      const existing = checkStmt.getAsObject([followData.follower_id, followData.following_id]);
      checkStmt.free();

      if (Object.keys(existing).length > 0) {
        // Unfollow
        const deleteStmt = this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
        deleteStmt.run([followData.follower_id, followData.following_id]);
        deleteStmt.free();
        this.saveDatabase();
        return false;
      } else {
        // Follow
        const insertStmt = this.db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
        insertStmt.run([followData.follower_id, followData.following_id]);
        insertStmt.free();
        this.saveDatabase();
        return true;
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      return false;
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?');
      const result = stmt.getAsObject([followerId, followingId]);
      stmt.free();

      return Object.keys(result).length > 0;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // ===== COMMENT OPERATIONS =====

  createComment(commentData: CreateCommentData): Comment {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT INTO comments (user_id, post_id, content) 
        VALUES (?, ?, ?)
      `);
      
      stmt.run([
        commentData.user_id,
        commentData.post_id,
        commentData.content
      ]);

      // Get the last insert ID using a separate query
      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      idStmt.free();

      stmt.free();
      this.saveDatabase();

      return {
        id: idResult.id as number,
        user_id: commentData.user_id,
        post_id: commentData.post_id,
        content: commentData.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  getPostComments(postId: number): CommentWithUser[] {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT c.*, u.username, u.avatar as user_avatar 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `);
      
      let results: CommentWithUser[] = [];
      stmt.bind([postId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          user_id: row.user_id as number,
          post_id: row.post_id as number,
          content: row.content as string,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          username: row.username as string,
          user_avatar: row.user_avatar as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting post comments:', error);
      return [];
    }
  }

  // ===== SAVED POSTS OPERATIONS =====

  toggleSavePost(saveData: CreateSavedPostData): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      // Check if save exists
      const checkStmt = this.db.prepare('SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?');
      const existing = checkStmt.getAsObject([saveData.user_id, saveData.post_id]);
      checkStmt.free();

      if (Object.keys(existing).length > 0) {
        // Unsave
        const deleteStmt = this.db.prepare('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?');
        deleteStmt.run([saveData.user_id, saveData.post_id]);
        deleteStmt.free();
        this.saveDatabase();
        return false;
      } else {
        // Save
        const insertStmt = this.db.prepare('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)');
        insertStmt.run([saveData.user_id, saveData.post_id]);
        insertStmt.free();
        this.saveDatabase();
        return true;
      }
    } catch (error) {
      console.error('Error toggling save post:', error);
      return false;
    }
  }

  isPostSaved(userId: number, postId: number): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare('SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?');
      const result = stmt.getAsObject([userId, postId]);
      stmt.free();

      return Object.keys(result).length > 0;
    } catch (error) {
      console.error('Error checking save status:', error);
      return false;
    }
  }

  // ===== AUTHENTICATION & PROFILE OPERATIONS =====

  login(loginData: LoginData): AuthResult {
    this.ensureInitialized();
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      const user = this.getUserByEmail(loginData.email);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Note: In a real app, you'd compare hashed passwords
      // For this implementation, we're assuming password checking happens elsewhere
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          displayName: user.displayName,
          bio: user.bio,
          semester: user.semester,
          department: user.department,
          profileSetupComplete: user.profileSetupComplete,
          passwordSetupComplete: user.passwordSetupComplete,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        token: `mock-token-${user.id}-${Date.now()}` // Mock token
      };
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  checkUsernameAvailability(username: string): { available: boolean; error?: string } {
    this.ensureInitialized();
    if (!this.db) return { available: false, error: 'Database not initialized' };

    try {
      const user = this.getUserByUsername(username);
      return { available: !user };
    } catch (error) {
      console.error('Error checking username availability:', error);
      return { available: false, error: 'Check failed' };
    }
  }

  updateUserProfile(userId: number, profileData: UpdateProfileData): { success: boolean; error?: string } {
    this.ensureInitialized();
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET display_name = ?, bio = ?, avatar = ?, semester = ?, department = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        profileData.displayName,
        profileData.bio || '',
        profileData.avatar || '',
        profileData.semester || '',
        profileData.department || '',
        userId
      ]);

      stmt.free();
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Update failed' };
    }
  }

  updateUsername(userId: number, newUsername: string): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      // Check if username is available
      const checkStmt = this.db.prepare('SELECT id FROM users WHERE username = ? AND id != ?');
      const existing = checkStmt.getAsObject([newUsername, userId]);
      checkStmt.free();

      if (Object.keys(existing).length > 0) {
        return false; // Username already taken
      }

      const stmt = this.db.prepare('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run([newUsername, userId]);
      stmt.free();
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Error updating username:', error);
      return false;
    }
  }

  completeProfileSetup(userId: number): { success: boolean; error?: string } {
    this.ensureInitialized();
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      const stmt = this.db.prepare('UPDATE users SET profile_setup_complete = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run([userId]);
      stmt.free();
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      console.error('Error completing profile setup:', error);
      return { success: false, error: 'Setup failed' };
    }
  }

  setupPassword(userId: number, password: string): { success: boolean; error?: string } {
    this.ensureInitialized();
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      const stmt = this.db.prepare('UPDATE users SET password = ?, password_setup_complete = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run([password, userId]);
      stmt.free();
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      console.error('Error setting up password:', error);
      return { success: false, error: 'Password setup failed' };
    }
  }

  // ===== FOLLOW HELPER METHODS =====

  async getFollowerCount(userId: number): Promise<number> {
    this.ensureInitialized();
    if (!this.db) return 0;

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?');
      const result = stmt.getAsObject([userId]);
      stmt.free();

      return result.count as number || 0;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }
  }

  async getFollowingCount(userId: number): Promise<number> {
    this.ensureInitialized();
    if (!this.db) return 0;

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');
      const result = stmt.getAsObject([userId]);
      stmt.free();

      return result.count as number || 0;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  }

  async getFollowersList(userId: number): Promise<UserPublic[]> {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.bio, u.semester, u.department, u.profile_setup_complete, u.password_setup_complete, u.created_at, u.updated_at
        FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = ?
        ORDER BY f.created_at DESC
      `);
      
      let results: UserPublic[] = [];
      stmt.bind([userId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          username: row.username as string,
          email: row.email as string,
          displayName: row.display_name as string,
          avatar: row.avatar as string,
          bio: row.bio as string,
          semester: row.semester as string,
          department: row.department as string,
          profileSetupComplete: Boolean(row.profile_setup_complete),
          passwordSetupComplete: Boolean(row.password_setup_complete),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting followers list:', error);
      return [];
    }
  }

  async getFollowingList(userId: number): Promise<UserPublic[]> {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.bio, u.semester, u.department, u.profile_setup_complete, u.password_setup_complete, u.created_at, u.updated_at
        FROM users u
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
      `);
      
      let results: UserPublic[] = [];
      stmt.bind([userId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          username: row.username as string,
          email: row.email as string,
          displayName: row.display_name as string,
          avatar: row.avatar as string,
          bio: row.bio as string,
          semester: row.semester as string,
          department: row.department as string,
          profileSetupComplete: Boolean(row.profile_setup_complete),
          passwordSetupComplete: Boolean(row.password_setup_complete),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting following list:', error);
      return [];
    }
  }

  // ===== POST MANAGEMENT =====

  getPostWithUserById(postId: number): PostWithUser | null {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        SELECT p.*, u.username, u.avatar as user_avatar 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = ?
      `);
      const result = stmt.getAsObject([postId]);
      stmt.free();

      if (Object.keys(result).length === 0) return null;

      return {
        id: result.id as number,
        user_id: result.user_id as number,
        image: result.image as string,
        caption: result.caption as string,
        likes_count: result.likes_count as number,
        comments_count: result.comments_count as number,
        pinned: Boolean(result.pinned),
        created_at: result.created_at as string,
        updated_at: result.updated_at as string,
        username: result.username as string,
        user_avatar: result.user_avatar as string
      };
    } catch (error) {
      console.error('Error getting post with user by ID:', error);
      return null;
    }
  }

  updatePostCaption(postId: number, caption: string): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare('UPDATE posts SET caption = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run([caption, postId]);
      stmt.free();
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Error updating post caption:', error);
      return false;
    }
  }

  deletePost(postId: number): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare('DELETE FROM posts WHERE id = ?');
      stmt.run([postId]);
      stmt.free();
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  togglePinPost(postId: number): boolean {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      // Get current pin status
      const checkStmt = this.db.prepare('SELECT pinned FROM posts WHERE id = ?');
      const result = checkStmt.getAsObject([postId]);
      checkStmt.free();

      if (Object.keys(result).length === 0) return false;

      const newPinStatus = result.pinned ? 0 : 1;
      
      const updateStmt = this.db.prepare('UPDATE posts SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run([newPinStatus, postId]);
      updateStmt.free();
      this.saveDatabase();
      return Boolean(newPinStatus);
    } catch (error) {
      console.error('Error toggling pin post:', error);
      return false;
    }
  }

  // ===== MESSAGING OPERATIONS =====

  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      // Ensure participant1_id is smaller for consistent uniqueness
      const [p1, p2] = data.participant1_id < data.participant2_id ? 
        [data.participant1_id, data.participant2_id] : 
        [data.participant2_id, data.participant1_id];

      // Check if conversation already exists
      const checkStmt = this.db.prepare('SELECT * FROM conversations WHERE participant1_id = ? AND participant2_id = ?');
      checkStmt.bind([p1, p2]);
      
      if (checkStmt.step()) {
        const existing = checkStmt.getAsObject();
        checkStmt.free();
        return {
          id: existing.id as number,
          participant1_id: existing.participant1_id as number,
          participant2_id: existing.participant2_id as number,
          last_message_id: existing.last_message_id as number | null,
          last_message_at: existing.last_message_at as string,
          created_at: existing.created_at as string,
          updated_at: existing.updated_at as string
        };
      }
      checkStmt.free();

      // Create new conversation
      const stmt = this.db.prepare('INSERT INTO conversations (participant1_id, participant2_id) VALUES (?, ?)');
      stmt.run([p1, p2]);
      
      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      const newConversationId = idResult.id as number;
      
      stmt.free();
      idStmt.free();
      this.saveDatabase();

      return {
        id: newConversationId,
        participant1_id: p1,
        participant2_id: p2,
        last_message_id: null,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.id,
          c.participant1_id,
          c.participant2_id,
          c.last_message_id,
          c.last_message_at,
          c.created_at,
          c.updated_at,
          u1.username as participant1_username,
          u1.avatar as participant1_avatar,
          u2.username as participant2_username,
          u2.avatar as participant2_avatar,
          m.content as last_message_content,
          (SELECT COUNT(*) FROM messages 
           WHERE conversation_id = c.id 
           AND sender_id != ? 
           AND is_read = 0) as unread_count
        FROM conversations c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE c.participant1_id = ? OR c.participant2_id = ?
        ORDER BY c.last_message_at DESC
      `);

      let results: ConversationWithUsers[] = [];
      stmt.bind([userId, userId, userId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          participant1_id: row.participant1_id as number,
          participant2_id: row.participant2_id as number,
          last_message_id: row.last_message_id as number | null,
          last_message_at: row.last_message_at as string,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          participant1_username: row.participant1_username as string,
          participant1_avatar: row.participant1_avatar as string,
          participant2_username: row.participant2_username as string,
          participant2_avatar: row.participant2_avatar as string,
          last_message_content: row.last_message_content as string,
          unread_count: row.unread_count as number
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  async createMessage(data: CreateMessageData): Promise<Message | null> {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        data.conversation_id,
        data.sender_id,
        data.content,
        data.message_type || 'text',
        data.media_url || null
      ]);

      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      const newMessageId = idResult.id as number;
      
      stmt.free();
      idStmt.free();
      this.saveDatabase();

      return {
        id: newMessageId,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type || 'text',
        media_url: data.media_url || null,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.content,
          m.message_type,
          m.is_read,
          m.created_at,
          m.updated_at,
          u.username as sender_username,
          u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `);

      let results: MessageWithSender[] = [];
      stmt.bind([conversationId, limit, offset]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          conversation_id: row.conversation_id as number,
          sender_id: row.sender_id as number,
          content: row.content as string,
          message_type: (row.message_type as string) as 'text' | 'image' | 'video',
          media_url: row.media_url as string,
          is_read: Boolean(row.is_read),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          sender_username: row.sender_username as string,
          sender_avatar: row.sender_avatar as string
        });
      }
      stmt.free();

      return results.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return [];
    }
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    this.ensureInitialized();
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare(`
        UPDATE messages 
        SET is_read = 1 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
      `);
      stmt.run([conversationId, userId]);
      stmt.free();
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    this.ensureInitialized();
    if (!this.db) return 0;

    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        AND m.sender_id != ?
        AND m.is_read = 0
      `);
      const result = stmt.getAsObject([userId, userId, userId]);
      stmt.free();

      return result.count as number || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // ===== NOTIFICATION OPERATIONS =====

  async createNotification(notificationData: CreateNotificationData): Promise<Notification | null> {
    this.ensureInitialized();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO notifications (user_id, type, from_user_id, post_id, message) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        notificationData.user_id,
        notificationData.type,
        notificationData.from_user_id,
        notificationData.post_id || null,
        notificationData.message
      ]);

      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      const idResult = idStmt.getAsObject([]);
      const newNotificationId = idResult.id as number;
      
      stmt.free();
      idStmt.free();
      this.saveDatabase();

      return {
        id: newNotificationId,
        user_id: notificationData.user_id,
        type: notificationData.type,
        from_user_id: notificationData.from_user_id,
        post_id: notificationData.post_id || null,
        message: notificationData.message,
        read: false,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    this.ensureInitialized();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `);

      let results: Notification[] = [];
      stmt.bind([userId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as number,
          user_id: row.user_id as number,
          type: (row.type as string) as 'like' | 'comment' | 'follow',
          from_user_id: row.from_user_id as number,
          post_id: row.post_id as number | null,
          message: row.message as string,
          read: Boolean(row.read),
          created_at: row.created_at as string
        });
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    this.ensureInitialized();
    if (!this.db) return;

    try {
      const stmt = this.db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?');
      stmt.run([userId]);
      stmt.free();
      this.saveDatabase();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // ===== UTILITY METHODS =====

  clearDatabase(): void {
    if (this.db) {
      this.db.close();
    }
    localStorage.removeItem(this.dbKey);
    this.isInitialized = false;
    console.log('🗑️ Database cleared');
  }

  getDatabaseInfo(): { sizeKB: number; tableCount: number; isInMemory: boolean; hasLocalStorageData: boolean } {
    this.ensureInitialized();
    if (!this.db) return { sizeKB: 0, tableCount: 0, isInMemory: true, hasLocalStorageData: false };

    // Check localStorage status safely
    let hasLocalStorageData = false;
    let sizeKB = 0;
    
    try {
      const data = localStorage.getItem(this.dbKey);
      hasLocalStorageData = !!data;
      sizeKB = data ? Math.round(data.length / 1024) : 0;
    } catch (error) {
      console.warn('Could not check localStorage:', error);
    }
    
    // Count tables
    const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
    let tableCount = 0;
    stmt.bind([]);
    while (stmt.step()) {
      tableCount++;
    }
    stmt.free();

    const isInMemory = !hasLocalStorageData;

    return { sizeKB, tableCount, isInMemory, hasLocalStorageData };
  }
}

// Export singleton instance
// Simple direct export - same pattern as complete-service
console.log('🏗️ Creating SQLiteService instance...');
const _sqliteServiceInstance = new SQLiteService();
console.log('✅ SQLiteService instance created');

export const sqliteService = _sqliteServiceInstance;