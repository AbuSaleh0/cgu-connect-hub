// Browser-compatible database using localStorage
interface DatabaseData {
  users: any[];
  posts: any[];
  likes: any[];
  comments: any[];
  otp_codes: any[];
  sequences: {
    users: number;
    posts: number;
    likes: number;
    comments: number;
    otp_codes: number;
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
      otp_codes: [],
      sequences: {
        users: 0,
        posts: 0,
        likes: 0,
        comments: 0,
        otp_codes: 0
      }
    };
  }

  private saveData(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
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
    
    if (normalizedQuery.startsWith('INSERT INTO USERS')) {
      const [username, email, password, avatar, displayName, bio, semester, department, profileSetupComplete] = params;
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

    // Handle UPDATE users queries
    if (normalizedQuery.includes('UPDATE USERS SET')) {
      const userId = params[params.length - 1]; // Last parameter is always the user ID
      const user = this.data.users.find(u => u.id === userId);
      
      if (user) {
        // Parse the query to understand what fields to update
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
        
        user.updated_at = new Date().toISOString();
        this.saveData();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    return null;
  }

  public clearData(): void {
    localStorage.removeItem(this.storageKey);
    this.data = this.loadData();
  }
}

export default DatabaseConnection;