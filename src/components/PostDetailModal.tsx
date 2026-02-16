import { useState, useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dbService } from "@/database/service";
import { PostWithUser } from "@/database/types";
import { UserPublic } from "@/database/types";
import { convertDbPostToCardData, PostCardData } from "@/database/utils";
import PostCard from "@/components/PostCard";
import { useNavigate } from "react-router-dom";

interface PostDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: number | null;
    currentUser: UserPublic | null;
    isAuthenticated: boolean;
}

const PostDetailModal = ({ isOpen, onClose, postId, currentUser, isAuthenticated }: PostDetailModalProps) => {
    const navigate = useNavigate();
    const [post, setPost] = useState<PostCardData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && postId) {
            loadPost();
        } else {
            setPost(null);
        }
    }, [isOpen, postId]);

    const loadPost = async () => {
        if (!postId) return;
        setLoading(true);
        try {
            const dbPost = await dbService.getPostWithUserById(postId);
            if (dbPost) {
                const formattedPost = convertDbPostToCardData(dbPost, dbService.formatTimestamp);
                setPost(formattedPost);
            }
        } catch (error) {
            console.error("Error loading post:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInteractionClick = () => {
        if (!isAuthenticated) {
            // onClose(); // Maybe keep it open? 
            // The LoginOverlay is usually global or passed down. 
            // In Index.tsx, handleInteractionClick sets showLoginOverlay(true).
            // We might need to propagate this up or handle it here if we had access to trigger login.
            alert("Please login to interact.");
        }
    };

    if (!isOpen) return null;

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] duration-200 p-0 md:p-4 outline-none">
                    <div className="bg-transparent md:bg-transparent flex flex-col max-h-[90vh] relative">
                        <div className="absolute -top-10 right-0 md:-right-10 z-50">
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="overflow-y-auto rounded-lg shadow-2xl">
                            {loading ? (
                                <div className="bg-white p-8 flex justify-center items-center rounded-lg min-h-[200px]">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : post ? (
                                <PostCard
                                    post={post}
                                    onInteractionClick={handleInteractionClick}
                                    isAuthenticated={isAuthenticated}
                                    currentUser={currentUser}
                                />
                            ) : (
                                <div className="bg-white p-8 text-center rounded-lg">
                                    <p className="text-red-500">Post not found or unavailable.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};

export default PostDetailModal;
