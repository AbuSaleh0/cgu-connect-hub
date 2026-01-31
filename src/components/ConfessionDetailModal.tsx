import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, MessageCircle, Send, MessageSquareQuote, MoreHorizontal, Trash, Flag } from "lucide-react";
import { dbService } from "@/database/service";
import { Confession, ConfessionComment, ConfessionCommentWithUser, UserPublic } from "@/database/types";
import { formatTimeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
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

interface ConfessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    confession: Confession | null;
    currentUser: UserPublic | null;
}

const ConfessionDetailModal = ({ isOpen, onClose, confession, currentUser }: ConfessionDetailModalProps) => {
    const navigate = useNavigate();
    const [comments, setComments] = useState<ConfessionCommentWithUser[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);

    // Interaction states
    const [selectedComment, setSelectedComment] = useState<ConfessionCommentWithUser | null>(null);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen && confession) {
            loadComments();
        }
    }, [isOpen, confession]);

    const loadComments = async () => {
        if (!confession) return;
        setLoading(true);
        try {
            const data = await dbService.getConfessionComments(confession.id);
            setComments(data);
        } catch (error) {
            console.error("Error loading comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!currentUser || !newComment.trim() || !confession) return;

        try {
            await dbService.createConfessionComment({
                user_id: currentUser.id,
                confession_id: confession.id,
                content: newComment.trim()
            });

            setNewComment("");
            loadComments();
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        const success = await dbService.deleteConfessionComment(commentId);
        if (success) {
            loadComments();
            setIsOptionsModalOpen(false);
        }
    };

    const handleReportComment = (commentId: number) => {
        console.log(`Reported comment ${commentId}`);
        // In a real app, this would send a report to the backend
        setIsOptionsModalOpen(false);
        alert("Comment reported to admins.");
    };

    const handleUserClick = (username: string) => {
        onClose(); // Close modal properly before navigation
        navigate(`/${username}`);
    };

    // Mobile Long Press Handlers
    const handleTouchStart = (comment: ConfessionCommentWithUser) => {
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

    const isOwner = selectedComment && currentUser && selectedComment.user_id === currentUser.id;

    if (!confession) return null;

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] p-4">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                                    <MessageSquareQuote size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">Confession #{confession.id}</h3>
                                    <p className="text-xs text-muted-foreground">{formatTimeAgo(confession.created_at)}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="overflow-y-auto flex-1 p-4 space-y-6">
                            {/* Confession Text */}
                            <div className="bg-muted/30 p-4 rounded-lg">
                                <p className="text-lg leading-relaxed whitespace-pre-wrap font-medium text-foreground/90">
                                    {confession.content}
                                </p>
                            </div>

                            {/* Comments Section */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Comments
                                </h4>

                                {loading ? (
                                    <div className="text-center py-4">Loading comments...</div>
                                ) : comments.length > 0 ? (
                                    comments.map((comment) => (
                                        <div
                                            key={comment.id}
                                            className="flex gap-3 text-sm group relative select-none"
                                            onTouchStart={() => handleTouchStart(comment)}
                                            onTouchEnd={handleTouchEnd}
                                            // Prevent default context menu on long press
                                            onContextMenu={(e) => e.preventDefault()}
                                        >
                                            <Avatar
                                                className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => handleUserClick(comment.user.username)}
                                            >
                                                <AvatarImage src={comment.user.avatar} />
                                                <AvatarFallback>
                                                    {comment.user.username?.[0]?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="font-semibold cursor-pointer hover:underline"
                                                            onClick={() => handleUserClick(comment.user.username)}
                                                        >
                                                            {comment.user.username || 'Unknown'}
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
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer / Input Area */}
                        {currentUser ? (
                            <div className="p-4 border-t bg-gray-50">
                                <div className="flex gap-2">
                                    <Textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="min-h-[40px] max-h-[100px] resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 border-t bg-gray-50 text-center">
                                <p className="text-sm text-muted-foreground">Please log in to comment.</p>
                            </div>
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>

            {/* Mobile Options Modal (Triggered by Long Press) */}
            <Dialog open={isOptionsModalOpen} onOpenChange={setIsOptionsModalOpen}>
                <DialogContent className="sm:max-w-sm rounded-[12px] w-[90%]">
                    <DialogHeader>
                        <DialogTitle>Options</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-4">
                        {isOwner ? (
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
        </DialogPrimitive.Root>
    );
};

export default ConfessionDetailModal;
