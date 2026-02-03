export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  display_name: string;
  bio: string;
  semester: string;
  department: string;

  profile_setup_complete: boolean;
  password_setup_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  display_name: string;
  bio: string;
  semester: string;
  department: string;

  profile_setup_complete: boolean;
  password_setup_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  image: string;
  images?: string[];
  caption?: string;
  likes_count: number;
  comments_count: number;
  pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostWithUser extends Post {
  username: string;
  user_avatar?: string;
}

export interface Like {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  username: string;
  user_avatar?: string;
}

// Types for creating new records (without auto-generated fields)
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  display_name?: string;
  bio?: string;
  semester?: string;
  department?: string;

  password_setup_complete?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserPublic;
  token?: string;
  error?: string;
}

export interface CreatePostData {
  user_id: number;
  image: string;
  images?: string[];
  caption?: string;
}

export interface CreateCommentData {
  user_id: number;
  post_id: number;
  content: string;
}

export interface CreateLikeData {
  user_id: number;
  post_id: number;
}

export interface OTPCode {
  id: number;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface CreateOTPData {
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface VerifyOTPData {
  email: string;
  code: string;
}

export interface GoogleUserData {
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface UpdateProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar?: string;
  semester?: string;
  department?: string;
}

export interface SavedPost {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

export interface CreateSavedPostData {
  user_id: number;
  post_id: number;
}

export interface SavedConfession {
  id: number;
  user_id: number;
  confession_id: number;
  created_at: string;
}

export interface CreateSavedConfessionData {
  user_id: number;
  confession_id: number;
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
}

export interface CreateFollowData {
  follower_id: number;
  following_id: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'like' | 'comment' | 'follow';
  from_user_id: number;
  post_id?: number;
  message: string;
  read: boolean;
  created_at: string;
}

export interface CreateNotificationData {
  user_id: number;
  type: 'like' | 'comment' | 'follow';
  from_user_id: number;
  post_id?: number;
  message: string;
}

// Message-related types
export interface Conversation {
  id: number;
  participant1_id: number;
  participant2_id: number;
  last_message_id?: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithUsers extends Conversation {
  participant1_username: string;
  participant1_avatar?: string;
  participant2_username: string;
  participant2_avatar?: string;
  last_message_content?: string;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'video';
  media_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageWithSender extends Message {
  sender_username: string;
  sender_avatar?: string;
}

export interface CreateConversationData {
  participant1_id: number;
  participant2_id: number;
}

export interface CreateMessageData {
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type?: 'text' | 'image' | 'video';
  media_url?: string;
}

// Confession types
export interface Confession {
  id: number;
  user_id?: number; // Optional because we don't return it to public feed for privacy
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface ConfessionLike {
  id: number;
  user_id: number;
  confession_id: number;
  created_at: string;
}

export interface ConfessionComment {
  id: number;
  user_id: number;
  confession_id: number;
  content: string;
  created_at: string;
}

export interface ConfessionCommentWithUser extends ConfessionComment {
  user: {
    username: string;
    avatar?: string;
  };
}

export interface CreateConfessionData {
  user_id: number;
  content: string;
}

export interface CreateConfessionLikeData {
  user_id: number;
  confession_id: number;
}

export interface CreateConfessionCommentData {
  user_id: number;
  confession_id: number;
  content: string;
}
