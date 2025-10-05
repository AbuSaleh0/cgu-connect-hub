import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface Post {
  id: string;
  username: string;
  userAvatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

interface PostCardProps {
  post: Post;
  onInteractionClick: () => void;
}

const PostCard = ({ post, onInteractionClick }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    onInteractionClick();
  };

  const handleComment = () => {
    onInteractionClick();
  };

  return (
    <article className="bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full gradient-primary" />
          <div>
            <p className="font-semibold text-sm">{post.username}</p>
            <p className="text-xs text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Post Image */}
      <div className="relative w-full aspect-square bg-muted">
        <img
          src={post.image}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="text-foreground hover:text-destructive transition-colors"
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
            </button>
            <button
              onClick={handleComment}
              className="text-foreground hover:text-accent transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button
              onClick={onInteractionClick}
              className="text-foreground hover:text-accent transition-colors"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button
            onClick={onInteractionClick}
            className="text-foreground hover:text-accent transition-colors"
          >
            <Bookmark className="h-6 w-6" />
          </button>
        </div>

        <div>
          <p className="font-semibold text-sm">{post.likes.toLocaleString()} likes</p>
        </div>

        <div>
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.username}</span>
            {post.caption}
          </p>
        </div>

        {post.comments > 0 && (
          <button
            onClick={handleComment}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all {post.comments} comments
          </button>
        )}
      </div>
    </article>
  );
};

export default PostCard;
