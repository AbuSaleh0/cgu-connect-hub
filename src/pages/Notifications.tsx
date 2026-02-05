import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, UserPlus } from "lucide-react";
import { dbService } from "@/database";
import { sessionManager } from "@/lib/session";
import { Notification, User } from "@/database/types";
import MobileBottomNav from "@/components/MobileBottomNav";

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    loadNotifications();
  }, [currentUser?.id, navigate]);

  const loadNotifications = async () => {
    if (currentUser) {
      try {
        setLoading(true);
        const userNotifications = await dbService.getUserNotifications(currentUser.id);
        setNotifications(userNotifications);

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
        // For follow, navigate to the user's profile
        // @ts-ignore
        const username = notification.from_user?.username;
        if (username) {
          navigate(`/${username}`);
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
              // @ts-ignore
              const fromUser = notification.from_user;
              const displayText = notification.type === 'follow'
                ? `${fromUser?.username || 'Someone'} started following you`
                : notification.message;

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
                        {fromUser?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      {/* If it's a follow notification, explicitly show the username structure requested */}
                      {notification.type === 'follow' ? (
                        <span><span className="font-semibold">{fromUser?.username}</span> started following you</span>
                      ) : notification.type === 'like' ? (
                        <span><span className="font-semibold">{fromUser?.username}</span> liked your post</span>
                      ) : notification.type === 'comment' ? (
                        <span><span className="font-semibold">{fromUser?.username}</span> {notification.message}</span>
                      ) : (
                        notification.message
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dbService.formatTimestamp(notification.created_at)}
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