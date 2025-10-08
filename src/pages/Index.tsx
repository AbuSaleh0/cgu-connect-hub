import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import LoginOverlay from "@/components/LoginOverlay";
import AuthPage from "@/components/AuthPage";
import { Button } from "@/components/ui/button";
import { dbService, seedDatabase, sessionManager } from "@/database";
import { convertDbPostToCardData, PostCardData } from "@/database/utils";

const Index = () => {
  const navigate = useNavigate();
  
  // Load persisted auth view state on mount
  const loadAuthView = (): "feed" | "login" | "signup" => {
    try {
      const saved = localStorage.getItem('cgu_auth_view');
      if (saved && ['feed', 'login', 'signup'].includes(saved)) {
        return saved as "feed" | "login" | "signup";
      }
    } catch (error) {
      console.error('Error loading auth view:', error);
    }
    return "feed";
  };

  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [authView, setAuthView] = useState<"feed" | "login" | "signup">(loadAuthView());
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(() => {
    // Check if user was in auth flow before refresh
    const savedAuthState = localStorage.getItem('authState');
    const currentUser = sessionManager.getCurrentUser();
    return savedAuthState === 'true' && !currentUser;
  });
  const [authMode, setAuthMode] = useState<"login" | "signup">(() => {
    // Restore auth mode from localStorage
    const savedAuthMode = localStorage.getItem('authMode');
    return (savedAuthMode as "login" | "signup") || "login";
  });
  const [user, setUser] = useState(sessionManager.getCurrentUser());

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('authState', showAuth.toString());
  }, [showAuth]);

  // Save auth mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('authMode', authMode);
  }, [authMode]);

  // Persist auth view whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cgu_auth_view', authView);
    } catch (error) {
      console.error('Error persisting auth view:', error);
    }
  }, [authView]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check authentication status
        const loggedIn = sessionManager.isLoggedIn();
        setIsAuthenticated(loggedIn);
        const currentUser = sessionManager.getCurrentUser();
        setUser(currentUser);
        
        // Redirect to profile setup if user hasn't completed it
        if (loggedIn && currentUser && !currentUser.profileSetupComplete) {
          navigate('/profile-setup');
          return;
        }

        // Seed database if it's empty
        seedDatabase();
        
        // Fetch posts from database
        const dbPosts = dbService.getAllPosts();
        const formattedPosts = dbPosts.map(post => 
          convertDbPostToCardData(post, dbService.formatTimestamp)
        );
        
        setPosts(formattedPosts);
      } catch (error) {
        console.error('Error initializing data:', error);
        // Fall back to empty array on error
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleInteractionClick = () => {
    setShowLoginOverlay(true);
  };

  const handleLoginClick = () => {
    setShowLoginOverlay(false);
    setAuthView("login");
  };

  const handleSignUpClick = () => {
    setShowLoginOverlay(false);
    setAuthView("signup");
  };

  const handleBackToFeed = () => {
    setAuthView("feed");
  };

  const handleNavClick = (section: string) => {
    // For now, just log the action - in a real app, these would navigate to different pages
    console.log(`${section} navigation clicked`);
    // You could show a temporary message or implement actual navigation
    alert(`${section} feature coming soon!`);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setUser(sessionManager.getCurrentUser());
    setAuthView("feed");
    // Clear auth state from localStorage on successful authentication
    localStorage.removeItem('authState');
    localStorage.removeItem('authMode');
    // Clear auth view persistence when successfully authenticated
    try {
      localStorage.setItem('cgu_auth_view', 'feed');
    } catch (error) {
      console.error('Error clearing auth view persistence:', error);
    }
  };

  const handleLogout = () => {
    sessionManager.logout();
    setIsAuthenticated(false);
    setUser(null);
    setAuthView("feed");
  };

  if (authView === "login") {
    return (
      <AuthPage
        mode="login"
        onBack={handleBackToFeed}
        onSwitchMode={() => setAuthView("signup")}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (authView === "signup") {
    return (
      <AuthPage
        mode="signup"
        onBack={handleBackToFeed}
        onSwitchMode={() => setAuthView("login")}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onLoginClick={handleLoginClick} 
          onSignUpClick={handleSignUpClick}
          onHomeClick={() => handleNavClick('Home')}
          onExploreClick={() => handleNavClick('Explore')}
          onMessagesClick={() => handleNavClick('Messages')}
          onNotificationsClick={() => handleNavClick('Notifications')}
          onCreateClick={() => handleNavClick('Create')}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          onLogout={handleLogout}
        />
        <main className="container max-w-2xl mx-auto py-8 px-4">
          <div className="space-y-6">
            <div className="text-center">Loading posts...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onLoginClick={handleLoginClick} 
        onSignUpClick={handleSignUpClick}
        onHomeClick={() => handleNavClick('Home')}
        onExploreClick={() => handleNavClick('Explore')}
        onMessagesClick={() => handleNavClick('Messages')}
        onNotificationsClick={() => handleNavClick('Notifications')}
        onCreateClick={() => handleNavClick('Create')}
        isAuthenticated={isAuthenticated}
          currentUser={user}
          onLogout={handleLogout}
        />      <main className="container max-w-2xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onInteractionClick={handleInteractionClick}
              />
            ))
          ) : (
            <div className="text-center">No posts available</div>
          )}
        </div>
      </main>

      {showLoginOverlay && (
        <LoginOverlay
          onClose={() => setShowLoginOverlay(false)}
          onLogin={handleLoginClick}
          onSignUp={handleSignUpClick}
        />
      )}
    </div>
  );
};

export default Index;
