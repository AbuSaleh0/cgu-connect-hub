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

export class DatabaseService {
  private db = DatabaseConnection.getInstance();

  // User operations
  createUser(userData: CreateUserData): User {
    const hashedPassword = SHA256(userData.password).toString();
    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, password, avatar, displayName, bio, semester, department, profileSetupComplete, passwordSetupComplete) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userData.profileSetupComplete || false,
      userData.passwordSetupComplete || false
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
      // Find user by email or username
      let user = this.getUserByEmail(loginData.email);
      if (!user) {
        user = this.getUserByUsername(loginData.email); // Try as username
      }
      
      if (!user) {
        return {
          success: false,
          error: 'User does not exist. Please check your username/email or sign up first.'
        };
      }

      // Verify password
      const hashedPassword = SHA256(loginData.password).toString();
      if (user.password !== hashedPassword) {
        return {
          success: false,
          error: 'Invalid credentials. Please check your password and try again.'
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
      INSERT INTO posts (user_id, image, caption, pinned) 
      VALUES (?, ?, ?, 0)
    `);
    
    const result = stmt.run(
      postData.user_id, 
      postData.image,
      postData.caption || null
    );
    return this.getPostById(Number(result.lastInsertRowid))!;
  }

  getPostById(id: number): Post | null {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE id = ?');
    return stmt.get(id) as Post | null;
  }

  getPostWithUserById(id: number): PostWithUser | null {
    const stmt = this.db.prepare(`
      SELECT 
        p.*,
        u.username,
        u.avatar as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `);
    return stmt.get(id) as PostWithUser | null;
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
      WHERE p.user_id = ? AND u.id = ?
      ORDER BY p.created_at DESC
    `);
    return stmt.all(userId, userId) as PostWithUser[];
  }

  deletePost(id: number): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM posts WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
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
      
      // Create notification for post owner
      try {
        const post = this.getPostById(likeData.post_id);
        const liker = this.getUserById(likeData.user_id);
        if (post && liker && post.user_id !== likeData.user_id) {
          this.createNotification({
            user_id: post.user_id,
            type: 'like',
            from_user_id: likeData.user_id,
            post_id: likeData.post_id,
            message: `${liker.username} liked your post`
          });
        }
      } catch (error) {
        console.error('Error creating like notification:', error);
      }
      
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
    
    // Create notification for post owner
    try {
      const post = this.getPostById(commentData.post_id);
      const commenter = this.getUserById(commentData.user_id);
      if (post && commenter && post.user_id !== commentData.user_id) {
        this.createNotification({
          user_id: post.user_id,
          type: 'comment',
          from_user_id: commentData.user_id,
          post_id: commentData.post_id,
          message: `${commenter.username} commented on your post`
        });
      }
    } catch (error) {
      console.error('Error creating comment notification:', error);
    }
    
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

