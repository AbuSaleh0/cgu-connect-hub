/**
 * Complete SQLite Database Service for CGU Connect Hub
 * This service replaces the need for a separate backend server
 * All operations run locally using SQLite in the browser
 */

import { sqliteService } from './sqlite-service';
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

// Simple hash function for passwords (In production, use bcrypt)
async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'cgu-connect-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class CompleteDatabaseService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🎯 Complete Database Service already initialized');
      return;
    }
    
    console.log('🔄 Initializing Complete Database Service...');
    await sqliteService.initialize();
    this.isInitialized = true;
    console.log('🎯 Complete Database Service initialized');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
  }

  // ===== USER MANAGEMENT =====

  async createUser(userData: CreateUserData): Promise<User> {
    this.ensureInitialized();
    
    // Hash password before storing
    const hashedPassword = await simpleHash(userData.password);
    const userDataWithHashedPassword = {
      ...userData,
      password: hashedPassword
    };
    
    return await sqliteService.createUser(userDataWithHashedPassword);
  }

  async getUserById(id: number): Promise<User | null> {
    this.ensureInitialized();
    return sqliteService.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      this.ensureInitialized();
      return sqliteService.getUserByUsername(username);
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.ensureInitialized();
    return sqliteService.getUserByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    this.ensureInitialized();
    return sqliteService.getAllUsers();
  }

  // ===== AUTHENTICATION =====

  async login(loginData: LoginData): Promise<AuthResult> {
    this.ensureInitialized();
    
    try {
      const user = sqliteService.getUserByEmail(loginData.email);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify password
      const hashedInput = await simpleHash(loginData.password);
      if (hashedInput !== user.password) {
        return { success: false, error: 'Invalid password' };
      }

      // Return successful auth result
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
        token: `sqlite-token-${user.id}-${Date.now()}`
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  async signup(userData: CreateUserData): Promise<AuthResult> {
    this.ensureInitialized();
    
    try {
      // Check if user already exists
      const existingEmail = sqliteService.getUserByEmail(userData.email);
      if (existingEmail) {
        return { success: false, error: 'Email already registered' };
      }

      const existingUsername = sqliteService.getUserByUsername(userData.username);
      if (existingUsername) {
        return { success: false, error: 'Username already taken' };
      }

      // Create new user
      const newUser = await this.createUser(userData);
      
      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          avatar: newUser.avatar,
          displayName: newUser.displayName,
          bio: newUser.bio,
          semester: newUser.semester,
          department: newUser.department,
          profileSetupComplete: newUser.profileSetupComplete,
          passwordSetupComplete: newUser.passwordSetupComplete,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at
        },
        token: `sqlite-token-${newUser.id}-${Date.now()}`
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  }

  loginWithGoogle(googleUser: GoogleUserData): AuthResult {
    this.ensureInitialized();
    
    try {
      // Check if user exists by email
      const existingUser = sqliteService.getUserByEmail(googleUser.email);
      
      if (existingUser) {
        // User exists, log them in
        return {
          success: true,
          user: {
            id: existingUser.id,
            username: existingUser.username,
            email: existingUser.email,
            avatar: existingUser.avatar,
            displayName: existingUser.displayName,
            bio: existingUser.bio,
            semester: existingUser.semester,
            department: existingUser.department,
            profileSetupComplete: existingUser.profileSetupComplete,
            passwordSetupComplete: existingUser.passwordSetupComplete,
            created_at: existingUser.created_at,
            updated_at: existingUser.updated_at
          },
          token: `sqlite-google-token-${existingUser.id}-${Date.now()}`
        };
      } else {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Google login failed' };
    }
  }

  async signupWithGoogle(googleUser: GoogleUserData): Promise<AuthResult> {
    this.ensureInitialized();
    
    try {
      // Check if user already exists
      const existingUser = sqliteService.getUserByEmail(googleUser.email);
      if (existingUser) {
        return { success: false, error: 'User already exists. Please log in instead.' };
      }

      // Create user data from Google info
      const userData: CreateUserData = {
        username: googleUser.email.split('@')[0], // Use email prefix as initial username
        email: googleUser.email,
        password: 'google-auth-' + Date.now(), // Placeholder password for Google users
        avatar: googleUser.picture || '',
        displayName: googleUser.name || googleUser.email.split('@')[0],
        bio: '',
        semester: '',
        department: '',
        profileSetupComplete: false,
        passwordSetupComplete: false
      };

      return await this.signup(userData);
    } catch (error) {
      console.error('Google signup error:', error);
      return { success: false, error: 'Google signup failed' };
    }
  }

  // ===== PROFILE MANAGEMENT =====

  checkUsernameAvailability(username: string): { available: boolean; error?: string } {
    this.ensureInitialized();
    return sqliteService.checkUsernameAvailability(username);
  }

  updateUserProfile(userId: number, profileData: UpdateProfileData): { success: boolean; error?: string } {
    this.ensureInitialized();
    return sqliteService.updateUserProfile(userId, profileData);
  }

  updateUsername(userId: number, newUsername: string): boolean {
    this.ensureInitialized();
    return sqliteService.updateUsername(userId, newUsername);
  }

  completeProfileSetup(userId: number): { success: boolean; error?: string } {
    this.ensureInitialized();
    return sqliteService.completeProfileSetup(userId);
  }

  async setupPassword(userId: number, password: string): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    
    try {
      const hashedPassword = await simpleHash(password);
      return sqliteService.setupPassword(userId, hashedPassword);
    } catch (error) {
      console.error('Password setup error:', error);
      return { success: false, error: 'Password setup failed' };
    }
  }

  // ===== POST OPERATIONS =====

  async createPost(postData: CreatePostData): Promise<Post> {
    this.ensureInitialized();
    return await sqliteService.createPost(postData);
  }

  getPostById(id: number): Post | null {
    this.ensureInitialized();
    return sqliteService.getPostById(id);
  }

  getPostWithUserById(postId: number): PostWithUser | null {
    this.ensureInitialized();
    return sqliteService.getPostWithUserById(postId);
  }

  getAllPosts(): PostWithUser[] {
    try {
      this.ensureInitialized();
      return sqliteService.getAllPosts();
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      return [];
    }
  }

  getPostsByUser(userId: number): PostWithUser[] {
    this.ensureInitialized();
    return sqliteService.getPostsByUser(userId);
  }

  updatePostCaption(postId: number, caption: string): boolean {
    this.ensureInitialized();
    return sqliteService.updatePostCaption(postId, caption);
  }

  deletePost(postId: number): boolean {
    this.ensureInitialized();
    return sqliteService.deletePost(postId);
  }

  togglePinPost(postId: number): boolean {
    this.ensureInitialized();
    return sqliteService.togglePinPost(postId);
  }

  // ===== POST INTERACTIONS =====

  toggleLike(likeData: CreateLikeData): boolean {
    this.ensureInitialized();
    return sqliteService.toggleLike(likeData);
  }

  isPostLikedByUser(userId: number, postId: number): boolean {
    this.ensureInitialized();
    return sqliteService.isPostLikedByUser(userId, postId);
  }

  createComment(commentData: CreateCommentData): Comment {
    this.ensureInitialized();
    return sqliteService.createComment(commentData);
  }

  getPostComments(postId: number): CommentWithUser[] {
    this.ensureInitialized();
    return sqliteService.getPostComments(postId);
  }

  toggleSavePost(saveData: CreateSavedPostData): boolean {
    this.ensureInitialized();
    return sqliteService.toggleSavePost(saveData);
  }

  isPostSaved(userId: number, postId: number): boolean {
    try {
      this.ensureInitialized();
      return sqliteService.isPostSaved(userId, postId);
    } catch (error) {
      console.error('Error in isPostSaved:', error);
      return false;
    }
  }

  // ===== FOLLOW OPERATIONS =====

  async toggleFollow(followData: CreateFollowData): Promise<boolean> {
    this.ensureInitialized();
    return await sqliteService.toggleFollow(followData);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    this.ensureInitialized();
    return await sqliteService.isFollowing(followerId, followingId);
  }

  async getFollowerCount(userId: number): Promise<number> {
    this.ensureInitialized();
    return await sqliteService.getFollowerCount(userId);
  }

  async getFollowingCount(userId: number): Promise<number> {
    this.ensureInitialized();
    return await sqliteService.getFollowingCount(userId);
  }

  async getFollowersList(userId: number): Promise<UserPublic[]> {
    this.ensureInitialized();
    return await sqliteService.getFollowersList(userId);
  }

  async getFollowingList(userId: number): Promise<UserPublic[]> {
    this.ensureInitialized();
    return await sqliteService.getFollowingList(userId);
  }

  // ===== MESSAGING OPERATIONS =====

  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    this.ensureInitialized();
    return await sqliteService.createConversation(data);
  }

  async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
    this.ensureInitialized();
    return await sqliteService.getUserConversations(userId);
  }

  async createMessage(data: CreateMessageData): Promise<Message | null> {
    this.ensureInitialized();
    return await sqliteService.createMessage(data);
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    this.ensureInitialized();
    return await sqliteService.getConversationMessages(conversationId, limit, offset);
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    this.ensureInitialized();
    return await sqliteService.markMessagesAsRead(conversationId, userId);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    this.ensureInitialized();
    return await sqliteService.getUnreadMessageCount(userId);
  }

  async getConversationBetweenUsers(userId1: number, userId2: number): Promise<Conversation | null> {
    this.ensureInitialized();
    
    const conversations = await this.getUserConversations(userId1);
    return conversations.find(conv => 
      (conv.participant1_id === userId1 && conv.participant2_id === userId2) ||
      (conv.participant1_id === userId2 && conv.participant2_id === userId1)
    ) as Conversation || null;
  }

  async searchConversations(userId: number, searchTerm: string): Promise<ConversationWithUsers[]> {
    this.ensureInitialized();
    
    const conversations = await this.getUserConversations(userId);
    return conversations.filter(conv => 
      (conv.participant1_username && conv.participant1_username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (conv.participant2_username && conv.participant2_username.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // ===== MESSAGING HELPER METHODS =====
  
  getLastSeenMessageId(conversationId: number, senderId: number): number | null {
    // Mock implementation - in a real app this would track when users last viewed messages
    return null;
  }

  isMessageSeen(messageId: number): boolean {
    // Mock implementation - in a real app this would check if message was seen by all participants
    return false;
  }

  // ===== NOTIFICATION OPERATIONS =====

  async createNotification(notificationData: CreateNotificationData): Promise<Notification | null> {
    this.ensureInitialized();
    return await sqliteService.createNotification(notificationData);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    this.ensureInitialized();
    return await sqliteService.getUserNotifications(userId);
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    this.ensureInitialized();
    return await sqliteService.markNotificationsAsRead(userId);
  }

  // ===== OTP OPERATIONS (Mock Implementation) =====

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    
    // In a real application, you'd send an actual email
    // For this demo, we'll just store the OTP and log it
    const otp = this.generateOTP();
    console.log(`📧 OTP for ${email}: ${otp}`);
    
    // Store OTP in memory or localStorage for verification
    const otpData = {
      email,
      code: otp,
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    
    localStorage.setItem(`otp-${email}`, JSON.stringify(otpData));
    
    return { success: true };
  }

  verifyOTP(verifyData: VerifyOTPData): { success: boolean; error?: string } {
    this.ensureInitialized();
    
    try {
      const storedData = localStorage.getItem(`otp-${verifyData.email}`);
      if (!storedData) {
        return { success: false, error: 'OTP not found or expired' };
      }

      const otpData = JSON.parse(storedData);
      
      if (Date.now() > otpData.expires) {
        localStorage.removeItem(`otp-${verifyData.email}`);
        return { success: false, error: 'OTP expired' };
      }

      if (otpData.code !== verifyData.code) {
        return { success: false, error: 'Invalid OTP' };
      }

      // OTP verified successfully
      localStorage.removeItem(`otp-${verifyData.email}`);
      return { success: true };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'OTP verification failed' };
    }
  }

  // ===== UTILITY METHODS =====

  formatTimestamp(timestamp: string): string {
    try {
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
    } catch (error) {
      return timestamp;
    }
  }

  clearDatabase(): void {
    sqliteService.clearDatabase();
  }

  getDatabaseInfo(): { sizeKB: number; tableCount: number } {
    this.ensureInitialized();
    return sqliteService.getDatabaseInfo();
  }

  // ===== SEEDING METHODS FOR DEVELOPMENT =====

  async seedDatabase(): Promise<void> {
    this.ensureInitialized();
    
    console.log('🌱 Seeding database with sample data...');
    
    try {
      // Create sample users
      const users = await Promise.all([
        this.createUser({
          username: 'john_doe',
          email: 'john@cgu.edu',
          password: 'password123',
          displayName: 'John Doe',
          bio: 'Computer Science student at CGU',
          semester: 'Fall 2024',
          department: 'Computer Science',
          profileSetupComplete: true,
          passwordSetupComplete: true
        }),
        this.createUser({
          username: 'jane_smith',
          email: 'jane@cgu.edu',
          password: 'password123',
          displayName: 'Jane Smith',
          bio: 'Business Administration student',
          semester: 'Fall 2024',
          department: 'Business',
          profileSetupComplete: true,
          passwordSetupComplete: true
        }),
        this.createUser({
          username: 'mike_wilson',
          email: 'mike@cgu.edu',
          password: 'password123',
          displayName: 'Mike Wilson',
          bio: 'Engineering student passionate about robotics',
          semester: 'Fall 2024',
          department: 'Engineering',
          profileSetupComplete: true,
          passwordSetupComplete: true
        })
      ]);

      // Create sample posts
      await Promise.all([
        this.createPost({
          user_id: users[0].id,
          image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzN2FiNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2FtcGxlIFBvc3Q8L3RleHQ+PC9zdmc+',
          caption: 'Working on my final project! #coding #cgu'
        }),
        this.createPost({
          user_id: users[1].id,
          image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJlY2M3MSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QnVzaW5lc3MgU3R1ZHk8L3RleHQ+PC9zdmc+',
          caption: 'Business presentation went great today! 📈'
        }),
        this.createPost({
          user_id: users[2].id,
          image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0MzlhMCIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Um9ib3RpY3MgTGFiPC90ZXh0Pjwvc3ZnPg==',
          caption: 'Building a robot in the lab! 🤖 #engineering #robotics'
        })
      ]);

      // Create some follows
      await this.toggleFollow({ follower_id: users[0].id, following_id: users[1].id });
      await this.toggleFollow({ follower_id: users[1].id, following_id: users[2].id });
      await this.toggleFollow({ follower_id: users[2].id, following_id: users[0].id });

      console.log('✅ Database seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
    }
  }

  async clearAndReseedDatabase(): Promise<void> {
    this.clearDatabase();
    await this.initialize();
    await this.seedDatabase();
  }
}

// Simple direct export - create instance but don't initialize until needed
console.log('🏗️ Creating CompleteDatabaseService instance...');
const _instance = new CompleteDatabaseService();
console.log('✅ CompleteDatabaseService instance created');

export const completeDatabaseService = _instance;
