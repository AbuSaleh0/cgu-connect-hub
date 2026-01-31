import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, MessageSquareQuote, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import { dbService } from "@/database";
import { Confession } from "@/database/types";
import { sessionManager } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoginOverlay from "@/components/LoginOverlay";

const MyConfessions = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(sessionManager.isLoggedIn());
    const [currentUser, setCurrentUser] = useState(sessionManager.getCurrentUser());
    const [showLoginOverlay, setShowLoginOverlay] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    useEffect(() => {
        if (!sessionManager.isLoggedIn()) {
            setShowLoginOverlay(true);
            setLoading(false);
            return;
        }

        loadMyConfessions();

        const handleStorageChange = () => {
            const loggedIn = sessionManager.isLoggedIn();
            setIsAuthenticated(loggedIn);
            setCurrentUser(sessionManager.getCurrentUser());
            if (!loggedIn) {
                navigate('/');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const loadMyConfessions = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await dbService.getUserConfessions(currentUser.id);
            setConfessions(data);
        } catch (error) {
            console.error("Error loading user confessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const result = await dbService.deleteConfession(deleteId);
            if (result.success) {
                setConfessions(prev => prev.filter(c => c.id !== deleteId));
                toast({
                    title: "Confession deleted",
                    description: "Your confession has been permanently deleted.",
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error deleting confession:", error);
            toast({
                title: "Error",
                description: "Failed to delete confession. Please try again.",
                variant: "destructive",
            });
        } finally {
            setDeleteId(null);
        }
    };

    const handleNavClick = (section: string) => {
        if (section === 'Search') navigate('/search');
        if (section === 'Home') navigate('/');
        if (section === 'Notifications') navigate('/notifications');
        if (section === 'Messages') navigate('/messages');
    };

    return (
        <div className="min-h-screen bg-background">
            <Header
                onLoginClick={() => setShowLoginOverlay(true)}
                onSignUpClick={() => setShowLoginOverlay(true)}
                onExploreClick={() => handleNavClick('Search')}
                onMessagesClick={() => handleNavClick('Messages')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')}
                isAuthenticated={isAuthenticated}
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
                        <h1 className="text-2xl font-bold">Your Confessions</h1>
                        <p className="text-muted-foreground">Manage your anonymous posts</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : confessions.length > 0 ? (
                    <div className="space-y-4">
                        {confessions.map((confession) => (
                            <div
                                key={confession.id}
                                className="bg-card rounded-lg border border-border/50 p-4 transition-all hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <MessageSquareQuote size={16} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm">#{confession.id}</span>
                                            <p className="text-xs text-muted-foreground">{dbService.formatTimestamp(confession.created_at)}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                                        onClick={() => setDeleteId(confession.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <p className="text-foreground/90 whitespace-pre-wrap mb-4 pl-10">
                                    {confession.content}
                                </p>

                                <div className="flex gap-4 pl-10 text-xs text-muted-foreground">
                                    <span>{confession.likes_count} Likes</span>
                                    <span>{confession.comments_count} Comments</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <h3 className="text-xl font-semibold mb-2">No confessions yet</h3>
                        <p className="text-muted-foreground mb-4">
                            You haven't posted any confessions yet.
                        </p>
                        <Button onClick={() => navigate('/confessions')}>
                            Browse Confessions
                        </Button>
                    </div>
                )}
            </main>

            <MobileBottomNav
                onHomeClick={() => handleNavClick('Home')}
                onExploreClick={() => handleNavClick('Search')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')}
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Confession?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your confession and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showLoginOverlay && (
                <LoginOverlay
                    onClose={() => {
                        setShowLoginOverlay(false);
                        navigate('/');
                    }}
                    onLogin={() => {
                        setShowLoginOverlay(false);
                        navigate('/');
                    }}
                    onSignUp={() => navigate('/')}
                />
            )}
        </div>
    );
};

export default MyConfessions;