  // Google Authentication for Login
  loginWithGoogle(googleUser: GoogleUserData): AuthResult {
    try {
      // Validate email domain
      if (!googleUser.email.endsWith('@cgu-odisha.ac.in')) {
        return {
          success: false,
          error: 'Access restricted to CGU students. Please use your @cgu-odisha.ac.in email address.'
        };
      }

      // Check if user exists
      const user = this.getUserByEmail(googleUser.email);
      
      if (user) {
        const publicUser = this.toPublicUser(user);
        return {
          success: true,
          user: publicUser
        };
      } else {
        return {
          success: false,
          error: 'No account found. Please sign up first.'
        };
      }
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  // Google Authentication for Signup
  signupWithGoogle(googleUser: GoogleUserData): AuthResult {
    try {
      // Validate email domain
      if (!googleUser.email.endsWith('@cgu-odisha.ac.in')) {
        return {
          success: false,
          error: 'Access restricted to CGU students. Please use your @cgu-odisha.ac.in email address.'
        };
      }

      // Check if user already exists
      const existingUser = this.getUserByEmail(googleUser.email);
      
      if (existingUser) {
        return {
          success: false,
          error: 'Email already registered. Please login instead.'
        };
      }

      // Create new user with temporary username
      const tempUsername = `temp_${Date.now()}`;
      const userData: CreateUserData = {
        username: tempUsername,
        email: googleUser.email,
        password: 'google_auth', // Placeholder password for Google users
        avatar: '',
        displayName: googleUser.name || '',
        bio: '',
        semester: '',
        department: '',
        profileSetupComplete: false,
        passwordSetupComplete: false
      };
      
      const user = this.createUser(userData);
      const publicUser = this.toPublicUser(user);
      
      return {
        success: true,
        user: publicUser
      };
    } catch (error) {
      console.error('Google signup error:', error);
      return {
        success: false,
        error: 'Signup failed. Please try again.'
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
      
      if (profileData.username !== undefined) {
        updates.push('username = ?');
        values.push(profileData.username);
      }
      
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

  updateUsername(userId: number, newUsername: string): boolean {
    try {
      console.log('updateUsername called with:', { userId, newUsername });
      
      // Validate username format
      const usernamePattern = /^[a-z0-9._]+$/;
      if (!usernamePattern.test(newUsername)) {
        console.log('Username validation failed: invalid format');
        return false;
      }
      
      // Validate username length
      if (newUsername.length < 3 || newUsername.length > 20) {
        console.log('Username validation failed: invalid length');
        return false;
      }
      
      // Check if username already exists (excluding current user)
      console.log('Checking username uniqueness...');
      const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, userId);
      console.log('Existing user check result:', existingUser);
      if (existingUser) {
        console.log('Username validation failed: already exists');
        return false;
      }
      
      // Update username
      console.log('Updating username in database...');
      const stmt = this.db.prepare('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = stmt.run(newUsername, userId);
      console.log('Database update result:', result);
      
      const success = result.changes > 0;
      console.log('Update username success:', success);
      return success;
    } catch (error) {
      console.error('Update username error:', error);
      return false;
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

  setupPassword(userId: number, password: string): { success: boolean; error?: string } {
    try {
      const hashedPassword = SHA256(password).toString();
      const stmt = this.db.prepare(`
        UPDATE users SET password = ?, passwordSetupComplete = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      
      stmt.run(hashedPassword, userId);
      return { success: true };
    } catch (error) {
      console.error('Setup password error:', error);
      return { success: false, error: 'Failed to setup password' };
    }
  }

  // Follow operations
  toggleFollow(followData: CreateFollowData): boolean {
    try {
      const existingFollow = this.db.prepare(
        'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?'
      ).get(followData.follower_id, followData.following_id);

      if (existingFollow) {
        // Unfollow
        const deleteStmt = this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
        deleteStmt.run(followData.follower_id, followData.following_id);
        return false; // unfollowed
      } else {
        // Follow
        const insertStmt = this.db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
        insertStmt.run(followData.follower_id, followData.following_id);
        
        // Create notification
        try {
          const follower = this.getUserById(followData.follower_id);
          if (follower) {
            this.createNotification({
              user_id: followData.following_id,
              type: 'follow',
              from_user_id: followData.follower_id,
              message: `${follower.username} started following you`
            });
          }
        } catch (notifError) {
          console.error('Error creating follow notification:', notifError);
        }
        
        return true; // followed
      }
    } catch (error) {
      console.error('Error in toggleFollow:', error);
      return false;
    }
  }

  // Check if user is following another user by username
  isFollowingUsername(followerId: number, followingUsername: string): boolean {
    try {
      const followingUser = this.getUserByUsername(followingUsername);
      if (!followingUser) return false;
      
      return this.isFollowing(followerId, followingUser.id);
    } catch (error) {
      console.error('Error checking follow status by username:', error);
      return false;
    }
  }

  isFollowing(followerId: number, followingId: number): boolean {
    try {
      const stmt = this.db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?');
      return !!stmt.get(followerId, followingId);
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Notification operations
  createNotification(notificationData: CreateNotificationData): Notification | null {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO notifications (user_id, type, from_user_id, post_id, message) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        notificationData.user_id, 
        notificationData.type, 
        notificationData.from_user_id, 
        notificationData.post_id || null,
        notificationData.message
      );
      return this.getNotificationById(Number(result.lastInsertRowid));
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  getNotificationById(id: number): Notification | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
      return stmt.get(id) as Notification | null;
    } catch (error) {
      console.error('Error getting notification by id:', error);
      return null;
    }
  }

  getUserNotifications(userId: number): Notification[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
      return stmt.all(userId) as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  markNotificationsAsRead(userId: number): void {
    try {
      const stmt = this.db.prepare('UPDATE notifications SET read = true WHERE user_id = ?');
      stmt.run(userId);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  getUnreadNotificationCount(userId: number): number {
    try {
      const notifications = this.getUserNotifications(userId);
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Utility methods
  getPostsWithDetails(): PostWithUser[] {
    return this.getAllPosts();
  }

  // Format timestamp for display
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

  getFollowerCount(userId: number): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?');
      const result = stmt.get(userId) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }
  }

  getFollowingCount(userId: number): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');
      const result = stmt.get(userId) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  }

  getFollowersList(userId: number): UserPublic[] {
    try {
      const stmt = this.db.prepare(`
        SELECT u.* FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = ?
      `);
      const users = stmt.all(userId) as User[];
      return users.map(user => {
        const { password, ...publicUser } = user;
        return publicUser;
      });
    } catch (error) {
      console.error('Error getting followers list:', error);
      return [];
    }
  }

  getFollowingList(userId: number): UserPublic[] {
    try {
      const stmt = this.db.prepare(`
        SELECT u.* FROM users u
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = ?
      `);
      const users = stmt.all(userId) as User[];
      return users.map(user => {
        const { password, ...publicUser } = user;
        return publicUser;
      });
    } catch (error) {
      console.error('Error getting following list:', error);
      return [];
    }
  }

  // Saved posts operations
  toggleSavePost(saveData: CreateSavedPostData): boolean {
    try {
      const existingSave = this.db.prepare(
        'SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?'
      ).get(saveData.user_id, saveData.post_id);

      if (existingSave) {
        // Unsave
        const deleteStmt = this.db.prepare('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?');
        deleteStmt.run(saveData.user_id, saveData.post_id);
        return false; // unsaved
      } else {
        // Save
        const insertStmt = this.db.prepare('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)');
        insertStmt.run(saveData.user_id, saveData.post_id);
        return true; // saved
      }
    } catch (error) {
      console.error('Error toggling save post:', error);
      return false;
    }
  }

  isPostSaved(userId: number, postId: number): boolean {
    try {
      const stmt = this.db.prepare('SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?');
      return !!stmt.get(userId, postId);
    } catch (error) {
      console.error('Error checking save status:', error);
      return false;
    }
  }

  // Follow user by username
  followUser(followData: { follower_id: number; following_username: string }): boolean {
    try {
      const followingUser = this.getUserByUsername(followData.following_username);
      if (!followingUser) return false;
      
      return this.toggleFollow({
        follower_id: followData.follower_id,
        following_id: followingUser.id
      });
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  // Unfollow user by username
  unfollowUser(followerId: number, followingUsername: string): boolean {
    try {
      const followingUser = this.getUserByUsername(followingUsername);
      if (!followingUser) return false;
      
      const deleteStmt = this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
      const result = deleteStmt.run(followerId, followingUser.id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  // Update post caption
  updatePostCaption(postId: number, caption: string): boolean {
    try {
      const stmt = this.db.prepare('UPDATE posts SET caption = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = stmt.run(caption, postId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating post caption:', error);
      return false;
    }
  }

  // Toggle pin post
  togglePinPost(postId: number): boolean {
    try {
      // Get current pinned status
      const stmt = this.db.prepare('SELECT pinned FROM posts WHERE id = ?');
      const post = stmt.get(postId) as { pinned: number } | undefined;
      
      if (!post) return false;
      
      const newPinnedState = post.pinned ? 0 : 1;
      const updateStmt = this.db.prepare('UPDATE posts SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = updateStmt.run(newPinnedState, postId);
      
      return result.changes > 0 && newPinnedState === 1;
    } catch (error) {
      console.error('Error toggling pin post:', error);
      return false;
    }
  }

  // ===== MESSAGING METHODS =====
  
  // Create a new conversation between two users
  createConversation(data: CreateConversationData): Conversation | null {
    try {
      // Ensure participant1_id is always smaller for consistent uniqueness
      const [participant1_id, participant2_id] = data.participant1_id < data.participant2_id 
        ? [data.participant1_id, data.participant2_id]
        : [data.participant2_id, data.participant1_id];

      // Check if conversation already exists
      const existing = this.getConversationBetweenUsers(participant1_id, participant2_id);
      if (existing) return existing;

      const stmt = this.db.prepare(`
        INSERT INTO conversations (participant1_id, participant2_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(participant1_id, participant2_id);
      
      if (result.lastInsertRowid) {
        return this.getConversationById(Number(result.lastInsertRowid));
      }
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  // Get conversation by ID
  getConversationById(id: number): Conversation | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
      return stmt.get(id) as Conversation | null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  // Get conversation between two users
  getConversationBetweenUsers(userId1: number, userId2: number): Conversation | null {
    try {
      const [participant1_id, participant2_id] = userId1 < userId2 
        ? [userId1, userId2]
        : [userId2, userId1];

      const stmt = this.db.prepare(`
        SELECT * FROM conversations 
        WHERE participant1_id = ? AND participant2_id = ?
      `);
      return stmt.get(participant1_id, participant2_id) as Conversation | null;
    } catch (error) {
      console.error('Error getting conversation between users:', error);
      return null;
    }
  }

  // Get all conversations for a user with user details and last message
  getUserConversations(userId: number): ConversationWithUsers[] {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.*,
          u1.username as participant1_username,
          u1.avatar as participant1_avatar,
          u2.username as participant2_username,  
          u2.avatar as participant2_avatar,
          m.content as last_message_content,
          (SELECT COUNT(*) FROM messages 
           WHERE conversation_id = c.id 
           AND sender_id != ? 
           AND is_read = FALSE) as unread_count
        FROM conversations c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE c.participant1_id = ? OR c.participant2_id = ?
        ORDER BY c.last_message_at DESC
      `);
      return stmt.all(userId, userId, userId) as ConversationWithUsers[];
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  // Send a message
  createMessage(data: CreateMessageData): Message | null {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        data.conversation_id,
        data.sender_id,
        data.content,
        data.message_type || 'text',
        data.media_url || null
      );
      
      if (result.lastInsertRowid) {
        return this.getMessageById(Number(result.lastInsertRowid));
      }
      return null;
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  }

  // Get message by ID
  getMessageById(id: number): Message | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
      return stmt.get(id) as Message | null;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      return null;
    }
  }

  // Get messages in a conversation with sender details
  getConversationMessages(conversationId: number, limit = 50, offset = 0): MessageWithSender[] {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          m.*,
          u.username as sender_username,
          u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `);
      const messages = stmt.all(conversationId, limit, offset) as MessageWithSender[];
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return [];
    }
  }

  // Mark messages as read
  markMessagesAsRead(conversationId: number, userId: number): boolean {
    try {
      // First, let's see what messages we're about to mark as read
      const checkStmt = this.db.prepare(`
        SELECT id, sender_id, content, is_read FROM messages 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
      `);
      const unreadMessages = checkStmt.all(conversationId, userId);
      console.log(`markMessagesAsRead: Found ${unreadMessages.length} unread messages from others in conversation ${conversationId}`);
      unreadMessages.forEach(msg => {
        console.log(`  - Message ${msg.id} from sender ${msg.sender_id}: "${msg.content}", is_read: ${msg.is_read}`);
      });
      
      const stmt = this.db.prepare(`
        UPDATE messages 
        SET is_read = TRUE 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
      `);
      const result = stmt.run(conversationId, userId);
      console.log(`markMessagesAsRead: Updated ${result.changes} messages to read status`);
      return result.changes > 0;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  // Get unread message count for a user
  getUnreadMessageCount(userId: number): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        AND m.sender_id != ?
        AND m.is_read = FALSE
      `);
      const result = stmt.get(userId, userId, userId) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Get the last message ID from a sender that has been read in a conversation
  getLastSeenMessageId(conversationId: number, senderId: number): number | null {
    try {
      // Find the latest message from the sender that has been marked as read
      const stmt = this.db.prepare(`
        SELECT MAX(id) as lastSeenId FROM messages 
        WHERE conversation_id = ? 
        AND sender_id = ? 
        AND is_read = TRUE
      `);
      const result = stmt.get(conversationId, senderId) as { lastSeenId: number | null };
      return result.lastSeenId;
    } catch (error) {
      console.error('Error getting last seen message ID:', error);
      return null;
    }
  }

  // Check if a specific message has been seen
  isMessageSeen(messageId: number): boolean {
    try {
      const stmt = this.db.prepare('SELECT is_read FROM messages WHERE id = ?');
      const result = stmt.get(messageId) as { is_read: boolean } | undefined;
      return result?.is_read || false;
    } catch (error) {
      console.error('Error checking message seen status:', error);
      return false;
    }
  }

  // Search conversations by participant username
  searchConversations(userId: number, searchTerm: string): ConversationWithUsers[] {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.*,
          u1.username as participant1_username,
          u1.avatar as participant1_avatar,
          u2.username as participant2_username,
          u2.avatar as participant2_avatar,
          m.content as last_message_content,
          (SELECT COUNT(*) FROM messages 
           WHERE conversation_id = c.id 
           AND sender_id != ? 
           AND is_read = FALSE) as unread_count
        FROM conversations c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        AND (u1.username LIKE ? OR u2.username LIKE ? OR u1.displayName LIKE ? OR u2.displayName LIKE ?)
        ORDER BY c.last_message_at DESC
      `);
      const searchPattern = `%${searchTerm}%`;
      return stmt.all(userId, userId, userId, searchPattern, searchPattern, searchPattern, searchPattern) as ConversationWithUsers[];
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dbService = new DatabaseService();