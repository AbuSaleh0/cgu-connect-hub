import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import PostCard from "@/components/PostCard";
import LoginOverlay from "@/components/LoginOverlay";
import AuthPage from "@/components/AuthPage";
import { Button } from "@/components/ui/button";
import { dbService } from "@/database";
import { sessionManager } from "@/lib/session";
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

  const loadPosts = (() => {
    let isLoading = false;

    return async () => {
      if (isLoading) {
        console.log('Posts already loading, skipping...');
        return;
      }

      try {
        isLoading = true;
        console.log('Loading posts from database...');
        const dbPosts = await dbService.getAllPosts();
        console.log('Posts from database:', dbPosts.length);
        console.log('Post IDs:', dbPosts.map(p => p.id));

        // Remove duplicates by ID using Map
        const uniquePostsMap = new Map();
        dbPosts.forEach(post => {
          if (!uniquePostsMap.has(post.id)) {
            uniquePostsMap.set(post.id, post);
          }
        });

        const uniquePosts = Array.from(uniquePostsMap.values());
        console.log('Unique posts after deduplication:', uniquePosts.length);

        const formattedPosts = uniquePosts.map(post =>
          convertDbPostToCardData(post, dbService.formatTimestamp)
        );

        setPosts(formattedPosts);
        console.log('Posts set in state:', formattedPosts.length);
      } catch (error) {
        console.error('Error loading posts:', error);
        setPosts([]);
      } finally {
        isLoading = false;
      }
    };
  })();

  useEffect(() => {
    const initializeData = async () => {
      console.log('Starting initialization...');
      try {
        // Check for post creation success
        if (sessionStorage.getItem('postCreated')) {
          alert('Post created successfully!');
          sessionStorage.removeItem('postCreated');
        }

        console.log('Checking authentication...');
        // Check authentication status
        const loggedIn = sessionManager.isLoggedIn();
        setIsAuthenticated(loggedIn);
        const currentUser = sessionManager.getCurrentUser();
        setUser(currentUser);

        // Only redirect to profile setup if it's a new signup and profile is incomplete
        const isNewSignup = sessionStorage.getItem('newSignup') === 'true';
        if (loggedIn && currentUser && !currentUser.profileSetupComplete && isNewSignup) {
          navigate('/profile-setup');
          return;
        }

        // Clear the new signup flag if user is authenticated
        if (loggedIn) {
          sessionStorage.removeItem('newSignup');
        }

        console.log('Initializing database...');

        try {
          // Try to initialize SQLite database first
          await dbService.initialize();
          console.log('SQLite database initialized successfully');
        } catch (error) {
          console.error('SQLite initialization failed:', error);
          console.log('App will continue with limited functionality');
          // Don't throw - let the app continue
        }

        console.log('Loading posts...');
        // Load posts
        await loadPosts();
        console.log('Initialization complete');
      } catch (error) {
        console.error('Error initializing data:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Initialization timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    initializeData().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Refresh posts when component becomes visible (with debounce)
  useEffect(() => {
    let lastFocusTime = 0;
    const FOCUS_DEBOUNCE = 2000; // 2 seconds

    const handleFocus = () => {
      const now = Date.now();
      if (isAuthenticated && (now - lastFocusTime) > FOCUS_DEBOUNCE) {
        console.log('Window focused - refreshing posts');
        lastFocusTime = now;
        loadPosts();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  const handleInteractionClick = () => {
    // Only show login overlay for non-authenticated users
    if (!isAuthenticated) {
      setShowLoginOverlay(true);
    }
    // If user is authenticated, do nothing (let the actual interaction happen)
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
    if (section === 'Search') {
      navigate('/search');
    } else if (section === 'Notifications') {
      navigate('/notifications');
    } else if (section === 'Messages') {
      navigate('/messages');
    } else {
      console.log(`${section} navigation clicked`);
      alert(`${section} feature coming soon!`);
    }
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

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      setShowLoginOverlay(true);
    } else {
      navigate('/create');
    }
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
          onExploreClick={() => handleNavClick('Search')}
          onMessagesClick={() => handleNavClick('Messages')}
          onNotificationsClick={() => handleNavClick('Notifications')}
          onCreateClick={handleCreateClick}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          onLogout={handleLogout}
        />
        <main className="container max-w-2xl mx-auto py-8 px-4">
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div>Loading CGU Connect...</div>
              <div className="text-sm text-muted-foreground mt-2">
                Initializing database and loading posts
              </div>
            </div>
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
        onExploreClick={() => handleNavClick('Search')}
        onMessagesClick={() => handleNavClick('Messages')}
        onNotificationsClick={() => handleNavClick('Notifications')}
        onCreateClick={handleCreateClick}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        onLogout={handleLogout}
      />

      <main className="container max-w-2xl mx-auto py-8 px-4 pb-20 md:pb-8">
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onInteractionClick={handleInteractionClick}
                isAuthenticated={isAuthenticated}
                currentUser={user}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share something with the CGU Connect community!
              </p>
              {isAuthenticated && (
                <button
                  onClick={handleCreateClick}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create your first post
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onExploreClick={() => handleNavClick('Search')}
        onNotificationsClick={() => handleNavClick('Notifications')}
        onCreateClick={handleCreateClick}
        isAuthenticated={isAuthenticated}
        currentUser={user}
      />

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
