import { PostWithUser } from './types';

// Interface for the format expected by PostCard component
export interface PostCardData {
  id: string;
  username: string;
  userAvatar: string;
  image: string;
  images?: string[];
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

// Utility function to convert database post to PostCard format
export const convertDbPostToCardData = (dbPost: PostWithUser, formatTimestamp: (timestamp: string) => string): PostCardData => {
  return {
    id: dbPost.id.toString(),
    username: dbPost.username,
    userAvatar: dbPost.user_avatar || '',
    image: dbPost.image,
    images: dbPost.images && dbPost.images.length > 0 ? dbPost.images : [dbPost.image],
    caption: dbPost.caption || '',
    likes: dbPost.likes_count,
    comments: dbPost.comments_count,
    timestamp: formatTimestamp(dbPost.created_at),
  };
};