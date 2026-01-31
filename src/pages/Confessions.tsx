import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import ConfessionPostCard from "@/components/ConfessionPostCard";
import CreateConfessionModal from "@/components/CreateConfessionModal";
import ConfessionDetailModal from "@/components/ConfessionDetailModal";
import LoginOverlay from "@/components/LoginOverlay";
import { dbService } from "@/database";
import { Confession } from "@/database/types";
import { sessionManager } from "@/lib/session";
import { Button } from "@/components/ui/button";

const Confessions = () => {
    const navigate = useNavigate();
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [showLoginOverlay, setShowLoginOverlay] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(sessionManager.isLoggedIn());
    const [currentUser, setCurrentUser] = useState(sessionManager.getCurrentUser());

    const loadConfessions = async () => {
        setLoading(true);
        try {
            const data = await dbService.getConfessions();
            setConfessions(data);
        } catch (error) {
            console.error("Error loading confessions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial auth check
        if (!sessionManager.isLoggedIn()) {
            setShowLoginOverlay(true);
            setLoading(false);
            return;
        }

        loadConfessions();

        // Listen for auth changes
        const handleStorageChange = () => {
            const loggedIn = sessionManager.isLoggedIn();
            setIsAuthenticated(loggedIn);
            setCurrentUser(sessionManager.getCurrentUser());

            if (loggedIn) {
                loadConfessions();
                setShowLoginOverlay(false);
            } else {
                setConfessions([]);
                setShowLoginOverlay(true);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);



    const handleCreateClick = () => {
        if (!isAuthenticated) {
            setShowLoginOverlay(true);
        } else {
            setIsCreateModalOpen(true);
        }
    };

    const handleInteractionClick = () => {
        if (!isAuthenticated) {
            setShowLoginOverlay(true);
        }
    };

    const handleNavClick = (section: string) => {
        if (section === 'Search') {
            navigate('/search');
        } else if (section === 'Notifications') {
            navigate('/notifications');
        } else if (section === 'Messages') {
            navigate('/messages');
        } else if (section === 'Home') {
            navigate('/');
        }
    };

    // FAB style for desktop/mobile
    // "In the confession page a plus icon should be on right bottom corner to write a confession"

    return (
        <div className="min-h-screen bg-background relative">
            <Header
                onLoginClick={() => setShowLoginOverlay(true)}
                onSignUpClick={() => setShowLoginOverlay(true)}
                onExploreClick={() => handleNavClick('Search')}
                onMessagesClick={() => handleNavClick('Messages')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')} // Default create post for header button? Or should it be confession? 
                // User asked for "plus icon should be on right bottom corner", so the header button might still be for normal posts 
                // OR we can make the header button context aware. For now stick to normal posts for header create.
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                onLogout={() => {
                    sessionManager.logout();
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                }}
                onHomeClick={() => handleNavClick('Home')}
            />

            <main className="container max-w-2xl mx-auto py-8 px-4 pb-24 md:pb-8">
                <div className="space-y-6">
                    <div className="flex flex-col space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Confessions</h1>
                        <p className="text-muted-foreground">Anonymous thoughts from the community.</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : confessions.length > 0 ? (
                        confessions.map((confession) => (
                            <ConfessionPostCard
                                key={confession.id}
                                confession={confession}
                                onInteractionClick={handleInteractionClick}
                                isAuthenticated={isAuthenticated}
                                currentUser={currentUser}
                                onCommentClick={(confessionId) => {
                                    const selected = confessions.find(c => c.id === confessionId);
                                    if (selected) {
                                        setSelectedConfession(selected);
                                        setIsDetailModalOpen(true);
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <h3 className="text-xl font-semibold mb-2">No confessions yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Be the first to confess something!
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Action Button for Confessions */}
            <Button
                onClick={handleCreateClick}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg z-40 p-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="icon"
            >
                <Plus className="h-8 w-8" />
            </Button>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
                onHomeClick={() => handleNavClick('Home')}
                onExploreClick={() => handleNavClick('Search')}
                onNotificationsClick={() => handleNavClick('Notifications')}
                onCreateClick={() => navigate('/create')} // Keep this for normal posts? Or switch to confession if on confession page?
                // User: "For mobile users this should be on bottom navbar between search and home." 
                // This implies a LINK to the confession page, not a create button. The create button is the FAB.
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
            />

            <CreateConfessionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                currentUser={currentUser}
                onConfessionCreated={loadConfessions}
            />

            <ConfessionDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedConfession(null);
                    loadConfessions(); // Refresh to update counts
                }}
                confession={selectedConfession}
                currentUser={currentUser}
            />

            {showLoginOverlay && (
                <LoginOverlay
                    onClose={() => {
                        setShowLoginOverlay(false);
                        if (!sessionManager.isLoggedIn()) {
                            navigate('/');
                        }
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

export default Confessions;
