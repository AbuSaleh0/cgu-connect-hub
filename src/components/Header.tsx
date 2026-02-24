import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Home, Search, PlusSquare, MessageCircle, LogOut, User, Mail, MessageSquareQuote, LifeBuoy } from "lucide-react";
import { UserPublic } from "@/database";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/database/messaging";

import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onHomeClick?: () => void;
  onExploreClick?: () => void;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  onCreateClick?: () => void;
  isAuthenticated?: boolean;
  currentUser?: UserPublic | null;
  onLogout?: () => void;
}

const Header = ({
  onLoginClick,
  onSignUpClick,
  onHomeClick,
  onExploreClick,
  onMessagesClick,
  onNotificationsClick,
  onCreateClick,
  isAuthenticated = false,
  currentUser,
  onLogout
}: HeaderProps) => {
  const navigate = useNavigate();
  const unreadCount = useUnreadCount(currentUser?.id || null);
  const unreadNotificationsCount = useUnreadNotifications(currentUser?.id || null);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gradient">CGU Connect</h1>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button
            onClick={onExploreClick || (() => { })}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </button>
          <button
            onClick={() => navigate('/confessions')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquareQuote className="h-5 w-5" />
            <span>Confessions</span>
          </button>
          <button
            onClick={onMessagesClick || (() => navigate('/messages'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors relative"
          >
            <div className="relative">
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <span>Messages</span>
          </button>
          <button
            onClick={onNotificationsClick || (() => console.log('Notifications clicked'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors relative"
          >
            <div className="relative">
              <Heart className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
              )}
            </div>
            <span>Notifications</span>
          </button>
          <button
            onClick={() => window.open('/support', '_blank')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <LifeBuoy className="h-5 w-5" />
            <span>Support</span>
          </button>
          <button
            onClick={onCreateClick || (() => navigate('/create'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <PlusSquare className="h-5 w-5" />
            <span>Create</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && currentUser ? (
            <>
              {/* Desktop Profile Link */}
              <button
                onClick={() => navigate(`/${currentUser.username}`)}
                className="hidden md:flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback>
                    {currentUser.display_name?.[0]?.toUpperCase() || currentUser.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {currentUser.display_name || currentUser.username}
                </span>
              </button>

              {/* Desktop Logout Button */}
              <Button variant="ghost" onClick={onLogout} className="hidden md:flex">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log out</span>
              </Button>

              {/* Mobile Messages Button Only */}
              <button
                onClick={onMessagesClick || (() => console.log('Messages clicked'))}
                className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Mail className="h-6 w-6 text-gray-600" />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onLoginClick}>
                Log in
              </Button>
              <Button variant="gradient" onClick={onSignUpClick}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
