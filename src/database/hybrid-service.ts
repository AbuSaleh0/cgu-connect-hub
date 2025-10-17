/**
 * Hybrid Database Service
 * - Uses SQLite API for messaging operations (conversations, messages)
 * - Uses localStorage for other operations (users, posts, authentication)
 * - Session management remains in localStorage
 */

import { DatabaseService as LocalStorageService } from './service';
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
  private localStorageService = new LocalStorageService();

  // ===== MESSAGING OPERATIONS (SQLite API) =====
  
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    try {
      const conversation = await apiService.createConversation(data);
      if (conversation) {
        return conversation;
      }
    } catch (error) {
      console.error('Failed to create conversation in SQLite, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    return this.localStorageService.createConversation(data);
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    // TODO: Implement on server
    return null;
  }

  async getConversationBetweenUsers(userId1: number, userId2: number): Promise<Conversation | null> {
    try {
      const conversations = await this.getUserConversations(userId1);
      
      return conversations.find(conv => 
        (conv.participant1_id === userId1 && conv.participant2_id === userId2) ||
        (conv.participant1_id === userId2 && conv.participant2_id === userId1)
      ) as Conversation || null;
    } catch (error) {
      console.error('Error finding conversation:', error);
      // Fallback to localStorage
      return this.localStorageService.getConversationBetweenUsers(userId1, userId2);
    }
  }

  async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
    // Try localStorage first to see if we have existing data
    console.log('HybridService: Checking localStorage first for user:', userId);
    const localConversations = this.localStorageService.getUserConversations(userId);
    console.log('HybridService: localStorage returned', localConversations.length, 'conversations');
    
    // If we have local conversations, return them for now (temporary fix for debugging)
    if (localConversations.length > 0) {
      console.log('HybridService: Using localStorage conversations');
      return localConversations;
    }

    try {
      console.log('HybridService: No local conversations, trying SQLite for user:', userId);
      // Get conversations from SQLite
      const conversations = await apiService.getUserConversations(userId);
      console.log('HybridService: SQLite returned', conversations.length, 'conversations');
      
      // If no conversations in SQLite either, return empty
      if (conversations.length === 0) {
        console.log('HybridService: No conversations found in SQLite either');
        return [];
      }
      
      // Enrich with user information from localStorage
      const enrichedConversations = conversations.map(conv => {
        const participant1 = this.localStorageService.getUserById(conv.participant1_id);
        const participant2 = this.localStorageService.getUserById(conv.participant2_id);
        
        return {
          ...conv,
          participant1_username: participant1?.username || 'Unknown User',
          participant1_avatar: participant1?.avatar || null,
          participant2_username: participant2?.username || 'Unknown User',
          participant2_avatar: participant2?.avatar || null
        };
      });
      
      return enrichedConversations;
    } catch (error) {
      console.error('Error getting user conversations, falling back to localStorage:', error);
      return this.localStorageService.getUserConversations(userId);
    }
  }

  async createMessage(data: CreateMessageData): Promise<Message | null> {
    try {
      const message = await apiService.createMessage(data);
      if (message) {
        return message;
      }
    } catch (error) {
      console.error('Failed to create message in SQLite, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    return this.localStorageService.createMessage(data);
  }

  async getMessageById(id: number): Promise<Message | null> {
    // TODO: Implement on server
    return null;
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    // Try localStorage first to see if we have existing data
    console.log('HybridService: Checking localStorage first for conversation:', conversationId);
    const localMessages = this.localStorageService.getConversationMessages(conversationId, limit, offset);
    console.log('HybridService: localStorage returned', localMessages.length, 'messages');
    
    // If we have local messages, return them for now (temporary fix for debugging)
    if (localMessages.length > 0) {
      console.log('HybridService: Using localStorage messages');
      return localMessages;
    }

    try {
      console.log('HybridService: No local messages, trying SQLite for conversation:', conversationId);
      // Get messages from SQLite
      const messages = await apiService.getConversationMessages(conversationId, limit, offset);
      console.log('HybridService: SQLite returned', messages.length, 'messages');
      
      // If no messages in SQLite either, return empty
      if (messages.length === 0) {
        console.log('HybridService: No messages found in SQLite either');
        return [];
      }
      
      // Enrich with sender information from localStorage
      const enrichedMessages = messages.map(message => {
        const sender = this.localStorageService.getUserById(message.sender_id);
        
        return {
          ...message,
          sender_username: sender?.username || 'Unknown User',
          sender_avatar: sender?.avatar || null
        };
      });
      
      return enrichedMessages;
    } catch (error) {
      console.error('Error getting conversation messages from SQLite, falling back to localStorage:', error);
      const localMessages = this.localStorageService.getConversationMessages(conversationId, limit, offset);
      console.log('HybridService: localStorage fallback returned', localMessages.length, 'messages');
      return localMessages;
    }
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      const result = await apiService.markMessagesAsRead(conversationId, userId);
      if (result) {
        return result;
      }
    } catch (error) {
      console.error('Failed to mark messages as read in SQLite, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    return this.localStorageService.markMessagesAsRead(conversationId, userId);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const count = await apiService.getUnreadMessageCount(userId);
      return count;
    } catch (error) {
      console.error('Failed to get unread count from SQLite, falling back to localStorage:', error);
      return this.localStorageService.getUnreadMessageCount(userId);
    }
  }

  async searchConversations(userId: number, searchTerm: string): Promise<ConversationWithUsers[]> {
    // For now, get all conversations and filter client-side
    try {
      const conversations = await this.getUserConversations(userId);
      return conversations.filter(conv => 
        (conv.participant1_username && conv.participant1_username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (conv.participant2_username && conv.participant2_username.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error('Error searching conversations:', error);
      // Fallback to localStorage
      return this.localStorageService.searchConversations(userId, searchTerm);
    }
  }

  // ===== ALL OTHER OPERATIONS (localStorage) =====
  
  // User operations
  createUser(userData: CreateUserData): User {
    return this.localStorageService.createUser(userData);
  }

  getUserById(id: number): User | null {
    return this.localStorageService.getUserById(id);
  }

  getUserByUsername(username: string): User | null {
    return this.localStorageService.getUserByUsername(username);
  }

  getAllUsers(): User[] {
    return this.localStorageService.getAllUsers();
  }

  getUserByEmail(email: string): User | null {
    return this.localStorageService.getUserByEmail(email);
  }

  // Authentication methods
  signup(userData: CreateUserData): AuthResult {
    return this.localStorageService.signup(userData);
  }

  login(loginData: LoginData): AuthResult {
    return this.localStorageService.login(loginData);
  }

  loginWithGoogle(googleUser: GoogleUserData): AuthResult {
    return this.localStorageService.loginWithGoogle(googleUser);
  }

  signupWithGoogle(googleUser: GoogleUserData): AuthResult {
    return this.localStorageService.signupWithGoogle(googleUser);
  }

  checkUsernameAvailability(username: string): { available: boolean; error?: string } {
    return this.localStorageService.checkUsernameAvailability(username);
  }

  generateOTP(): string {
    return this.localStorageService.generateOTP();
  }

  async sendOTP(email: string): Promise<{ success: boolean; error?: string; otp?: string }> {
    return this.localStorageService.sendOTP(email);
  }

  verifyOTP(verifyData: VerifyOTPData): { success: boolean; error?: string } {
    return this.localStorageService.verifyOTP(verifyData);
  }

  // Post operations
  createPost(postData: CreatePostData): Post {
    return this.localStorageService.createPost(postData);
  }

  getPostById(id: number): Post | null {
    return this.localStorageService.getPostById(id);
  }

  getPostWithUserById(id: number): PostWithUser | null {
    return this.localStorageService.getPostWithUserById(id);
  }

  getAllPosts(): PostWithUser[] {
    return this.localStorageService.getAllPosts();
  }

  getPostsByUser(userId: number): PostWithUser[] {
    return this.localStorageService.getPostsByUser(userId);
  }

  deletePost(id: number): boolean {
    return this.localStorageService.deletePost(id);
  }

  // Like operations
  toggleLike(likeData: CreateLikeData): boolean {
    return this.localStorageService.toggleLike(likeData);
  }

  isPostLikedByUser(userId: number, postId: number): boolean {
    return this.localStorageService.isPostLikedByUser(userId, postId);
  }

  getPostLikes(postId: number): Like[] {
    return this.localStorageService.getPostLikes(postId);
  }

  // Comment operations
  createComment(commentData: CreateCommentData): Comment {
    return this.localStorageService.createComment(commentData);
  }

  getCommentById(id: number): Comment | null {
    return this.localStorageService.getCommentById(id);
  }

  getPostComments(postId: number): CommentWithUser[] {
    return this.localStorageService.getPostComments(postId);
  }

  deleteComment(id: number): boolean {
    return this.localStorageService.deleteComment(id);
  }

  // Profile management
  updateUserProfile(userId: number, profileData: UpdateProfileData): { success: boolean; error?: string } {
    return this.localStorageService.updateUserProfile(userId, profileData);
  }

  updateUsername(userId: number, newUsername: string): boolean {
    return this.localStorageService.updateUsername(userId, newUsername);
  }

  completeProfileSetup(userId: number): { success: boolean; error?: string } {
    return this.localStorageService.completeProfileSetup(userId);
  }

  setupPassword(userId: number, password: string): { success: boolean; error?: string } {
    return this.localStorageService.setupPassword(userId, password);
  }

  // Follow operations
  toggleFollow(followData: CreateFollowData): boolean {
    return this.localStorageService.toggleFollow(followData);
  }

  isFollowingUsername(followerId: number, followingUsername: string): boolean {
    return this.localStorageService.isFollowingUsername(followerId, followingUsername);
  }

  isFollowing(followerId: number, followingId: number): boolean {
    return this.localStorageService.isFollowing(followerId, followingId);
  }

  // Notification operations
  createNotification(notificationData: CreateNotificationData): Notification | null {
    return this.localStorageService.createNotification(notificationData);
  }

  getNotificationById(id: number): Notification | null {
    return this.localStorageService.getNotificationById(id);
  }

  getUserNotifications(userId: number): Notification[] {
    return this.localStorageService.getUserNotifications(userId);
  }

  markNotificationsAsRead(userId: number): void {
    return this.localStorageService.markNotificationsAsRead(userId);
  }

  getUnreadNotificationCount(userId: number): number {
    return this.localStorageService.getUnreadNotificationCount(userId);
  }

  // Utility methods
  getPostsWithDetails(): PostWithUser[] {
    return this.localStorageService.getPostsWithDetails();
  }

  formatTimestamp(timestamp: string): string {
    return this.localStorageService.formatTimestamp(timestamp);
  }

  getFollowerCount(userId: number): number {
    return this.localStorageService.getFollowerCount(userId);
  }

  getFollowingCount(userId: number): number {
    return this.localStorageService.getFollowingCount(userId);
  }

  getFollowersList(userId: number): UserPublic[] {
    return this.localStorageService.getFollowersList(userId);
  }

  getFollowingList(userId: number): UserPublic[] {
    return this.localStorageService.getFollowingList(userId);
  }

  // Saved posts operations
  toggleSavePost(saveData: CreateSavedPostData): boolean {
    return this.localStorageService.toggleSavePost(saveData);
  }

  isPostSaved(userId: number, postId: number): boolean {
    return this.localStorageService.isPostSaved(userId, postId);
  }

  // Follow user by username
  followUser(followData: { follower_id: number; following_username: string }): boolean {
    return this.localStorageService.followUser(followData);
  }

  // Unfollow user by username
  unfollowUser(followerId: number, followingUsername: string): boolean {
    return this.localStorageService.unfollowUser(followerId, followingUsername);
  }

  // Update post caption
  updatePostCaption(postId: number, caption: string): boolean {
    return this.localStorageService.updatePostCaption(postId, caption);
  }

  // Toggle pin post
  togglePinPost(postId: number): boolean {
    return this.localStorageService.togglePinPost(postId);
  }

  // ===== MESSAGING HELPER METHODS (localStorage fallback) =====
  
  getLastSeenMessageId(conversationId: number, senderId: number): number | null {
    // For now, use localStorage fallback
    return this.localStorageService.getLastSeenMessageId(conversationId, senderId);
  }

  isMessageSeen(messageId: number): boolean {
    // For now, use localStorage fallback
    return this.localStorageService.isMessageSeen(messageId);
  }
}

// Export singleton instance
export const hybridDbService = new HybridDatabaseService();