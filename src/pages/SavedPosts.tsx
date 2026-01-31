import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, MessageSquareQuote, LayoutGrid } from "lucide-react";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import { dbService } from "@/database";
import { PostWithUser, Confession } from "@/database/types";
import { sessionManager } from "@/lib/session";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import ConfessionPostCard from "@/components/ConfessionPostCard";
import ConfessionDetailModal from "@/components/ConfessionDetailModal";
import PostDetailModal from "@/components/PostDetailModal";

const SavedPosts = () => {
    const navigate = useNavigate();
    const [savedPosts, setSavedPosts] = useState<PostWithUser[]>([]);
    const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'posts' | 'confessions'>('posts');
    const [currentUser, setCurrentUser] = useState(sessionManager.getCurrentUser());

    // Modal states
    const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
    const [showConfessionModal, setShowConfessionModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<PostWithUser | null>(null);
    const [showPostDetail, setShowPostDetail] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            navigate('/');
            return;
        }
        loadSavedItems();
    }, [currentUser]);

    const loadSavedItems = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Load saved posts
            // Assuming getSavedPosts exists, if not we'll need to add it
            const posts = await dbService.getSavedPosts(currentUser.id);
            setSavedPosts(posts);

            // Load saved confessions
            const confessions = await dbService.getSavedConfessions(currentUser.id);
            setSavedConfessions(confessions);
        } catch (error) {
            console.error("Error loading saved items:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavClick = (section: string) => {
        if (section === 'Search') navigate('/search');
        if (section === 'Home') navigate('/');
        if (section === 'Notifications') navigate('/notifications');
        if (section === 'Messages') navigate('/messages');
    };

    const handlePostClick = (post: PostWithUser) => {
        setSelectedPost(post);
        setShowPostDetail(true);
    };

    const handleConfessionCommentClick = (confession: Confession) => {
        setSelectedConfession(confession);
        setShowConfessionModal(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <Header
                onLoginClick={() => { }}
                onSignUpClick={() => { }}
                onExploreClick={() => handleNavClick('Search')}
                onMessagesClick={() => handleNavClick('Messages')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')}
                isAuthenticated={!!currentUser}
                currentUser={currentUser}
                onLogout={() => {
                    sessionManager.logout();
                    navigate('/');
                }}
                onHomeClick={() => handleNavClick('Home')}
            />

            <main className="container max-w-2xl mx-auto py-8 px-4 pb-24 md:pb-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Bookmark className="h-6 w-6" />
                            Saved Items
                        </h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b mb-6">
                    <button
                        className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'posts'
                                ? 'text-primary border-b-2 border-primary -mb-[1px]'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            Posts ({savedPosts.length})
                        </div>
                    </button>
                    <button
                        className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'confessions'
                                ? 'text-primary border-b-2 border-primary -mb-[1px]'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                        onClick={() => setActiveTab('confessions')}
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquareQuote className="h-4 w-4" />
                            Confessions ({savedConfessions.length})
                        </div>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeTab === 'posts' ? (
                            savedPosts.length > 0 ? (
                                savedPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        {...post}
                                        currentUser={currentUser}
                                        onLike={() => { }} // Consider implementing refresh logic if needed
                                        onComment={() => handlePostClick(post)}
                                        onShare={() => { }}
                                        onSave={() => loadSavedItems()} // Refresh list on unsave
                                        onDelete={() => { }} // Saved posts usually aren't deleted from here
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    No saved posts found.
                                </div>
                            )
                        ) : (
                            savedConfessions.length > 0 ? (
                                savedConfessions.map(confession => (
                                    <ConfessionPostCard
                                        key={confession.id}
                                        confession={confession}
                                        isAuthenticated={!!currentUser}
                                        currentUser={currentUser}
                                        onInteractionClick={() => { }}
                                        onCommentClick={() => handleConfessionCommentClick(confession)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    No saved confessions found.
                                </div>
                            )
                        )}
                    </div>
                )}
            </main>

            <MobileBottomNav
                onHomeClick={() => handleNavClick('Home')}
                onExploreClick={() => handleNavClick('Search')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')}
                isAuthenticated={!!currentUser}
                currentUser={currentUser}
            />

            {/* Modals */}
            <ConfessionDetailModal
                isOpen={showConfessionModal}
                onClose={() => setShowConfessionModal(false)}
                confession={selectedConfession}
                currentUser={currentUser}
            />

            <PostDetailModal
                isOpen={showPostDetail}
                onClose={() => setShowPostDetail(false)}
                post={selectedPost}
            />
        </div>
    );
};

export default SavedPosts;
