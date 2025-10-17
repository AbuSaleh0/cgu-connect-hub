import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CommentModal from "./CommentModal";
import ShareModal from "./ShareModal";
import PostOptionsModal from "./PostOptionsModal";
import { dbService } from "@/database";

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
  isAuthenticated: boolean;
  currentUser?: { id: number; username: string; } | null;
}

const PostCard = ({ post, onInteractionClick, isAuthenticated, currentUser }: PostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleUsernameClick = () => {
    navigate(`/${post.username}`);
  };

  // Check if post is saved on component mount
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      setIsSaved(dbService.isPostSaved(currentUser.id, Number(post.id)));
    }
  }, [currentUser, isAuthenticated, post.id]);

  const handleLike = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }
    
    // Handle actual like functionality for authenticated users
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    // Here you would typically call an API or database function
    console.log(`${isLiked ? 'Unliked' : 'Liked'} post ${post.id} by ${currentUser?.username}`);
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }
    
    // Open comment modal for authenticated users
    setShowCommentModal(true);
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }
    
    // Open share modal for authenticated users
    setShowShareModal(true);
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }
    
    if (!currentUser) return;
    
    // Handle save/unsave functionality
    try {
      const newSaveState = dbService.toggleSavePost({
        user_id: currentUser.id,
        post_id: Number(post.id)
      });
      
      setIsSaved(newSaveState);
      console.log(`${newSaveState ? 'Saved' : 'Unsaved'} post ${post.id}`);
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  return (
    <article className="bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full gradient-primary" />
          <div>
            <button 
              onClick={handleUsernameClick}
              className="font-semibold text-sm hover:text-gray-600 transition-colors text-left"
            >
              {post.username}
            </button>
            <p className="text-xs text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowOptionsModal(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Post Media */}
      <div className="relative w-full bg-muted flex items-center justify-center">
        <img
          src={post.image}
          alt={post.caption || "Post"}
          className="w-full h-auto object-cover max-h-[600px]"
        />
      </div>

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`transition-colors ${
                isAuthenticated 
                  ? 'text-foreground hover:text-destructive cursor-pointer' 
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
              title={isAuthenticated ? 'Like this post' : 'Login to like'}
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
            </button>
            <button
              onClick={handleComment}
              className={`transition-colors ${
                isAuthenticated 
                  ? 'text-foreground hover:text-accent cursor-pointer' 
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
              title={isAuthenticated ? 'Comment on this post' : 'Login to comment'}
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button
              onClick={handleShare}
              className={`transition-colors ${
                isAuthenticated 
                  ? 'text-foreground hover:text-accent cursor-pointer' 
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
              title={isAuthenticated ? 'Share this post' : 'Login to share'}
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button
            onClick={handleBookmark}
            className={`transition-colors ${
              isAuthenticated 
                ? 'text-foreground hover:text-accent cursor-pointer' 
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
            }`}
            title={isAuthenticated ? 'Bookmark this post' : 'Login to bookmark'}
          >
            <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div>
          <p className="font-semibold text-sm">{likeCount.toLocaleString()} likes</p>
        </div>

        <div>
          <p className="text-sm">
            <button 
              onClick={handleUsernameClick}
              className="font-semibold mr-2 hover:text-gray-600 transition-colors"
            >
              {post.username}
            </button>
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

      {/* Comment Modal */}
      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        postId={post.id}
        currentUser={currentUser}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post.id}
        postCaption={post.caption}
        postUsername={post.username}
      />

      {/* Post Options Modal */}
      <PostOptionsModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false);
          // Refresh saved state after modal closes
          if (currentUser && isAuthenticated) {
            setIsSaved(dbService.isPostSaved(currentUser.id, Number(post.id)));
          }
        }}
        post={{
          id: post.id,
          username: post.username,
          caption: post.caption
        }}
        currentUser={currentUser}
        isOwnPost={currentUser?.username === post.username}
        onPostUpdate={() => {
          // Refresh the page to get updated data
          window.location.reload();
        }}
      />
    </article>
  );
};

export default PostCard;
