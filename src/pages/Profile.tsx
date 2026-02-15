import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Settings, UserPlus, MessageCircle, User, Lock, Bookmark, LogOut, Menu, X, MessageSquare, Heart, Pin, MessageSquareQuote, Layers, Download, LifeBuoy } from "lucide-react";
import { dbService } from "@/database";
import { sessionManager } from "@/lib/session";
import { UserPublic, PostWithUser } from "@/database/types";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import PostCard from "@/components/PostCard";
import EditProfileModal from "@/components/EditProfileModal";
import FollowListModal from "@/components/FollowListModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";
import FeedbackModal from "@/components/FeedbackModal";
import ContributeModal from "@/components/ContributeModal";
import MobileBottomNav from "@/components/MobileBottomNav";
import PostsView from "@/components/PostsView";

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<UserPublic[]>([]);
  const [followingList, setFollowingList] = useState<UserPublic[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithUser | null>(null);
  const [showPostsView, setShowPostsView] = useState(false);
  const { isInstallable, promptToInstall } = useInstallPrompt();


  useEffect(() => {
    console.log('showChangeUsernameModal state changed:', showChangeUsernameModal);
  }, [showChangeUsernameModal]);

  const isOwnProfile = currentUser?.username === username;
  console.log('Profile page debug:', {
    currentUsername: currentUser?.username,
    pageUsername: username,
    isOwnProfile
  });

  const loadUserData = async () => {
    if (username) {
      setLoading(true);
      try {
        const foundUser = await dbService.getUserByUsername(username);
        if (foundUser) {
          const { password, ...publicUser } = foundUser;
          setUser(publicUser);

          // Clear posts first to avoid showing stale data
          setPosts([]);

          const userPosts = await dbService.getPostsByUser(foundUser.id);

          // Double-check: filter posts to ensure only this user's posts
          const filteredPosts = userPosts.filter(post => post.user_id === foundUser.id);

          console.log('Profile posts debug:', {
            username: foundUser.username,
            userId: foundUser.id,
            totalPosts: userPosts.length,
            filteredPosts: filteredPosts.length,
            postOwners: userPosts.map(p => ({ id: p.id, owner: p.username, userId: p.user_id }))
          });

          setPosts(filteredPosts);

          // Check if current user is following this user
          if (currentUser && !isOwnProfile) {
            setIsFollowing(await dbService.isFollowing(currentUser.id, foundUser.id));
          }

          // Load follower and following counts
          setFollowerCount(await dbService.getFollowerCount(foundUser.id));
          setFollowingCount(await dbService.getFollowingCount(foundUser.id));

          // Load followers and following lists
          setFollowersList(await dbService.getFollowersList(foundUser.id));
          setFollowingList(await dbService.getFollowingList(foundUser.id));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !user || followLoading) return;

    setFollowLoading(true);
    try {
      const newFollowState = await dbService.toggleFollow({
        follower_id: currentUser.id,
        following_id: user.id
      });

      setIsFollowing(newFollowState);

      // Update follower count and list
      if (user) {
        setFollowerCount(await dbService.getFollowerCount(user.id));
        setFollowersList(await dbService.getFollowersList(user.id));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Follow feature temporarily unavailable');
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [username]);

  // Refresh posts when returning to profile
  useEffect(() => {
    const handleFocus = async () => {
      if (user) {
        try {
          const userPosts = await dbService.getPostsByUser(user.id);
          const filteredPosts = userPosts.filter(post => post.user_id === user.id);
          setPosts(filteredPosts);
        } catch (error) {
          console.error('Error refreshing posts:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showMenu]);

  const handleProfileUpdate = async () => {
    if (username) {
      try {
        const updatedUser = await dbService.getUserByUsername(username);
        if (updatedUser) {
          const { password, ...publicUser } = updatedUser;
          setUser(publicUser);
          if (isOwnProfile) {
            sessionManager.login(updatedUser);
          }
          // Refresh posts after profile update
          const userPosts = await dbService.getPostsByUser(updatedUser.id);
          const filteredPosts = userPosts.filter(post => post.user_id === updatedUser.id);
          setPosts(filteredPosts);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
  };

  const handleUsernameUpdate = async (newUsername: string) => {
    // Update the URL to reflect the new username
    navigate(`/${newUsername}`, { replace: true });

    // Update the user state
    if (currentUser) {
      const updatedUser = { ...currentUser, username: newUsername };
      sessionManager.login(updatedUser); // Update session with new username

      // Refresh user data
      try {
        const refreshedUser = await dbService.getUserByUsername(newUsername);
        if (refreshedUser) {
          const { password, ...publicUser } = refreshedUser;
          setUser(publicUser);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const handlePostClick = (post: PostWithUser) => {
    console.log('handlePostClick called with post:', post);
    setSelectedPost(post);
    setShowPostsView(true);
    console.log('Modal state updated - showPostsView set');
  };

  const handleClosePostView = async () => {
    setShowPostsView(false);
    setSelectedPost(null);

    // Refresh posts data to get updated like/comment counts
    if (user) {
      try {
        const userPosts = await dbService.getPostsByUser(user.id);
        const filteredPosts = userPosts.filter(post => post.user_id === user.id);
        setPosts(filteredPosts);
      } catch (error) {
        console.error('Error refreshing posts:', error);
      }
    }
  };

  const handleMessageUser = async () => {
    if (!user || !currentUser) return;

    try {
      // Try to find existing conversation or create new one
      let conversation = await dbService.getConversationBetweenUsers(currentUser.id, user.id);

      if (!conversation) {
        conversation = await dbService.createConversation({
          participant1_id: currentUser.id,
          participant2_id: user.id
        });
      }

      if (conversation) {
        // Navigate to messages page with the conversation
        navigate(`/messages?conversation=${conversation.id}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Unable to start conversation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Menu Overlay */}
      {isOwnProfile && showMenu && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowMenu(false)}>
          <div
            className="fixed top-20 right-4 md:right-6 bg-white rounded-lg shadow-xl border p-4 min-w-[200px] max-w-[280px] w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  setShowChangeUsernameModal(true);
                }}
              >
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Change Username</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/change-password');
                }}
              >
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Change Password</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/saved');
                }}
              >
                <Bookmark className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Saved Posts</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/my-confessions');
                }}
              >
                <MessageSquareQuote className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Your Confessions</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  setShowFeedbackModal(true);
                }}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Send Feedback</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3"
                onClick={() => {
                  setShowMenu(false);
                  window.open('/support', '_blank');
                }}
              >
                <LifeBuoy className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Support</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm py-2 px-3 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                onClick={() => {
                  setShowMenu(false);
                  setShowContributeModal(true);
                }}
              >
                <Heart className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Contribute</span>
              </Button>

              {isInstallable && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sm py-2 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setShowMenu(false);
                    promptToInstall();
                  }}
                >
                  <Download className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Install App</span>
                </Button>
              )}

              <div className="border-t pt-1 mt-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sm py-2 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setShowMenu(false);
                    if (currentUser) {
                      sessionManager.logout();
                      navigate('/');
                    }
                  }}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Log Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">{user.username}</h1>
          </div>

          {/* Menu Button - Only for own profile */}
          {isOwnProfile && (
            <Button
              onClick={() => {
                console.log('Menu button clicked, showMenu:', showMenu);
                setShowMenu(!showMenu);
              }}
              size="sm"
              variant={showMenu ? "default" : "outline"}
              className="flex-shrink-0"
            >
              {showMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="flex items-start gap-4 md:gap-6">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 flex-shrink-0">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-base md:text-lg">
                {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3 md:space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <h2 className="text-lg md:text-xl font-semibold truncate">{user.display_name}</h2>

                {/* Desktop buttons - hidden on mobile */}
                <div className="hidden md:flex">
                  {isOwnProfile ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMessageUser}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 md:gap-6 text-sm">
                <span><strong>{posts.length}</strong> posts</span>
                <button
                  onClick={() => setShowFollowersModal(true)}
                  className="hover:text-primary transition-colors truncate"
                >
                  <strong>{followerCount}</strong> followers
                </button>
                <button
                  onClick={() => setShowFollowingModal(true)}
                  className="hover:text-primary transition-colors truncate"
                >
                  <strong>{followingCount}</strong> following
                </button>
              </div>

              {user.bio && (
                <p className="text-sm text-muted-foreground">{user.bio}</p>
              )}

              {(user.semester || user.department) && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {user.semester && <span>📚 {user.semester}</span>}
                  {user.department && <span>🎓 {user.department}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons Section - hidden on desktop */}
          <div className="flex justify-center pt-4 pb-2 md:hidden">
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleMessageUser}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">Posts</h3>
            {posts.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square relative group cursor-pointer"
                    onClick={() => handlePostClick(post)}
                  >
                    <img
                      src={post.images && post.images.length > 0 ? post.images[0] : post.image}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover rounded-lg transition-all duration-300 group-hover:brightness-75"
                    />

                    {/* Multiple images indicator */}
                    {post.images && post.images.length > 1 && (
                      <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white">
                        <Layers className="h-4 w-4" />
                      </div>
                    )}

                    {/* Pin icon for pinned posts */}
                    {post.pinned && (
                      <div className="absolute top-2 left-2 p-1 bg-black/70 rounded-full text-white">
                        <Pin className="h-4 w-4" />
                      </div>
                    )}

                    {/* Hover overlay with post stats */}
                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex items-center gap-6 text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="h-6 w-6 text-white" />
                          <span className="font-semibold">{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-6 w-6 text-white" />
                          <span className="font-semibold">{post.comments_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {
        isOwnProfile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onUpdate={handleProfileUpdate}
          />
        )
      }

      {
        isOwnProfile && currentUser && (
          <ChangeUsernameModal
            isOpen={showChangeUsernameModal}
            onClose={() => setShowChangeUsernameModal(false)}
            currentUser={currentUser}
            onUsernameUpdated={handleUsernameUpdate}
          />
        )
      }

      {
        isOwnProfile && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            currentUser={currentUser}
          />
        )
      }

      {
        isOwnProfile && (
          <ContributeModal
            isOpen={showContributeModal}
            onClose={() => setShowContributeModal(false)}
          />
        )
      }

      {
        showPostsView && (
          <PostsView
            posts={posts}
            initialPostId={selectedPost?.id}
            onClose={handleClosePostView}
            currentUser={currentUser}
          />
        )
      }

      <FollowListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        users={followersList}
        title="Followers"
      />

      <FollowListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        users={followingList}
        title="Following"
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onExploreClick={() => navigate('/search')}
        onNotificationsClick={() => navigate('/notifications')}
        onCreateClick={() => navigate('/create')}
        isAuthenticated={!!currentUser}
        currentUser={currentUser}
      />
    </div >
  );
};

export default Profile;