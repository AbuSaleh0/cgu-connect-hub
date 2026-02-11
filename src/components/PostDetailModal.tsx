import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, X, Heart, MessageCircle, Send, Bookmark, Trash, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import { PostWithUser, Comment, CommentWithUser } from "@/database/types";
import { formatTimeAgo } from "@/lib/utils";
import PostOptionsModal from "./PostOptionsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostWithUser | null;
}

const PostDetailModal = ({ isOpen, onClose, post }: PostDetailModalProps) => {
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comments, setComments] = useState<CommentWithUser[]>([]);


  // Interaction states for comments
  const [selectedComment, setSelectedComment] = useState<CommentWithUser | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();

  const handleUsernameClick = (username: string) => {
    navigate(`/${username}`);
  };

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && post) {
        setCurrentImageIndex(0);
        try {
          // Load comments
          const postComments = await dbService.getPostComments(post.id);
          setComments(postComments);

          // Check if user liked the post
          if (currentUser) {
            const userLiked = await dbService.isPostLikedByUser(currentUser.id, post.id);
            setIsLiked(userLiked);

            // Check if user saved the post
            const userSaved = await dbService.isPostSaved(currentUser.id, post.id);
            setIsSaved(userSaved);
          }

          // Use the likes_count from the post data
          setLikesCount(post.likes_count || 0);
        } catch (error) {
          console.error('Error loading post data:', error);
        }
      }
    };
    loadData();
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

  const handleLike = async () => {
    if (!currentUser || !post) return;

    const liked = await dbService.toggleLike(
      currentUser.id,
      post.id
    );

    setIsLiked(liked);

    // Get the updated post data with user info to get the correct likes_count
    try {
      const updatedPost = await dbService.getPostWithUserById(post.id);
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

  const handleSave = async () => {
    if (!currentUser || !post) return;

    try {
      const saved = await dbService.toggleSavePost({
        user_id: currentUser.id,
        post_id: post.id
      });

      setIsSaved(saved);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || !newComment.trim() || !post) return;

    const comment = await dbService.createComment({
      user_id: currentUser.id,
      post_id: post.id,
      content: newComment.trim()
    });

    if (comment) {
      const updatedComments = await dbService.getPostComments(post.id);
      setComments(updatedComments);
      setNewComment('');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const success = await dbService.deleteComment(commentId);
    if (success) {
      if (post) {
        const updatedComments = await dbService.getPostComments(post.id);
        setComments(updatedComments);
      }
      setIsOptionsModalOpen(false);
    }
  };

  const handleReportComment = (commentId: number) => {
    console.log(`Reported comment ${commentId}`);
    setIsOptionsModalOpen(false);
    alert("Comment reported to admins.");
  };

  // Mobile Long Press Handlers
  const handleTouchStart = (comment: CommentWithUser) => {
    if (!currentUser) return;
    longPressTimerRef.current = setTimeout(() => {
      setSelectedComment(comment);
      setIsOptionsModalOpen(true);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (!post) {
    return null;
  }

  const images = post.images && post.images.length > 0 ? post.images : [post.image];
  const hasMultipleImages = images.length > 1;

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

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-7xl h-[95vh] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] m-4">
          <DialogPrimitive.Title className="sr-only">Post Details</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">View post details, comments, and interactions.</DialogPrimitive.Description>
          <div className="flex flex-col md:flex-row h-full bg-white rounded-lg overflow-hidden shadow-lg border">
            {/* Left Panel - Media */}
            <div className="flex-1 flex items-center justify-center relative min-w-0 h-full bg-black/5 group">
              <img
                src={images[currentImageIndex]}
                alt={post.caption || "Post"}
                className="w-full h-full object-contain"
              />

              {/* Navigation Arrows */}
              {hasMultipleImages && (
                <>
                  {currentImageIndex > 0 && (
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}
                  {currentImageIndex < images.length - 1 && (
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}

                  {/* Pagination Dots */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === currentImageIndex
                          ? 'w-6 bg-white shadow-sm'
                          : 'w-2 bg-white/50 hover:bg-white/70'
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
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
                    <div className="mr-2">
                      <PostOptionsModal
                        post={{
                          id: post.id.toString(),
                          username: post.username,
                          caption: post.caption || ''
                        }}
                        currentUser={currentUser}
                        isOwnPost={currentUser.username === post.username}
                        isSaved={isSaved}
                        onPostUpdate={(action, payload) => {
                          if (action === 'delete') {
                            onClose();
                            window.location.reload();
                          } else if (action === 'edit') {
                            // Ideally reload post data, for now close to force refresh when re-opened or reload page
                            window.location.reload();
                          } else if (action === 'save') {
                            // Update local saved state
                            if (typeof payload === 'boolean') {
                              setIsSaved(payload);
                            } else {
                              dbService.isPostSaved(currentUser.id, post.id).then(setIsSaved);
                            }
                          }
                        }}
                      />
                    </div>
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
                    <div
                      key={comment.id}
                      className="flex gap-3 text-sm group relative select-none"
                      onTouchStart={() => handleTouchStart(comment)}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <Avatar
                        className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleUsernameClick(comment.username)}
                      >
                        <AvatarImage src={comment.user_avatar} />
                        <AvatarFallback>
                          {comment.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold cursor-pointer hover:underline"
                              onClick={() => handleUsernameClick(comment.username)}
                            >
                              {comment.username || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
                          </div>

                          {/* Desktop Options Menu */}
                          {currentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {currentUser.id === comment.user_id ? (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleReportComment(comment.id)}>
                                    <Flag className="h-4 w-4 mr-2" />
                                    Report
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  Cancel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="text-foreground/90 leading-relaxed break-words">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {
                    comments.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-8">
                        No comments yet. Be the first to comment!
                      </div>
                    )
                  }
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


    </DialogPrimitive.Root>
  );
}

export default PostDetailModal;