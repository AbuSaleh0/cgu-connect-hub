import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, X, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import { Post, Comment } from "@/database/types";
import { formatTimeAgo } from "@/lib/utils";
import PostOptionsModal from "./PostOptionsModal";

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
}

const PostDetailModal = ({ isOpen, onClose, post }: PostDetailModalProps) => {
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();

  const handleUsernameClick = (username: string) => {
    navigate(`/${username}`);
  };

  console.log('PostDetailModal props:', { isOpen, post, currentUser });

  useEffect(() => {
    if (isOpen && post) {
      try {
        // Load comments
        const postComments = dbService.getPostComments(post.id);
        setComments(postComments);

        // Check if user liked the post
        if (currentUser) {
          const userLiked = dbService.isPostLikedByUser(currentUser.id, post.id);
          setIsLiked(userLiked);

          // Check if user saved the post
          const userSaved = dbService.isPostSaved(currentUser.id, post.id);
          setIsSaved(userSaved);
        }

        // Use the likes_count from the post data (updated by database triggers)
        setLikesCount(post.likes_count || 0);
      } catch (error) {
        console.error('Error loading post data:', error);
      }
    }
  }, [isOpen, post, currentUser]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const [comments, setComments] = useState<Comment[]>([]);

  const handleLike = () => {
    if (!currentUser || !post) return;

    const liked = dbService.toggleLike({
      user_id: currentUser.id,
      post_id: post.id
    });

    setIsLiked(liked);

    // Get the updated post data with user info to get the correct likes_count
    try {
      const updatedPost = dbService.getPostWithUserById(post.id);
      if (updatedPost) {
        // Update the likes count to match the database
        setLikesCount(updatedPost.likes_count || 0);
      } else {
        // Fallback to manual count update
        setLikesCount(prev => liked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error getting updated post:', error);
      // Fallback to manual count update
      setLikesCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = () => {
    if (!currentUser || !post) return;

    const saved = dbService.toggleSavePost({
      user_id: currentUser.id,
      post_id: post.id
    });

    setIsSaved(saved);
  };

  const handleAddComment = () => {
    if (!currentUser || !newComment.trim() || !post) return;

    const comment = dbService.createComment({
      user_id: currentUser.id,
      post_id: post.id,
      content: newComment.trim()
    });

    // Reload comments to get the new one with user data
    const updatedComments = dbService.getPostComments(post.id);
    setComments(updatedComments);
    setNewComment('');
  };

  console.log('Rendering PostDetailModal with post:', post);

  if (!post) {
    console.log('No post data - returning null');
    return null;
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-7xl h-[95vh] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] m-4">
          <div className="flex flex-col md:flex-row h-full bg-white rounded-lg overflow-hidden shadow-lg border">
            {/* Left Panel - Media */}
            <div className="flex-1 flex items-center justify-center relative min-w-0 h-full">
              <img
                src={post.image}
                alt={post.caption || "Post"}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Right Sidebar - Post Details & Interactions */}
            <div className="w-full md:w-96 flex flex-col bg-white border-l-0 md:border-l border-t md:border-t-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.user_avatar} />
                    <AvatarFallback>
                      {post.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleUsernameClick(post.username)}
                      className="font-semibold text-sm truncate hover:text-gray-600 transition-colors text-left"
                    >
                      {post.username}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOptionsModal(true)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="p-4 border-b">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={post.user_avatar} />
                      <AvatarFallback>
                        {post.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <button
                          onClick={() => handleUsernameClick(post.username)}
                          className="font-semibold mr-2 hover:text-gray-600 transition-colors"
                        >
                          {post.username}
                        </button>
                        {post.caption}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={comment.user_avatar} />
                        <AvatarFallback>
                          {comment.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <button
                            onClick={() => handleUsernameClick(comment.username)}
                            className="font-semibold mr-2 hover:text-gray-600 transition-colors"
                          >
                            {comment.username}
                          </button>
                          {comment.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(comment.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </div>

              {/* Actions & Add Comment */}
              <div className="border-t bg-white">
                {/* Action Buttons */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLike}
                      className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                      disabled={!currentUser}
                    >
                      <Heart
                        className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                      />
                    </button>
                    <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                      <MessageCircle className="h-6 w-6 text-gray-700" />
                    </button>
                    <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                      <Send className="h-6 w-6 text-gray-700" />
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    className="hover:opacity-70 transition-opacity"
                    disabled={!currentUser}
                  >
                    <Bookmark
                      className={`h-6 w-6 ${isSaved ? 'fill-black text-black' : 'text-gray-700'}`}
                    />
                  </button>
                </div>

                {/* Likes Count */}
                <div className="px-4 pb-3">
                  <p className="text-sm font-semibold">
                    {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                  </p>
                </div>

                {/* Add Comment */}
                {currentUser && (
                  <div className="p-4 border-t">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback>
                          {currentUser.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-center gap-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 min-h-[36px] max-h-[100px] resize-none text-sm border-0 focus-visible:ring-0 p-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                        />
                        {newComment.trim() && (
                          <Button
                            onClick={handleAddComment}
                            size="sm"
                            variant="ghost"
                            className="text-blue-500 hover:text-blue-600 p-0 h-auto font-semibold"
                          >
                            Post
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {/* Post Options Modal */}
      <PostOptionsModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false);
          // Refresh saved state
          if (currentUser) {
            const userSaved = dbService.isPostSaved(currentUser.id, post.id);
            setIsSaved(userSaved);
          }
        }}
        post={{
          id: post.id.toString(),
          username: post.username,
          caption: post.caption || ''
        }}
        currentUser={currentUser}
        isOwnPost={currentUser?.username === post.username}
        onPostUpdate={(action) => {
          // Refresh the post data
          if (currentUser) {
            const userSaved = dbService.isPostSaved(currentUser.id, post.id);
            setIsSaved(userSaved);

            // Reload comments to get updated data
            const postComments = dbService.getPostComments(post.id);
            setComments(postComments);
          }

          // Only close modal and refresh for delete action
          if (action === 'delete') {
            onClose();
            window.location.reload();
          }
        }}
      />
    </DialogPrimitive.Root>
  );
}

export default PostDetailModal;