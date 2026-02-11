import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState, useEffect, FC } from "react";
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
  images?: string[];
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
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: (isSaved: boolean) => void;
  onDelete?: () => void;
  initialIsSaved?: boolean;
}

const PostCard: FC<PostCardProps> = ({
  post,
  onInteractionClick,
  isAuthenticated,
  currentUser,
  onLike,
  onComment,
  onShare,
  onSave,
  onDelete,
  initialIsSaved = false
}) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaved, setIsSaved] = useState(initialIsSaved);

  // Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = post.images && post.images.length > 0 ? post.images : [post.image];
  const hasMultipleImages = images.length > 1;

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleUsernameClick = () => {
    navigate(`/${post.username}`);
  };

  // Check if post is saved on component mount
  useEffect(() => {
    const checkStatus = async () => {
      if (currentUser && isAuthenticated) {
        try {
          const [saved, liked] = await Promise.all([
            dbService.isPostSaved(currentUser.id, Number(post.id)),
            dbService.isPostLikedByUser(currentUser.id, Number(post.id))
          ]);
          setIsSaved(saved);
          setIsLiked(liked);
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }
    };
    checkStatus();
  }, [currentUser, isAuthenticated, post.id]);

  const handleLike = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }

    // Handle actual like functionality for authenticated users
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    // Call optional callback
    onLike?.();

    // Call API (Optimistic update)
    dbService.toggleLike(currentUser!.id, Number(post.id)).catch(err => {
      console.error("Error toggling like:", err);
      // Revert on error if needed
    });
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }

    // Open comment modal for authenticated users
    setShowCommentModal(true);
    onComment?.();
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }

    // Open share modal for authenticated users
    setShowShareModal(true);
    onShare?.();
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      onInteractionClick(); // Show login overlay
      return;
    }

    if (!currentUser) return;

    // Handle save/unsave functionality
    try {
      const newSaveState = await dbService.toggleSavePost({
        user_id: currentUser.id,
        post_id: Number(post.id)
      });

      setIsSaved(newSaveState);
      onSave?.(newSaveState);
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  // Carousel Handlers
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  // Touch Handlers for Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      nextImage();
    }

    if (isRightSwipe && currentImageIndex > 0) {
      prevImage();
    }
  };

  return (
    <article className="bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow text-card-foreground">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.username} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-tr from-pink-500 to-yellow-500" />
            )}
          </div>
          <div>
            <button
              onClick={handleUsernameClick}
              className="font-semibold text-sm hover:text-muted-foreground transition-colors text-left"
            >
              {post.username}
            </button>
            <p className="text-xs text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <PostOptionsModal
            post={post}
            currentUser={currentUser}
            isOwnPost={currentUser?.username === post.username}
            isSaved={isSaved}
            onPostUpdate={(action, payload) => {
              if (action === 'save') {
                // Update local state with payload if available, otherwise toggle
                const newSavedState = typeof payload === 'boolean' ? payload : !isSaved;
                setIsSaved(newSavedState);
                onSave?.(newSavedState);
              } else if (action === 'delete') {
                onDelete?.();
              } else if (action === 'edit') {
                // Trigger a refresh or update UI if needed
                onInteractionClick();
              } else if (action === 'follow') {
                // Handle follow update if needed
              }
            }}
          />
        </div>
      </div>

      {/* Post Media (Carousel) */}
      <div
        className="relative w-full bg-muted flex items-center justify-center overflow-hidden aspect-square sm:aspect-auto sm:max-h-[600px] select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[currentImageIndex]}
          alt={post.caption || `Post image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Navigation Arrows (Desktop) */}
        {hasMultipleImages && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors hidden sm:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors hidden sm:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Pagination Dots (All devices) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/50'
                    }`}
                />
              ))}
            </div>

            {/* Image Counter Badge */}
            <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${isAuthenticated
                ? 'text-foreground hover:text-destructive cursor-pointer'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
                } group`}
              title={isAuthenticated ? 'Like this post' : 'Login to like'}
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-destructive text-destructive' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="text-sm font-semibold">{likeCount.toLocaleString()}</span>
            </button>
            <button
              onClick={handleComment}
              className={`flex items-center gap-2 transition-colors ${isAuthenticated
                ? 'text-foreground hover:text-accent cursor-pointer'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
                } group`}
              title={isAuthenticated ? 'Comment on this post' : 'Login to comment'}
            >
              <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">{post.comments}</span>
            </button>
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 transition-colors ${isAuthenticated
                ? 'text-foreground hover:text-accent cursor-pointer'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
                } group`}
              title={isAuthenticated ? 'Share this post' : 'Login to share'}
            >
              <Send className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          <button
            onClick={handleBookmark}
            className={`transition-colors ${isAuthenticated
              ? 'text-foreground hover:text-accent cursor-pointer'
              : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
            title={isAuthenticated ? 'Bookmark this post' : 'Login to bookmark'}
          >
            <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div>
          <p className="text-sm">
            <button
              onClick={handleUsernameClick}
              className="font-semibold mr-2 hover:text-muted-foreground transition-colors"
            >
              {post.username}
            </button>
            {post.caption}
          </p>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        postId={post.id}
        currentUser={currentUser}
        isPostOwner={currentUser?.username === post.username}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post.id}
        postCaption={post.caption}
        postUsername={post.username}
      />


    </article>
  );
};

export default PostCard;
