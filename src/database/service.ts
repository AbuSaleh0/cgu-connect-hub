import DatabaseConnection from './connection';
import { SHA256 } from 'crypto-js';
import { 
  User, 
  UserPublic,
  Post, 
  PostWithUser, 
  Like, 
  Comment, 
  CommentWithUser,
  CreateUserData, 
  CreatePostData, 
  CreateCommentData, 
  CreateLikeData,
  LoginData,
  AuthResult,
  OTPCode,
  CreateOTPData,
  VerifyOTPData,
  GoogleUserData,
  UpdateProfileData
} from './types';

export class DatabaseService {
  private db = DatabaseConnection.getInstance();

  // User operations
  createUser(userData: CreateUserData): User {
    const hashedPassword = SHA256(userData.password).toString();
    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, password, avatar, displayName, bio, semester, department, profileSetupComplete) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userData.username, 
      userData.email, 
      hashedPassword, 
      userData.avatar || null,
      userData.displayName || userData.username,
      userData.bio || '',
      userData.semester || '',
      userData.department || '',
      userData.profileSetupComplete || false
    );
    return this.getUserById(Number(result.lastInsertRowid))!;
  }

  getUserById(id: number): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  getUserByUsername(username: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | null;
  }

  getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all() as User[];
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  // Authentication methods
  signup(userData: CreateUserData): AuthResult {
    try {
      // Check if username already exists
      const existingUsername = this.getUserByUsername(userData.username);
      if (existingUsername) {
        return {
          success: false,
          error: 'Username already exists'
        };
      }

      // Check if email already exists
      const existingEmail = this.getUserByEmail(userData.email);
      if (existingEmail) {
        return {
          success: false,
          error: 'Email already registered'
        };
      }

      // Validate email domain (CGU requirement)
      if (!userData.email.endsWith('@cgu-odisha.ac.in')) {
        return {
          success: false,
          error: 'Must use a valid @cgu-odisha.ac.in email address'
        };
      }

      // Validate username format
      const usernamePattern = /^[a-z0-9._]+$/;
      if (!usernamePattern.test(userData.username)) {
        return {
          success: false,
          error: 'Username can only contain lowercase letters, numbers, dots, and underscores'
        };
      }

      // Validate username length
      if (userData.username.length < 3 || userData.username.length > 20) {
        return {
          success: false,
          error: 'Username must be between 3 and 20 characters long'
        };
      }

      // Validate password strength
      if (userData.password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        };
      }

      // Create user
      const user = this.createUser(userData);
      const publicUser = this.toPublicUser(user);

      return {
        success: true,
        user: publicUser
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'An error occurred during signup'
      };
    }
  }

  login(loginData: LoginData): AuthResult {
    try {
      // Find user by email
      const user = this.getUserByEmail(loginData.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Verify password
      const hashedPassword = SHA256(loginData.password).toString();
      if (user.password !== hashedPassword) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      const publicUser = this.toPublicUser(user);
      return {
        success: true,
        user: publicUser
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An error occurred during login'
      };
    }
  }

  // Helper method to convert User to UserPublic (removing password)
  private toPublicUser(user: User): UserPublic {
    const { password, ...publicUser } = user;
    return publicUser;
  }

  // Check if username is available
  checkUsernameAvailability(username: string): { available: boolean; error?: string } {
    try {
      // Validate username format
      const usernamePattern = /^[a-z0-9._]+$/;
      if (!usernamePattern.test(username)) {
        return {
          available: false,
          error: 'Username can only contain lowercase letters, numbers, dots, and underscores'
        };
      }

      // Validate username length
      if (username.length < 3 || username.length > 20) {
        return {
          available: false,
          error: 'Username must be between 3 and 20 characters long'
        };
      }

      // Check if username exists
      const existingUser = this.getUserByUsername(username);
      if (existingUser) {
        return {
          available: false,
          error: 'Username is already taken'
        };
      }

      return { available: true };
    } catch (error) {
      console.error('Check username availability error:', error);
      return {
        available: false,
        error: 'Error checking username availability'
      };
    }
  }

  // OTP operations
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Simulate email validation (in real app, you'd use an email validation API)
  private async validateEmailExists(email: string): Promise<boolean> {
    // Simulate email validation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demo purposes, we'll accept emails that follow CGU pattern
    // In real app, you'd use services like ZeroBounce, Hunter.io, etc.
    const emailRegex = /^[a-zA-Z0-9._%+-]+@cgu-odisha\.ac\.in$/;
    return emailRegex.test(email);
  }

  async sendOTP(email: string): Promise<{ success: boolean; error?: string; otp?: string }> {
    try {
      console.log('🔍 Validating email format and domain...');
      
      // Validate email format
      if (!email.endsWith('@cgu-odisha.ac.in')) {
        return {
          success: false,
          error: 'Must use a valid @cgu-odisha.ac.in email address'
        };
      }

      // Basic email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Please enter a valid email address'
        };
      }

      console.log('📧 Checking if email exists...');
      
      // Validate if email exists (simulated)
      const emailExists = await this.validateEmailExists(email);
      if (!emailExists) {
        return {
          success: false,
          error: 'This email address does not exist or is invalid'
        };
      }

      console.log('✅ Email validation passed');

      // Check if email already exists in our system
      const existingUser = this.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email is already registered'
        };
      }

      console.log('🔢 Generating OTP...');

      // Generate OTP
      const code = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

      // Clear any existing unused OTPs for this email
      const clearStmt = this.db.prepare(`
        UPDATE otp_codes SET used = true WHERE email = ? AND used = false
      `);
      clearStmt.run(email);

      // Store OTP in database
      const stmt = this.db.prepare(`
        INSERT INTO otp_codes (email, code, expires_at) 
        VALUES (?, ?, ?)
      `);
      
      stmt.run(email, code, expiresAt.toISOString());

      console.log('📤 Sending OTP to email...');
      
      // In a real app, you would send email here using services like:
      // - SendGrid, Mailgun, AWS SES, etc.
      // For demo purposes, we'll show it in an alert and console
      console.log(`🔐 OTP Generated for ${email}: ${code}`);
      console.log(`⏰ OTP expires at: ${expiresAt.toLocaleString()}`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('✅ OTP sent successfully!');

      return { 
        success: true,
        otp: code // Only for demo purposes - NEVER return OTP in production!
      };
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      return {
        success: false,
        error: 'Failed to send OTP. Please try again.'
      };
    }
  }

  verifyOTP(verifyData: VerifyOTPData): { success: boolean; error?: string } {
    try {
      console.log('🔍 Verifying OTP for:', verifyData.email);
      
      // Get recent OTPs for this email
      const stmt = this.db.prepare(`
        SELECT * FROM otp_codes WHERE email = ? AND used = false
      `);
      
      const otps = stmt.all(verifyData.email) as OTPCode[];
      
      console.log('📋 Found OTPs:', otps.length);
      
      if (otps.length === 0) {
        return {
          success: false,
          error: 'No valid OTP found. Please request a new OTP.'
        };
      }

      // Check if any OTP matches the provided code
      const matchingOTP = otps.find(otp => otp.code === verifyData.code);
      
      if (!matchingOTP) {
        return {
          success: false,
          error: 'Incorrect OTP. Please check and try again.'
        };
      }

      // Check if the matching OTP is expired
      const now = new Date();
      const expiryTime = new Date(matchingOTP.expires_at);
      
      if (expiryTime <= now) {
        // Mark expired OTP as used
        const markExpiredStmt = this.db.prepare(`
          UPDATE otp_codes SET used = true WHERE email = ? AND code = ?
        `);
        markExpiredStmt.run(verifyData.email, verifyData.code);
        
        return {
          success: false,
          error: 'OTP has expired. Please request a new OTP.'
        };
      }

      // Valid OTP found - mark it as used
      const updateStmt = this.db.prepare(`
        UPDATE otp_codes SET used = true WHERE email = ? AND code = ?
      `);
      
      updateStmt.run(verifyData.email, verifyData.code);

      console.log('✅ OTP verified successfully!');

      return { success: true };
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      return {
        success: false,
        error: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Post operations
  createPost(postData: CreatePostData): Post {
    const stmt = this.db.prepare(`
      INSERT INTO posts (user_id, image, caption) 
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(postData.user_id, postData.image, postData.caption || null);
    return this.getPostById(Number(result.lastInsertRowid))!;
  }

  getPostById(id: number): Post | null {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE id = ?');
    return stmt.get(id) as Post | null;
  }

  getAllPosts(): PostWithUser[] {
    const stmt = this.db.prepare(`
      SELECT 
        p.*,
        u.username,
        u.avatar as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    return stmt.all() as PostWithUser[];
  }

  getPostsByUser(userId: number): PostWithUser[] {
    const stmt = this.db.prepare(`
      SELECT 
        p.*,
        u.username,
        u.avatar as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `);
    return stmt.all(userId) as PostWithUser[];
  }

  deletePost(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Like operations
  toggleLike(likeData: CreateLikeData): boolean {
    const existingLike = this.db.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
    ).get(likeData.user_id, likeData.post_id);

    if (existingLike) {
      // Unlike
      const deleteStmt = this.db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?');
      deleteStmt.run(likeData.user_id, likeData.post_id);
      return false; // unliked
    } else {
      // Like
      const insertStmt = this.db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)');
      insertStmt.run(likeData.user_id, likeData.post_id);
      return true; // liked
    }
  }

  isPostLikedByUser(userId: number, postId: number): boolean {
    const stmt = this.db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?');
    return !!stmt.get(userId, postId);
  }

  getPostLikes(postId: number): Like[] {
    const stmt = this.db.prepare('SELECT * FROM likes WHERE post_id = ?');
    return stmt.all(postId) as Like[];
  }

  // Comment operations
  createComment(commentData: CreateCommentData): Comment {
    const stmt = this.db.prepare(`
      INSERT INTO comments (user_id, post_id, content) 
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(commentData.user_id, commentData.post_id, commentData.content);
    return this.getCommentById(Number(result.lastInsertRowid))!;
  }

  getCommentById(id: number): Comment | null {
    const stmt = this.db.prepare('SELECT * FROM comments WHERE id = ?');
    return stmt.get(id) as Comment | null;
  }

  getPostComments(postId: number): CommentWithUser[] {
    const stmt = this.db.prepare(`
      SELECT 
        c.*,
        u.username,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `);
    return stmt.all(postId) as CommentWithUser[];
  }

  deleteComment(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Google Authentication
  loginOrRegisterWithGoogle(googleUser: GoogleUserData): AuthResult {
    try {
      // Validate email domain
      if (!googleUser.email.endsWith('@cgu-odisha.ac.in')) {
        return {
          success: false,
          error: 'Access restricted to CGU students. Please use your @cgu-odisha.ac.in email address.'
        };
      }

      // Check if user already exists
      let user = this.getUserByEmail(googleUser.email);
      
      if (user) {
        // User exists, log them in
        const publicUser = this.toPublicUser(user);
        return {
          success: true,
          user: publicUser
        };
      } else {
        // Create new user
        const username = this.generateUsernameFromEmail(googleUser.email);
        const userData: CreateUserData = {
          username,
          email: googleUser.email,
          password: 'google_auth', // Placeholder password for Google users
          avatar: googleUser.picture || '',
          displayName: googleUser.name || username,
          bio: '',
          semester: '',
          department: '',
          profileSetupComplete: false
        };
        
        user = this.createUser(userData);
        const publicUser = this.toPublicUser(user);
        
        return {
          success: true,
          user: publicUser
        };
      }
    } catch (error) {
      console.error('Google auth error:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  private generateUsernameFromEmail(email: string): string {
    // Extract username part from email and make it unique
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '_');
    
    // Check if username exists
    let username = baseUsername;
    let counter = 1;
    
    while (this.getUserByUsername(username)) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }
    
    return username;
  }

  // Profile management
  updateUserProfile(userId: number, profileData: UpdateProfileData): { success: boolean; error?: string } {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (profileData.displayName !== undefined) {
        updates.push('displayName = ?');
        values.push(profileData.displayName);
      }
      
      if (profileData.bio !== undefined) {
        updates.push('bio = ?');
        values.push(profileData.bio);
      }
      
      if (profileData.avatar !== undefined) {
        updates.push('avatar = ?');
        values.push(profileData.avatar);
      }
      
      if (profileData.semester !== undefined) {
        updates.push('semester = ?');
        values.push(profileData.semester);
      }
      
      if (profileData.department !== undefined) {
        updates.push('department = ?');
        values.push(profileData.department);
      }
      
      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      
      const stmt = this.db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `);
      
      stmt.run(...values);
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  completeProfileSetup(userId: number): { success: boolean; error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE users SET profileSetupComplete = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      
      stmt.run(userId);
      return { success: true };
    } catch (error) {
      console.error('Complete profile setup error:', error);
      return { success: false, error: 'Failed to complete profile setup' };
    }
  }

  // Utility methods
  getPostsWithDetails(): PostWithUser[] {
    return this.getAllPosts();
  }

  // Format timestamp for display (similar to current mock data)
  formatTimestamp(timestamp: string): string {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInMs = now.getTime() - postDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return postDate.toLocaleDateString();
    }
  }
}

// Export singleton instance
export const dbService = new DatabaseService();