/**
 * Database Service
 * - Uses SQLite API for all data operations
 * - All methods are asynchronous and return Promises
 * - No localStorage fallbacks - all data comes from backend
 * - Graceful error handling for API failures
 */

import { apiService } from './api-service';
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

class HybridDatabaseService {
  // ===== USER OPERATIONS (SQLite) =====
  
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      return await apiService.createUser(userData);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      return await apiService.getUserById(id);
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await apiService.getUserByUsername(username);
    } catch (error) {
      console.error('Failed to get user by username:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await apiService.getAllUsers();
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  // ===== POST OPERATIONS (SQLite) =====
  
  async createPost(postData: CreatePostData): Promise<Post> {
    try {
      return await apiService.createPost(postData);
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }

  async getAllPosts(): Promise<PostWithUser[]> {
    try {
      return await apiService.getAllPosts();
    } catch (error) {
      console.error('Failed to get all posts:', error);
      throw error;
    }
  }

  async getPostsByUser(userId: number): Promise<PostWithUser[]> {
    try {
      return await apiService.getPostsByUser(userId);
    } catch (error) {
      console.error('Failed to get posts by user:', error);
      throw error;
    }
  }

  // ===== FOLLOW OPERATIONS (SQLite) =====
  
  async toggleFollow(followData: CreateFollowData): Promise<boolean> {
    try {
      return await apiService.toggleFollow(followData);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      throw error;
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      return await apiService.isFollowing(followerId, followingId);
    } catch (error) {
      console.error('Failed to check follow status:', error);
      throw error;
    }
  }

  // ===== NOTIFICATION OPERATIONS (SQLite) =====
  
  async createNotification(notificationData: CreateNotificationData): Promise<Notification | null> {
    try {
      return await apiService.createNotification(notificationData);
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      return await apiService.getUserNotifications(userId);
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    try {
      await apiService.markNotificationsAsRead(userId);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  // ===== MESSAGING OPERATIONS (SQLite) =====
  
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    try {
      return await apiService.createConversation(data);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    try {
      // TODO: Implement this endpoint in the API service
      console.warn('getConversationById not implemented in API service');
      return null;
    } catch (error) {
      console.error('Failed to get conversation by id:', error);
      throw error;
    }
  }

  async getConversationBetweenUsers(userId1: number, userId2: number): Promise<Conversation | null> {
    try {
      const conversations = await this.getUserConversations(userId1);
      
      return conversations.find(conv => 
        (conv.participant1_id === userId1 && conv.participant2_id === userId2) ||
        (conv.participant1_id === userId2 && conv.participant2_id === userId1)
      ) as Conversation || null;
    } catch (error) {
      console.error('Failed to find conversation between users:', error);
      throw error;
    }
  }

  async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
    try {
      // Get conversations from SQLite
      const conversations = await apiService.getUserConversations(userId);
      
      // Note: User enrichment would need to be done via separate API calls
      // For now, return the conversations as-is since we're using API-only approach
      return conversations;
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw error;
    }
  }  async createMessage(data: CreateMessageData): Promise<Message | null> {
    try {
      return await apiService.createMessage(data);
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  async getMessageById(id: number): Promise<Message | null> {
    try {
      // TODO: Implement this endpoint in the API service
      console.warn('getMessageById not implemented in API service');
      return null;
    } catch (error) {
      console.error('Failed to get message by id:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    try {
      // Get messages from SQLite
      return await apiService.getConversationMessages(conversationId, limit, offset);
    } catch (error) {
      console.error('Failed to get conversation messages:', error);
      throw error;
    }
  }  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      return await apiService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      return await apiService.getUnreadMessageCount(userId);
    } catch (error) {
      console.error('Failed to get unread message count:', error);
      throw error;
    }
  }

  async searchConversations(userId: number, searchTerm: string): Promise<ConversationWithUsers[]> {
    try {
      const conversations = await this.getUserConversations(userId);
      return conversations.filter(conv => 
        (conv.participant1_username && conv.participant1_username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (conv.participant2_username && conv.participant2_username.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error('Failed to search conversations:', error);
      throw error;
    }
  }

  // ===== MESSAGING HELPER METHODS =====
  
  getLastSeenMessageId(conversationId: number, senderId: number): number | null {
    // TODO: Implement this in the API service
    console.warn('getLastSeenMessageId not implemented in API service');
    return null;
  }

  isMessageSeen(messageId: number): boolean {
    // TODO: Implement this in the API service
    console.warn('isMessageSeen not implemented in API service');
    return false;
  }

  // ===== AUTHENTICATION OPERATIONS (Need Backend Implementation) =====
  
  login(loginData: LoginData): AuthResult {
    throw new Error('Authentication operations must be implemented in the backend. Please implement /api/auth/login endpoint.');
  }

  loginWithGoogle(googleUser: GoogleUserData): AuthResult {
    throw new Error('Google authentication must be implemented in the backend. Please implement /api/auth/google endpoint.');
  }

  signupWithGoogle(googleUser: GoogleUserData): AuthResult {
    throw new Error('Google signup must be implemented in the backend. Please implement /api/auth/google/signup endpoint.');
  }

  // ===== PROFILE MANAGEMENT (Need Backend Implementation) =====
  
  checkUsernameAvailability(username: string): { available: boolean; error?: string } {
    throw new Error('Username availability check must be implemented in the backend. Please implement /api/users/check-username/:username endpoint.');
  }

  updateUserProfile(userId: number, profileData: UpdateProfileData): { success: boolean; error?: string } {
    throw new Error('User profile updates must be implemented in the backend. Please implement PUT /api/users/:id endpoint.');
  }

  updateUsername(userId: number, newUsername: string): boolean {
    throw new Error('Username updates must be implemented in the backend. Please implement PUT /api/users/:id/username endpoint.');
  }

  completeProfileSetup(userId: number): { success: boolean; error?: string } {
    throw new Error('Profile setup completion must be implemented in the backend. Please implement PUT /api/users/:id/complete-setup endpoint.');
  }

  setupPassword(userId: number, password: string): { success: boolean; error?: string } {
    throw new Error('Password setup must be implemented in the backend. Please implement PUT /api/users/:id/password endpoint.');
  }

  // ===== POST INTERACTIONS (Need Backend Implementation) =====
  
  toggleLike(likeData: CreateLikeData): boolean {
    throw new Error('Post likes must be implemented in the backend. Please implement POST /api/posts/:id/like endpoint.');
  }

  isPostLikedByUser(userId: number, postId: number): boolean {
    throw new Error('Like status check must be implemented in the backend. Please implement GET /api/posts/:id/like/:userId endpoint.');
  }

  createComment(commentData: CreateCommentData): Comment {
    throw new Error('Comments must be implemented in the backend. Please implement POST /api/posts/:id/comments endpoint.');
  }

  getPostComments(postId: number): CommentWithUser[] {
    throw new Error('Getting comments must be implemented in the backend. Please implement GET /api/posts/:id/comments endpoint.');
  }

  toggleSavePost(saveData: CreateSavedPostData): boolean {
    throw new Error('Post saving must be implemented in the backend. Please implement POST /api/posts/:id/save endpoint.');
  }

  isPostSaved(userId: number, postId: number): boolean {
    throw new Error('Save status check must be implemented in the backend. Please implement GET /api/posts/:id/save/:userId endpoint.');
  }

  // ===== ADDITIONAL HELPER METHODS (Need Backend Implementation) =====
  
  async getFollowerCount(userId: number): Promise<number> {
    throw new Error('Follower count must be implemented in the backend. Please implement GET /api/users/:id/followers/count endpoint.');
  }

  async getFollowingCount(userId: number): Promise<number> {
    throw new Error('Following count must be implemented in the backend. Please implement GET /api/users/:id/following/count endpoint.');
  }

  async getFollowersList(userId: number): Promise<UserPublic[]> {
    throw new Error('Followers list must be implemented in the backend. Please implement GET /api/users/:id/followers endpoint.');
  }

  async getFollowingList(userId: number): Promise<UserPublic[]> {
    throw new Error('Following list must be implemented in the backend. Please implement GET /api/users/:id/following endpoint.');
  }

  // ===== UTILITY METHODS =====
  
  formatTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return timestamp;
    }
  }

  // ===== POST OPERATIONS (Need Backend Implementation) =====
  
  getPostWithUserById(postId: number): PostWithUser | null {
    throw new Error('Post details must be implemented in the backend. Please implement GET /api/posts/:id endpoint.');
  }

  getPostById(postId: number): Post | null {
    throw new Error('Post by ID must be implemented in the backend. Please implement GET /api/posts/:id endpoint.');
  }

  updatePostCaption(postId: number, caption: string): boolean {
    throw new Error('Post updates must be implemented in the backend. Please implement PUT /api/posts/:id endpoint.');
  }

  deletePost(postId: number): boolean {
    throw new Error('Post deletion must be implemented in the backend. Please implement DELETE /api/posts/:id endpoint.');
  }

  togglePinPost(postId: number): boolean {
    throw new Error('Post pinning must be implemented in the backend. Please implement PUT /api/posts/:id/pin endpoint.');
  }

  // ===== USER FOLLOW HELPERS (Need Backend Implementation) =====
  
  async isFollowingUsername(followerId: number, followingUsername: string): Promise<boolean> {
    throw new Error('Follow status by username must be implemented in the backend. Please implement GET /api/users/:username/followers/:followerId endpoint.');
  }

  async followUser(followData: { follower_id: number; following_username: string }): Promise<boolean> {
    throw new Error('Follow by username must be implemented in the backend. Please implement POST /api/users/:username/follow endpoint.');
  }

  async unfollowUser(followerId: number, followingUsername: string): Promise<boolean> {
    throw new Error('Unfollow by username must be implemented in the backend. Please implement DELETE /api/users/:username/follow/:followerId endpoint.');
  }
}

// Export singleton instance
export const hybridDbService = new HybridDatabaseService();