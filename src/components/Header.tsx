import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Home, Search, PlusSquare, MessageCircle, LogOut, User } from "lucide-react";
import { UserPublic } from "@/database";
import { useNavigate } from "react-router-dom";

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
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary" />
          <h1 className="text-xl font-bold text-gradient">CGU Connect</h1>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={onHomeClick || (() => console.log('Home clicked'))}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button 
            onClick={onExploreClick || (() => console.log('Explore clicked'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Search className="h-5 w-5" />
            <span>Explore</span>
          </button>
          <button 
            onClick={onMessagesClick || (() => console.log('Messages clicked'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Messages</span>
          </button>
          <button 
            onClick={onNotificationsClick || (() => console.log('Notifications clicked'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className="h-5 w-5" />
            <span>Notifications</span>
          </button>
          <button 
            onClick={onCreateClick || (() => console.log('Create clicked'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <PlusSquare className="h-5 w-5" />
            <span>Create</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && currentUser ? (
            <>
              <button 
                onClick={() => navigate(`/${currentUser.username}`)}
                className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback>
                    {currentUser.displayName?.[0]?.toUpperCase() || currentUser.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block font-medium">
                  {currentUser.displayName || currentUser.username}
                </span>
              </button>
              <Button variant="ghost" onClick={onLogout}>
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Log out</span>
              </Button>
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
