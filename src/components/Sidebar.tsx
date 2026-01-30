import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, Lock, Bookmark, LogOut } from "lucide-react";
import { UserPublic } from "@/database/types";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  currentUser?: UserPublic | null;
  onLogout: () => void;
}

const Sidebar = ({ currentUser, onLogout }: SidebarProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  if (!currentUser) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {/* User Profile Section */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>
                {currentUser.display_name?.[0]?.toUpperCase() || currentUser.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{currentUser.display_name}</p>
              <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            </div>
          </div>

          {/* Menu Options */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation(`/${currentUser.username}`)}
            >
              <User className="h-5 w-5" />
              View Profile
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation('/change-username')}
            >
              <User className="h-5 w-5" />
              Change Username
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation('/change-password')}
            >
              <Lock className="h-5 w-5" />
              Change Password
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation('/saved')}
            >
              <Bookmark className="h-5 w-5" />
              Saved Posts
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;