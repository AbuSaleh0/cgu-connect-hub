import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPublic } from "@/database/types";
import { useNavigate } from "react-router-dom";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserPublic[];
  title: string;
}

const FollowListModal = ({ isOpen, onClose, users, title }: FollowListModalProps) => {
  const navigate = useNavigate();

  const handleUserClick = (username: string) => {
    onClose();
    navigate(`/${username}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleUserClick(user.username)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{user.display_name || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-muted-foreground mt-1">{user.bio}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListModal;