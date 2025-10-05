import { Button } from "@/components/ui/button";
import { Heart, Home, Search, PlusSquare, MessageCircle } from "lucide-react";

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

const Header = ({ onLoginClick, onSignUpClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary" />
          <h1 className="text-xl font-bold text-gradient">CGU Connect</h1>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Search className="h-5 w-5" />
            <span>Explore</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="h-5 w-5" />
            <span>Messages</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Heart className="h-5 w-5" />
            <span>Notifications</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <PlusSquare className="h-5 w-5" />
            <span>Create</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onLoginClick}>
            Log in
          </Button>
          <Button variant="gradient" onClick={onSignUpClick}>
            Sign up
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
