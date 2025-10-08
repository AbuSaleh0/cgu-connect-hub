import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Settings } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import { UserPublic, PostWithUser } from "@/database/types";
import PostCard from "@/components/PostCard";
import EditProfileModal from "@/components/EditProfileModal";

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  
  const [user, setUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (username) {
      const foundUser = dbService.getUserByUsername(username);
      if (foundUser) {
        const { password, ...publicUser } = foundUser;
        setUser(publicUser);
        const userPosts = dbService.getPostsByUser(foundUser.id);
        setPosts(userPosts);
      }
      setLoading(false);
    }
  }, [username]);

  const handleProfileUpdate = () => {
    if (username) {
      const updatedUser = dbService.getUserByUsername(username);
      if (updatedUser) {
        const { password, ...publicUser } = updatedUser;
        setUser(publicUser);
        if (isOwnProfile) {
          sessionManager.login(updatedUser);
        }
      }
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">{user.username}</h1>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
                {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">{user.displayName}</h2>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="flex gap-6 text-sm">
                <span><strong>{posts.length}</strong> posts</span>
                <span><strong>0</strong> followers</span>
                <span><strong>0</strong> following</span>
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

          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">Posts</h3>
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="aspect-square">
                    <img
                      src={post.image}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
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

      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;