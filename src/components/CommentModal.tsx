import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MoreHorizontal, Trash, Flag } from "lucide-react";
import { dbService } from "@/database";
import { CommentWithUser } from "@/database/types";
import { formatTimeAgo } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  currentUser?: { id: number; username: string; avatar?: string; is_admin?: boolean; } | null;
  isPostOwner?: boolean;
}

const CommentModal = ({ isOpen, onClose, postId, currentUser, isPostOwner }: CommentModalProps) => {
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentWithUser[]>([]);

  // Interaction states for comments
  const [selectedComment, setSelectedComment] = useState<CommentWithUser | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUsernameClick = (username: string) => {
    navigate(`/${username}`);
    onClose(); // Optional: Close modal on navigation
  };

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    try {
      const postComments = await dbService.getPostComments(Number(postId));
      setComments(postComments);
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUser || !comment.trim()) return;

    try {
      const newComment = await dbService.createComment({
        user_id: currentUser.id,
        post_id: Number(postId),
        content: comment.trim()
      });

      if (newComment) {
        setComment("");
        await loadComments();
      } else {
        alert("Failed to submit comment. Please try again.");
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("An error occurred while commenting.");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const success = await dbService.deleteComment(commentId);
    if (success) {
      await loadComments();
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 text-sm group relative select-none"
                  onTouchStart={() => handleTouchStart(comment)}
                  onTouchEnd={handleTouchEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0 cursor-pointer" onClick={() => handleUsernameClick(comment.username)}>
                    <AvatarImage src={comment.user_avatar} />
                    <AvatarFallback>
                      {comment.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUsernameClick(comment.username)}
                          className="font-semibold text-sm hover:text-gray-600 transition-colors"
                        >
                          {comment.username}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(comment.created_at)}
                        </span>
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
                            {currentUser.id === comment.user_id || isPostOwner || currentUser.is_admin ? (
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
                    <p className="text-sm text-foreground/90 leading-relaxed break-words">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No comments yet</p>
            )}
          </div>

          {currentUser && (
            <div className="flex gap-2 pt-4 border-t">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback>
                  {currentUser.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                className="flex-1"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!comment.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Options Dialog */}
      <Dialog open={isOptionsModalOpen} onOpenChange={setIsOptionsModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-[12px] w-[90%]">
          <DialogHeader>
            <DialogTitle>Options</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {selectedComment && currentUser && (selectedComment.user_id === currentUser.id || isPostOwner || currentUser.is_admin) ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => selectedComment && handleDeleteComment(selectedComment.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Comment
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => selectedComment && handleReportComment(selectedComment.id)}
              >
                <Flag className="mr-2 h-4 w-4" />
                Report Comment
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOptionsModalOpen(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommentModal;