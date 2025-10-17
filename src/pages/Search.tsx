import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import { UserPublic } from "@/database/types";
import MobileBottomNav from "@/components/MobileBottomNav";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [recommendations, setRecommendations] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const allUsers = await dbService.getAllUsers();
      const userRecommendations = allUsers
        .map(user => {
          const { password, ...publicUser } = user;
          return publicUser;
        })
        .slice(0, 10);
      
      setRecommendations(userRecommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const allUsers = await dbService.getAllUsers();
      const results = allUsers
        .filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(user => {
          const { password, ...publicUser } = user;
          return publicUser;
        });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 pb-20 md:pb-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Search</h1>
        </div>

        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-4">
          {!searchQuery.trim() && (
            <>
              <h2 className="text-lg font-semibold mb-4">Recommended Users</h2>
              {loadingRecommendations ? (
                <div className="text-center text-muted-foreground">Loading recommendations...</div>
              ) : recommendations.length > 0 ? (
                recommendations.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/${user.username}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.displayName || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">No users available</div>
              )}
            </>
          )}
          
          {searchQuery.trim() && (
            <>
              {loading ? (
                <div className="text-center text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/${user.username}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.displayName || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">No users found</div>
              )}
            </>
          )}
          
          {!searchQuery.trim() && !loadingRecommendations && recommendations.length === 0 && (
            <div className="text-center text-muted-foreground">No users available</div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onExploreClick={() => navigate('/search')}
        onNotificationsClick={() => navigate('/notifications')}
        onCreateClick={() => navigate('/create')}
        isAuthenticated={!!sessionManager.getCurrentUser()}
        currentUser={sessionManager.getCurrentUser()}
      />
    </div>
  );
};

export default Search;