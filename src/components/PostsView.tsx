import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostCard from './PostCard';
import { PostWithUser } from '@/database/types';
import { formatTimeAgo } from '@/lib/utils';
import { dbService } from '@/database/service';

interface PostsViewProps {
    posts: PostWithUser[];
    initialPostId?: number;
    onClose: () => void;
    currentUser: any;
}

const PostsView: React.FC<PostsViewProps> = ({
    posts,
    initialPostId,
    onClose,
    currentUser
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to the selected post on mount
    useEffect(() => {
        if (initialPostId && scrollRef.current) {
            const element = document.getElementById(`post-${initialPostId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }
    }, [initialPostId]);

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold">Posts</h1>
            </div>

            {/* Posts Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto no-scrollbar pb-20"
            >
                <div className="space-y-4 p-0 max-w-xl mx-auto w-full">  {/* Removed padding to take full width like Instagram */}
                    {posts.map((post) => (
                        <div key={post.id} id={`post-${post.id}`}>
                            <PostCard
                                post={{
                                    id: String(post.id),
                                    username: post.username,
                                    userAvatar: post.user_avatar || "",
                                    image: post.image,
                                    images: post.images,
                                    caption: post.caption || "",
                                    likes: post.likes_count,
                                    comments: post.comments_count,
                                    timestamp: formatTimeAgo(post.created_at)
                                }}
                                isAuthenticated={!!currentUser}
                                currentUser={currentUser}
                                onInteractionClick={() => {
                                    // Handle login prompt if needed, similar to feed
                                }}
                                onLike={() => {
                                    // Optional: Refresh data if needed
                                }}
                                onComment={() => {
                                    // Optional: Refresh data if needed
                                }}
                                onShare={() => {
                                    // Optional: Handle share
                                }}
                                onSave={async (isSaved) => {
                                    // Ensure local state is updated if needed, though PostCard handles its own state
                                }}
                                initialIsSaved={false} // PostCard fetches its own initial state
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PostsView;
