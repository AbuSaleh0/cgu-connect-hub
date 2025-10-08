export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  displayName: string;
  bio: string;
  semester: string;
  department: string;
  profileSetupComplete: boolean;
  passwordSetupComplete: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  displayName: string;
  bio: string;
  semester: string;
  department: string;
  profileSetupComplete: boolean;
  passwordSetupComplete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  image: string;
  caption?: string;
  likes_count: number;
  comments_count: number;
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
  displayName?: string;
  bio?: string;
  semester?: string;
  department?: string;
  profileSetupComplete?: boolean;
  passwordSetupComplete?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserPublic;
  error?: string;
}

export interface CreatePostData {
  user_id: number;
  image: string;
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
  displayName?: string;
  bio?: string;
  avatar?: string;
  semester?: string;
  department?: string;
}