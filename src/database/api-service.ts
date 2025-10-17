/**
 * API Service for SQLite Database Communication
 * This service handles HTTP requests to the backend SQLite database
 */

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

const API_BASE = 'http://localhost:3001/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      console.log('ApiService: Making request to:', `${API_BASE}${endpoint}`);
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('ApiService: Response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json();
        console.error('ApiService: Request failed:', error);
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('ApiService: Response data:', data);
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Messaging operations (using SQLite backend)
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    try {
      return await this.request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
    try {
      return await this.request<ConversationWithUsers[]>(`/conversations/${userId}`);
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  async createMessage(data: CreateMessageData): Promise<Message | null> {
    try {
      return await this.request<Message>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    try {
      return await this.request<MessageWithSender[]>(`/messages/${conversationId}?limit=${limit}&offset=${offset}`);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.request<{ updated: number }>(`/messages/${conversationId}/read/${userId}`, {
        method: 'PUT',
      });
      return result.updated > 0;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const result = await this.request<{ count: number }>(`/messages/unread/${userId}`);
      return result.count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // User operations (using SQLite backend)
  async createUser(userData: CreateUserData): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      return await this.request<User>(`/users/${id}`);
    } catch (error) {
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.request<User>(`/users/username/${username}`);
    } catch (error) {
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  // Post operations (using SQLite backend)
  async createPost(postData: CreatePostData): Promise<Post> {
    return this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async getAllPosts(): Promise<PostWithUser[]> {
    return this.request<PostWithUser[]>('/posts');
  }

  async getPostsByUser(userId: number): Promise<PostWithUser[]> {
    return this.request<PostWithUser[]>(`/posts/user/${userId}`);
  }

  // Follow operations (using SQLite backend)
  async toggleFollow(followData: CreateFollowData): Promise<boolean> {
    try {
      const result = await this.request<{ following: boolean }>('/follows/toggle', {
        method: 'POST',
        body: JSON.stringify(followData),
      });
      return result.following;
    } catch (error) {
      console.error('Error toggling follow:', error);
      return false;
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      const result = await this.request<{ following: boolean }>(`/follows/check/${followerId}/${followingId}`);
      return result.following;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Notification operations (using SQLite backend)
  async createNotification(notificationData: CreateNotificationData): Promise<Notification | null> {
    try {
      return await this.request<Notification>('/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      return await this.request<Notification[]>(`/notifications/${userId}`);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    try {
      await this.request(`/notifications/${userId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // Utility methods
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

  // Methods that need server implementation
  getLastSeenMessageId(conversationId: number, senderId: number): number | null {
    // TODO: Implement on server
    return null;
  }

  isMessageSeen(messageId: number): boolean {
    // TODO: Implement on server
    return false;
  }

  searchConversations(userId: number, searchTerm: string): ConversationWithUsers[] {
    // TODO: Implement on server
    return [];
  }

  getConversationBetweenUsers(userId1: number, userId2: number): Conversation | null {
    // TODO: Implement on server - for now use getUserConversations and filter
    return null;
  }
}

export const apiService = new ApiService();