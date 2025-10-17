import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, UserPlus } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import { Notification, User } from "@/database/types";
import MobileBottomNav from "@/components/MobileBottomNav";

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fromUsers, setFromUsers] = useState<{ [key: number]: User }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    loadNotifications();
  }, [currentUser, navigate]);

  const loadNotifications = async () => {
    if (currentUser) {
      try {
        const userNotifications = await dbService.getUserNotifications(currentUser.id);
        setNotifications(userNotifications);
        
        // Load from users for each notification
        const users: { [key: number]: User } = {};
        for (const notification of userNotifications) {
          try {
            const fromUser = await dbService.getUserById(notification.from_user_id);
            if (fromUser) {
              users[notification.from_user_id] = fromUser;
            }
          } catch (error) {
            console.error(`Error loading user ${notification.from_user_id}:`, error);
          }
        }
        setFromUsers(users);
        
        // Mark notifications as read
        await dbService.markNotificationsAsRead(currentUser.id);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      }
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (notification.type === 'follow') {
        const fromUser = fromUsers[notification.from_user_id];
        if (fromUser) {
          navigate(`/${fromUser.username}`);
        }
      } else if (notification.post_id) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 pb-20 md:pb-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const fromUser = fromUsers[notification.from_user_id];
              return (
                <div
                  key={notification.id}
                  className="flex items-center gap-3 p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={fromUser?.avatar} />
                      <AvatarFallback>
                        {fromUser?.displayName?.[0]?.toUpperCase() || fromUser?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onExploreClick={() => navigate('/search')}
        onNotificationsClick={() => navigate('/notifications')}
        onCreateClick={() => navigate('/create')}
        isAuthenticated={!!currentUser}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Notifications;