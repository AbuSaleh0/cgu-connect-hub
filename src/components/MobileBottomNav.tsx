import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Home, Search, PlusSquare, User } from "lucide-react";
import { UserPublic } from "@/database";
import { useNavigate, useLocation } from "react-router-dom";

interface MobileBottomNavProps {
  onHomeClick?: () => void;
  onExploreClick?: () => void;
  onNotificationsClick?: () => void;
  onCreateClick?: () => void;
  isAuthenticated?: boolean;
  currentUser?: UserPublic | null;
}

const MobileBottomNav = ({ 
  onHomeClick,
  onExploreClick,
  onNotificationsClick,
  onCreateClick,
  isAuthenticated = false,
  currentUser
}: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on auth pages
  if (location.pathname === '/login' || location.pathname === '/signup' || !isAuthenticated) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      navigate('/');
    }
  };

  const handleExploreClick = () => {
    if (onExploreClick) {
      onExploreClick();
    } else {
      navigate('/search');
    }
  };

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      navigate('/notifications');
    }
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      navigate('/create');
    }
  };

  const handleProfileClick = () => {
    if (currentUser) {
      navigate(`/${currentUser.username}`);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Home */}
        <button
          onClick={handleHomeClick}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/') 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <Home className="h-6 w-6" />
        </button>

        {/* Search */}
        <button
          onClick={handleExploreClick}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/search') 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <Search className="h-6 w-6" />
        </button>

        {/* Create */}
        <button
          onClick={handleCreateClick}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/create') 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <PlusSquare className="h-6 w-6" />
        </button>

        {/* Notifications */}
        <button
          onClick={handleNotificationsClick}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/notifications') 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <Heart className="h-6 w-6" />
        </button>

        {/* Profile */}
        {currentUser && (
          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
              isActive(`/${currentUser.username}`) 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="text-xs">
                {currentUser.displayName?.[0]?.toUpperCase() || currentUser.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;