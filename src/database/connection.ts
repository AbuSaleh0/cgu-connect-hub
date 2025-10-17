// Browser-compatible database using localStorage
interface DatabaseData {
  users: any[];
  posts: any[];
  likes: any[];
  comments: any[];
  follows: any[];
  notifications: any[];
  saved_posts: any[];
  otp_codes: any[];
  conversations: any[];
  messages: any[];
  sequences: {
    users: number;
    posts: number;
    likes: number;
    comments: number;
    follows: number;
    notifications: number;
    saved_posts: number;
    otp_codes: number;
    conversations: number;
    messages: number;
  };
}

class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private storageKey = 'cgu-connect-db';
  private data: DatabaseData;

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): DatabaseConnection {
    if (!this.instance) {
      this.instance = new DatabaseConnection();
    }
    return this.instance;
  }

  private loadData(): DatabaseData {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored data:', error);
      }
    }
    
    // Return default empty structure
    return {
      users: [],
      posts: [],
      likes: [],
      comments: [],
      follows: [],
      notifications: [],
      saved_posts: [],
      otp_codes: [],
      conversations: [],
      messages: [],
      sequences: {
        users: 0,
        posts: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        notifications: 0,
        saved_posts: 0,
        otp_codes: 0,
        conversations: 0,
        messages: 0
      }
    };
  }

  private saveData(): void {
    try {
      const dataString = JSON.stringify(this.data);
      const sizeInMB = (dataString.length / 1024 / 1024).toFixed(2);
      console.log(`Saving database (${sizeInMB} MB)...`);
      
      localStorage.setItem(this.storageKey, dataString);
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
      
      if (error.name === 'QuotaExceededError' || error.message.includes('exceeded the quota')) {
        console.warn("LocalStorage quota exceeded. Attempting cleanup...");
        this.cleanupOldData();
        
        // Try saving again after cleanup
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.data));
          console.log("Data saved successfully after cleanup");
        } catch (secondError) {
          console.error("Still failed after cleanup:", secondError);
          throw new Error("Storage quota exceeded. Please clear some browser data or use smaller images.");
        }
      } else {
        throw error;
      }
    }
  }

  private cleanupOldData(): void {
    // Remove old OTP codes (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    this.data.otp_codes = this.data.otp_codes.filter(otp => otp.created_at > oneHourAgo);
    
    // Keep only the latest 50 posts to prevent storage bloat
    if (this.data.posts.length > 50) {
      this.data.posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const removedPosts = this.data.posts.slice(50);
      this.data.posts = this.data.posts.slice(0, 50);
      
      // Remove likes, comments, and notifications for removed posts
      const removedPostIds = removedPosts.map(p => p.id);
      this.data.likes = this.data.likes.filter(like => !removedPostIds.includes(like.post_id));
      this.data.comments = this.data.comments.filter(comment => !removedPostIds.includes(comment.post_id));
      this.data.notifications = this.data.notifications.filter(notification => !notification.post_id || !removedPostIds.includes(notification.post_id));
      
      console.log(`Cleaned up ${removedPosts.length} old posts and their associated data`);
    }
    
    console.log("Database cleanup completed");
  }

  // Simulate SQL operations
  public prepare(query: string) {
    return {
      run: (...params: any[]) => {
        return this.executeQuery(query, params);
      },
      get: (...params: any[]) => {
        return this.executeQuery(query, params, true);
      },
      all: (...params: any[]) => {
        return this.executeQuery(query, params, false, true);
      }
    };
  }

  private executeQuery(query: string, params: any[], single = false, all = false): any {
    const normalizedQuery = query.trim().toUpperCase();
    
    // Debug UPDATE MESSAGES queries
    if (normalizedQuery.includes('UPDATE MESSAGES')) {
      console.log('🔍 UPDATE MESSAGES query detected:');
      console.log('Original query:', query);
      console.log('Normalized query:', normalizedQuery);
      console.log('Params:', params);
    }
    
    if (normalizedQuery.startsWith('INSERT INTO USERS')) {
      const [username, email, password, avatar, displayName, bio, semester, department, profileSetupComplete, passwordSetupComplete] = params;
      const id = ++this.data.sequences.users;
      const now = new Date().toISOString();
      const user = {
        id,
        username,
        email,
        password,
        avatar: avatar || '',
        displayName: displayName || username,
        bio: bio || '',
        semester: semester || '',
        department: department || '',
        profileSetupComplete: profileSetupComplete || false,
        passwordSetupComplete: passwordSetupComplete || false,
        created_at: now,
        updated_at: now
      };
      this.data.users.push(user);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.startsWith('INSERT INTO POSTS')) {
      const [user_id, image, caption] = params;
      const id = ++this.data.sequences.posts;
      const now = new Date().toISOString();
      const post = {
        id,
        user_id,
        image,
        caption: caption || '',
        pinned: 0,
        likes_count: 0,
        comments_count: 0,
        created_at: now,
        updated_at: now
      };
      this.data.posts.push(post);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.startsWith('INSERT INTO LIKES')) {
      const [user_id, post_id] = params;
      const existing = this.data.likes.find(l => l.user_id === user_id && l.post_id === post_id);
      if (!existing) {
        const id = ++this.data.sequences.likes;
        const like = {
          id,
          user_id,
          post_id,
          created_at: new Date().toISOString()
        };
        this.data.likes.push(like);
        
        // Update post likes_count
        const post = this.data.posts.find(p => p.id === post_id);
        if (post) {
          post.likes_count = this.data.likes.filter(l => l.post_id === post_id).length;
        }
        
        this.saveData();
        return { lastInsertRowid: id };
      }
      return { lastInsertRowid: null };
    }

    if (normalizedQuery.startsWith('INSERT INTO COMMENTS')) {
      const [user_id, post_id, content] = params;
      const id = ++this.data.sequences.comments;
      const now = new Date().toISOString();
      const comment = {
        id,
        user_id,
        post_id,
        content,
        created_at: now,
        updated_at: now
      };
      this.data.comments.push(comment);
      
      // Update post comments_count
      const post = this.data.posts.find(p => p.id === post_id);
      if (post) {
        post.comments_count = this.data.comments.filter(c => c.post_id === post_id).length;
      }
      
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM USERS WHERE ID')) {
      const id = params[0];
      return this.data.users.find(u => u.id === id) || null;
    }

    if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM USERS WHERE USERNAME')) {
      const username = params[0];
      return this.data.users.find(u => u.username === username) || null;
    }

    // Handle username uniqueness check: SELECT id FROM users WHERE username = ? AND id != ?
    if (normalizedQuery.includes('SELECT ID FROM USERS WHERE USERNAME') && normalizedQuery.includes('AND ID !=')) {
      const [username, excludeUserId] = params;
      return this.data.users.find(u => u.username === username && u.id !== excludeUserId) || null;
    }

    if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM USERS WHERE EMAIL')) {
      const email = params[0];
      return this.data.users.find(u => u.email === email) || null;
    }

    if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM USERS ORDER BY')) {
      return this.data.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM POSTS WHERE ID')) {
      const id = params[0];
      return this.data.posts.find(p => p.id === id) || null;
    }

    if (normalizedQuery.includes('JOIN USERS') && normalizedQuery.includes('ORDER BY P.CREATED_AT DESC')) {
      return this.data.posts
        .map(post => {
          const user = this.data.users.find(u => u.id === post.user_id);
          return {
            ...post,
            username: user?.username || '',
            user_avatar: user?.avatar || ''
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (normalizedQuery.includes('JOIN USERS') && normalizedQuery.includes('WHERE P.USER_ID')) {
      const userId = params[0];
      return this.data.posts
        .filter(post => post.user_id === userId)
        .map(post => {
          const user = this.data.users.find(u => u.id === post.user_id);
          return {
            ...post,
            username: user?.username || '',
            user_avatar: user?.avatar || ''
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (normalizedQuery.includes('DELETE FROM LIKES WHERE USER_ID')) {
      const [user_id, post_id] = params;
      const index = this.data.likes.findIndex(l => l.user_id === user_id && l.post_id === post_id);
      if (index !== -1) {
        this.data.likes.splice(index, 1);
        
        // Update post likes_count
        const post = this.data.posts.find(p => p.id === post_id);
        if (post) {
          post.likes_count = this.data.likes.filter(l => l.post_id === post_id).length;
        }
        
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalizedQuery.includes('SELECT ID FROM LIKES WHERE USER_ID')) {
      const [user_id, post_id] = params;
      return this.data.likes.find(l => l.user_id === user_id && l.post_id === post_id) || null;
    }

    // Comment queries
    if (normalizedQuery.includes('SELECT * FROM COMMENTS WHERE ID')) {
      const id = params[0];
      return this.data.comments.find(c => c.id === id) || null;
    }

    if (normalizedQuery.includes('JOIN USERS') && normalizedQuery.includes('WHERE C.POST_ID')) {
      const postId = params[0];
      return this.data.comments
        .filter(comment => comment.post_id === postId)
        .map(comment => {
          const user = this.data.users.find(u => u.id === comment.user_id);
          return {
            ...comment,
            username: user?.username || '',
            user_avatar: user?.avatar || ''
          };
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // Follow operations
    if (normalizedQuery.startsWith('INSERT INTO FOLLOWS')) {
      const [follower_id, following_id] = params;
      const existing = this.data.follows.find(f => f.follower_id === follower_id && f.following_id === following_id);
      if (!existing) {
        const id = ++this.data.sequences.follows;
        const follow = {
          id,
          follower_id,
          following_id,
          created_at: new Date().toISOString()
        };
        this.data.follows.push(follow);
        this.saveData();
        return { lastInsertRowid: id };
      }
      return { lastInsertRowid: null };
    }

    if (normalizedQuery.includes('DELETE FROM FOLLOWS WHERE FOLLOWER_ID')) {
      const [follower_id, following_id] = params;
      const index = this.data.follows.findIndex(f => f.follower_id === follower_id && f.following_id === following_id);
      if (index !== -1) {
        this.data.follows.splice(index, 1);
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalizedQuery.includes('SELECT * FROM FOLLOWS WHERE FOLLOWER_ID')) {
      const [follower_id, following_id] = params;
      return this.data.follows.find(f => f.follower_id === follower_id && f.following_id === following_id) || null;
    }

    // Count queries for follows
    if (normalizedQuery.includes('SELECT COUNT(*) AS COUNT FROM FOLLOWS WHERE FOLLOWING_ID')) {
      const following_id = params[0];
      const count = this.data.follows.filter(f => f.following_id === following_id).length;
      return { count };
    }

    if (normalizedQuery.includes('SELECT COUNT(*) AS COUNT FROM FOLLOWS WHERE FOLLOWER_ID')) {
      const follower_id = params[0];
      const count = this.data.follows.filter(f => f.follower_id === follower_id).length;
      return { count };
    }

    // Get followers list
    if (normalizedQuery.includes('JOIN FOLLOWS F ON U.ID = F.FOLLOWER_ID') && normalizedQuery.includes('WHERE F.FOLLOWING_ID')) {
      const following_id = params[0];
      const followerIds = this.data.follows.filter(f => f.following_id === following_id).map(f => f.follower_id);
      return this.data.users.filter(u => followerIds.includes(u.id));
    }

    // Get following list
    if (normalizedQuery.includes('JOIN FOLLOWS F ON U.ID = F.FOLLOWING_ID') && normalizedQuery.includes('WHERE F.FOLLOWER_ID')) {
      const follower_id = params[0];
      const followingIds = this.data.follows.filter(f => f.follower_id === follower_id).map(f => f.following_id);
      return this.data.users.filter(u => followingIds.includes(u.id));
    }

    // Saved posts operations
    if (normalizedQuery.startsWith('INSERT INTO SAVED_POSTS')) {
      const [user_id, post_id] = params;
      const existing = this.data.saved_posts.find(s => s.user_id === user_id && s.post_id === post_id);
      if (!existing) {
        const id = ++this.data.sequences.saved_posts;
        const savedPost = {
          id,
          user_id,
          post_id,
          created_at: new Date().toISOString()
        };
        this.data.saved_posts.push(savedPost);
        this.saveData();
        return { lastInsertRowid: id };
      }
      return { lastInsertRowid: null };
    }

    if (normalizedQuery.includes('DELETE FROM SAVED_POSTS WHERE USER_ID')) {
      const [user_id, post_id] = params;
      const index = this.data.saved_posts.findIndex(s => s.user_id === user_id && s.post_id === post_id);
      if (index !== -1) {
        this.data.saved_posts.splice(index, 1);
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalizedQuery.includes('SELECT * FROM SAVED_POSTS WHERE USER_ID')) {
      if (params.length === 2) {
        const [user_id, post_id] = params;
        return this.data.saved_posts.find(s => s.user_id === user_id && s.post_id === post_id) || null;
      } else {
        const user_id = params[0];
        return this.data.saved_posts.filter(s => s.user_id === user_id);
      }
    }

    // Notification operations
    if (normalizedQuery.startsWith('INSERT INTO NOTIFICATIONS')) {
      const [user_id, type, from_user_id, post_id, message] = params;
      const id = ++this.data.sequences.notifications;
      const notification = {
        id,
        user_id,
        type,
        from_user_id,
        post_id: post_id || null,
        message,
        read: false,
        created_at: new Date().toISOString()
      };
      this.data.notifications.push(notification);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.includes('SELECT * FROM NOTIFICATIONS WHERE USER_ID')) {
      const user_id = params[0];
      return this.data.notifications
        .filter(notification => notification.user_id === user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // OTP operations
    if (normalizedQuery.startsWith('INSERT INTO OTP_CODES')) {
      const [email, code, expires_at] = params;
      const id = ++this.data.sequences.otp_codes;
      const otp = {
        id,
        email,
        code,
        expires_at,
        used: false,
        created_at: new Date().toISOString()
      };
      this.data.otp_codes.push(otp);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.includes('SELECT * FROM OTP_CODES WHERE EMAIL')) {
      const email = params[0];
      return this.data.otp_codes
        .filter(otp => otp.email === email && !otp.used)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (normalizedQuery.includes('UPDATE OTP_CODES SET USED')) {
      const [email, code] = params;
      const otp = this.data.otp_codes.find(o => o.email === email && o.code === code && !o.used);
      if (otp) {
        otp.used = true;
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // Handle UPDATE posts queries
    if (normalizedQuery.includes('UPDATE POSTS SET')) {
      if (normalizedQuery.includes('PINNED')) {
        const [pinnedValue, postId] = params;
        const post = this.data.posts.find(p => p.id === postId);
        if (post) {
          post.pinned = pinnedValue;
          post.updated_at = new Date().toISOString();
          this.saveData();
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      if (normalizedQuery.includes('CAPTION')) {
        const [caption, postId] = params;
        const post = this.data.posts.find(p => p.id === postId);
        if (post) {
          post.caption = caption;
          post.updated_at = new Date().toISOString();
          this.saveData();
          return { changes: 1 };
        }
        return { changes: 0 };
      }
    }

    // Handle SELECT pinned FROM posts WHERE id = ?
    if (normalizedQuery.includes('SELECT PINNED FROM POSTS WHERE ID')) {
      const postId = params[0];
      const post = this.data.posts.find(p => p.id === postId);
      return post ? { pinned: post.pinned || 0 } : null;
    }

    // Handle DELETE FROM posts WHERE id = ?
    if (normalizedQuery.includes('DELETE FROM POSTS WHERE ID')) {
      const postId = params[0];
      const index = this.data.posts.findIndex(p => p.id === postId);
      if (index !== -1) {
        this.data.posts.splice(index, 1);
        // Also remove related likes, comments, saved posts
        this.data.likes = this.data.likes.filter(l => l.post_id !== postId);
        this.data.comments = this.data.comments.filter(c => c.post_id !== postId);
        this.data.saved_posts = this.data.saved_posts.filter(s => s.post_id !== postId);
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // Handle UPDATE users queries
    if (normalizedQuery.includes('UPDATE USERS SET')) {
      const userId = params[params.length - 1]; // Last parameter is always the user ID
      const user = this.data.users.find(u => u.id === userId);
      
      if (user) {
        // Parse the query to understand what fields to update
        if (query.includes('username = ?')) {
          // For username updates: UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          // Parameters: [newUsername, userId]
          user.username = params[0];
        }
        if (query.includes('displayName')) {
          const displayNameIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('displayName'));
          if (displayNameIndex !== -1) user.displayName = params[displayNameIndex];
        }
        if (query.includes('bio')) {
          const bioIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('bio'));
          if (bioIndex !== -1) user.bio = params[bioIndex];
        }
        if (query.includes('avatar')) {
          const avatarIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('avatar'));
          if (avatarIndex !== -1) user.avatar = params[avatarIndex];
        }
        if (query.includes('semester')) {
          const semesterIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('semester'));
          if (semesterIndex !== -1) user.semester = params[semesterIndex];
        }
        if (query.includes('department')) {
          const departmentIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('department'));
          if (departmentIndex !== -1) user.department = params[departmentIndex];
        }
        if (query.includes('profileSetupComplete')) {
          user.profileSetupComplete = true;
        }
        if (query.includes('passwordSetupComplete')) {
          user.passwordSetupComplete = true;
        }
        if (query.includes('password =') && !query.includes('profileSetupComplete')) {
          const passwordIndex = params.findIndex((_, i) => query.split('?')[i]?.includes('password'));
          if (passwordIndex !== -1) user.password = params[passwordIndex];
        }
        
        user.updated_at = new Date().toISOString();
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalizedQuery.includes('UPDATE NOTIFICATIONS SET READ')) {
      const user_id = params[0];
      this.data.notifications.forEach(notification => {
        if (notification.user_id === user_id) {
          notification.read = true;
        }
      });
      this.saveData();
      return { changes: this.data.notifications.filter(n => n.user_id === user_id).length };
    }

    // Messaging operations
    if (normalizedQuery.startsWith('INSERT INTO CONVERSATIONS')) {
      const [participant1_id, participant2_id] = params;
      const id = ++this.data.sequences.conversations;
      const now = new Date().toISOString();
      const conversation = {
        id,
        participant1_id,
        participant2_id,
        last_message_id: null,
        last_message_at: now,
        created_at: now,
        updated_at: now
      };
      this.data.conversations.push(conversation);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.startsWith('INSERT INTO MESSAGES')) {
      const [conversation_id, sender_id, content, message_type, media_url] = params;
      const id = ++this.data.sequences.messages;
      const now = new Date().toISOString();
      const message = {
        id,
        conversation_id,
        sender_id,
        content,
        message_type: message_type || 'text',
        media_url: media_url || null,
        is_read: false,
        created_at: now,
        updated_at: now
      };
      this.data.messages.push(message);
      this.saveData();
      return { lastInsertRowid: id };
    }

    if (normalizedQuery.includes('SELECT * FROM CONVERSATIONS WHERE PARTICIPANT1_ID') && normalizedQuery.includes('AND PARTICIPANT2_ID')) {
      const [participant1_id, participant2_id] = params;
      return this.data.conversations.find(c => 
        c.participant1_id === participant1_id && c.participant2_id === participant2_id
      ) || null;
    }

    if (normalizedQuery.includes('SELECT * FROM CONVERSATIONS WHERE ID')) {
      const id = params[0];
      return this.data.conversations.find(c => c.id === id) || null;
    }

    if (normalizedQuery.includes('SELECT * FROM MESSAGES WHERE ID')) {
      const id = params[0];
      return this.data.messages.find(m => m.id === id) || null;
    }

    // Get conversations with user details
    if (normalizedQuery.includes('FROM CONVERSATIONS C') && normalizedQuery.includes('LEFT JOIN USERS U1')) {
      const userId = params[0];
      return this.data.conversations
        .filter(c => c.participant1_id === userId || c.participant2_id === userId)
        .map(c => {
          const user1 = this.data.users.find(u => u.id === c.participant1_id);
          const user2 = this.data.users.find(u => u.id === c.participant2_id);
          const lastMessage = c.last_message_id ? this.data.messages.find(m => m.id === c.last_message_id) : null;
          const unreadMessages = this.data.messages.filter(m => 
            m.conversation_id === c.id && m.sender_id !== userId && !m.is_read
          );
          const unreadCount = unreadMessages.length;
          
          console.log(`📊 Conversation ${c.id} unread calculation:`, {
            conversationId: c.id,
            currentUserId: userId,
            totalMessages: this.data.messages.filter(m => m.conversation_id === c.id).length,
            unreadMessages: unreadMessages.map(m => ({
              id: m.id,
              content: m.content,
              sender_id: m.sender_id,
              is_read: m.is_read
            })),
            unreadCount
          });
          
          return {
            ...c,
            participant1_username: user1?.username || '',
            participant1_avatar: user1?.avatar || '',
            participant2_username: user2?.username || '',
            participant2_avatar: user2?.avatar || '',
            last_message_content: lastMessage?.content || '',
            unread_count: unreadCount
          };
        })
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    }

    // Get messages in conversation with sender details
    if (normalizedQuery.includes('FROM MESSAGES M') && normalizedQuery.includes('JOIN USERS U ON M.SENDER_ID')) {
      const [conversationId, limit, offset] = params;
      return this.data.messages
        .filter(m => m.conversation_id === conversationId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset || 0, (offset || 0) + (limit || 50))
        .map(m => {
          const sender = this.data.users.find(u => u.id === m.sender_id);
          return {
            ...m,
            sender_username: sender?.username || '',
            sender_avatar: sender?.avatar || ''
          };
        });
    }

    // Mark messages as read
    if (normalizedQuery.includes('UPDATE MESSAGES SET IS_READ = TRUE')) {
      console.log('UPDATE MESSAGES handler matched!');
      const [conversationId, userId] = params;
      console.log('Params:', { conversationId, userId });
      let changes = 0;
      console.log('Messages before update:', this.data.messages.length);
      this.data.messages.forEach(message => {
        if (message.conversation_id === conversationId && message.sender_id !== userId && !message.is_read) {
          console.log(`Marking message ${message.id} as read: ${message.content}`);
          message.is_read = true;
          changes++;
        }
      });
      console.log(`UPDATE MESSAGES: Changed ${changes} messages`);
      if (changes > 0) {
        this.saveData();
      }
      return { changes };
    }

    // Update conversation last message
    if (normalizedQuery.includes('UPDATE CONVERSATIONS SET LAST_MESSAGE_ID')) {
      const [messageId, timestamp, conversationId] = params;
      const conversation = this.data.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.last_message_id = messageId;
        conversation.last_message_at = timestamp;
        conversation.updated_at = new Date().toISOString();
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // Get unread message count for user
    if (normalizedQuery.includes('SELECT COUNT(*) AS COUNT FROM MESSAGES M') && normalizedQuery.includes('JOIN CONVERSATIONS C')) {
      const [userId1, userId2, userId3] = params;
      const count = this.data.messages.filter(m => {
        const conversation = this.data.conversations.find(c => c.id === m.conversation_id);
        return conversation && 
               (conversation.participant1_id === userId1 || conversation.participant2_id === userId2) &&
               m.sender_id !== userId3 && 
               !m.is_read;
      }).length;
      return { count };
    }

    return null;
  }

  public clearData(): void {
    localStorage.removeItem(this.storageKey);
    this.data = this.loadData();
  }

  public getStorageInfo(): { usedMB: string; totalPosts: number; totalUsers: number } {
    const dataString = JSON.stringify(this.data);
    const usedMB = (dataString.length / 1024 / 1024).toFixed(2);
    return {
      usedMB,
      totalPosts: this.data.posts.length,
      totalUsers: this.data.users.length
    };
  }
}

export default DatabaseConnection;