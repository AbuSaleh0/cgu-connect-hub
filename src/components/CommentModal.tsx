import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { dbService } from "@/database";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  currentUser?: { id: number; username: string; avatar?: string; } | null;
}

const CommentModal = ({ isOpen, onClose, postId, currentUser }: CommentModalProps) => {
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);

  const handleUsernameClick = (username: string) => {
    navigate(`/${username}`);
  };

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen]);

  const loadComments = () => {
    try {
      const postComments = dbService.getPostComments(Number(postId));
      setComments(postComments);
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
    }
  };

  const handleSubmitComment = () => {
    if (!currentUser || !comment.trim()) return;

    try {
      dbService.createComment({
        user_id: currentUser.id,
        post_id: Number(postId),
        content: comment.trim()
      });

      setComment("");
      loadComments();
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback>
                    {comment.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUsernameClick(comment.username)}
                      className="font-semibold text-sm hover:text-gray-600 transition-colors"
                    >
                      {comment.username}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
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
  );
};

export default CommentModal;