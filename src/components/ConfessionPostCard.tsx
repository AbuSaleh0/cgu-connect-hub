import { Heart, MessageCircle, Send, MoreHorizontal, MessageSquareQuote, Flag, Bookmark, Share2, Clipboard, Trash } from "lucide-react";
import React, { useState, useEffect } from "react";
import { dbService } from "@/database";
import { Confession } from "@/database/types";
import { useToast } from "@/components/ui/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConfessionPostCardProps {
    confession: Confession;
    onInteractionClick: () => void;
    isAuthenticated: boolean;
    currentUser?: { id: number; username: string; is_admin?: boolean; } | null;
    onCommentClick?: (confessionId: number) => void;
    onDelete?: () => void;
}

const ConfessionPostCard: React.FC<ConfessionPostCardProps> = ({ confession, onInteractionClick, isAuthenticated, currentUser, onCommentClick, onDelete }) => {
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(confession.likes_count);
    const [commentsCount, setCommentsCount] = useState(confession.comments_count);

    // Check if liked/saved on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (currentUser && isAuthenticated) {
                const liked = await dbService.isConfessionLiked(currentUser.id, confession.id);
                setIsLiked(liked);

                const saved = await dbService.isConfessionSaved(currentUser.id, confession.id);
                setIsSaved(saved);
            }
        };
        checkStatus();
    }, [currentUser, isAuthenticated, confession.id]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            onInteractionClick();
            return;
        }

        if (!currentUser) return;

        // Optimistic update
        const previousLiked = isLiked;
        const previousCount = likeCount;

        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            await dbService.toggleConfessionLike(currentUser.id, confession.id);
        } catch (error) {
            // Revert on error
            setIsLiked(previousLiked);
            setLikeCount(previousCount);
            console.error("Error toggling like:", error);
        }
    };

    const handleComment = () => {
        if (!isAuthenticated) {
            onInteractionClick();
            return;
        }

        if (onCommentClick) {
            onCommentClick(confession.id);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Confession on CGU Connect Hub',
            text: `Check out this confession: "${confession.content.substring(0, 50)}..."`,
            url: `${window.location.origin}/confessions?id=${confession.id}`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            handleCopyLink();
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/confessions?id=${confession.id}`);
        toast({
            title: "Link copied",
            description: "Link to confession copied to clipboard",
        });
    };

    const handleSave = async () => {
        if (!isAuthenticated || !currentUser) {
            onInteractionClick();
            return;
        }

        const newSavedState = !isSaved;
        setIsSaved(newSavedState);

        try {
            await dbService.toggleConfessionSave(currentUser.id, confession.id);
            toast({
                title: newSavedState ? "Confession Saved" : "Confession Unsaved",
                description: newSavedState ? "You can find it in your profile under Saved Posts." : "Removed from your saved items.",
            });
        } catch (error) {
            setIsSaved(!newSavedState); // Revert
            console.error("Error toggling save:", error);
            toast({
                title: "Error",
                description: "Could not update save status.",
                variant: 'destructive'
            });
        }
    };

    const handleReport = () => {
        if (!isAuthenticated) {
            onInteractionClick();
            return;
        }
        // Mock report functionality
        toast({
            title: "Reported",
            description: "Thank you for reporting this confession. We will review it shortly.",
        });
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this confession?")) return;

        const result = await dbService.deleteConfession(confession.id);
        if (result.success) {
            toast({ title: "Confession deleted" });
            onDelete?.();
        } else {
            toast({ title: "Error deleting confession", variant: "destructive" });
        }
    };

    return (
        <article className="bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow border border-border/50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                        <MessageSquareQuote size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-foreground">Confession #{confession.id}</h3>
                        <p className="text-xs text-muted-foreground">{dbService.formatTimestamp(confession.created_at)}</p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleSave}>
                            <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                            {isSaved ? 'Unsave' : 'Save'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share to...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyLink}>
                            <Clipboard className="h-4 w-4 mr-2" />
                            Copy Link
                        </DropdownMenuItem>
                        {currentUser?.is_admin && (
                            <>
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuItem onClick={handleReport} className="text-destructive focus:text-destructive">
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            <div className="p-6">
                <p className="text-lg leading-relaxed whitespace-pre-wrap font-medium text-foreground/90">
                    {confession.content}
                </p>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-muted/20 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                    >
                        <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : 'group-hover:scale-110 transition-transform'}`} />
                        <span className="text-sm font-semibold">{likeCount}</span>
                    </button>

                    <button
                        onClick={handleComment}
                        className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
                    >
                        <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-semibold">{commentsCount}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
                    >
                        <Send className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ConfessionPostCard;
