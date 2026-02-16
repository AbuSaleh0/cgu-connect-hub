import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sessionManager } from "@/lib/session";
import { dbService } from "@/database/service";
import { messageEventSystem } from "@/database/messaging";
import { User, ConversationWithUsers } from "@/database/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit3, Search, RefreshCw } from "lucide-react";
import LoginOverlay from "@/components/LoginOverlay";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";

// Sub-component for New Chat Modal
// We can keep this here or extract it if it grows
interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
}

const NewChatModal = ({ isOpen, onClose, onUserSelect }: NewChatModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = sessionManager.getCurrentUser();

  useEffect(() => {
    const searchUsers = async () => {
      if (isOpen && searchTerm.trim()) {
        setLoading(true);
        try {
          const allUsers = await dbService.getAllUsers();
          const filteredUsers = allUsers.filter(user =>
            user.id !== currentUser?.id &&
            (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          setUsers(filteredUsers);
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setUsers([]);
      }
    };

    searchUsers();
  }, [searchTerm, isOpen, currentUser?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">New Message</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-0">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.trim() ? 'No users found' : 'Type to search users'}
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                  onClick={() => {
                    onUserSelect(user);
                    onClose();
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      user.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.display_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  const currentUser = sessionManager.getCurrentUser();

  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      const userConversations = searchTerm
        ? await dbService.searchConversations(currentUser.id, searchTerm)
        : await dbService.getUserConversations(currentUser.id);

      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setShowLoginOverlay(true);
      return;
    }

    const init = async () => {
      setLoading(true);
      await loadConversations();
      setLoading(false);
    };
    init();

    // Check URL for conversation
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      const conversation = conversations.find(c => c.id === parseInt(conversationId));
      if (conversation) {
        setSelectedConversation(conversation);
      } else if (conversations.length > 0) {
        dbService.getConversationMessages(parseInt(conversationId)).then(() => {
        }).catch(() => { });
      }
    }

    // Realtime updates
    const handleMessageReadEvent = () => loadConversations();
    const handleNewMessageEvent = () => loadConversations();

    const unsubscribeRead = messageEventSystem.on('message_read', handleMessageReadEvent);
    const unsubscribeNew = messageEventSystem.on('new_message', handleNewMessageEvent);

    const interval = setInterval(() => loadConversations(), 3000);

    return () => {
      clearInterval(interval);
      unsubscribeRead();
      unsubscribeNew();
    };
  }, [currentUser?.id, searchParams, searchTerm]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const handleConversationSelect = (conversation: ConversationWithUsers) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id.toString() });
  };

  const handleBack = async () => {
    setSelectedConversation(null);
    setSearchParams({});
    await loadConversations();
  };

  const handleNewUserSelect = async (user: User) => {
    if (!currentUser) return;

    try {
      let conversation = await dbService.getConversationBetweenUsers(currentUser.id, user.id);

      if (!conversation) {
        conversation = await dbService.createConversation({
          participant1_id: currentUser.id,
          participant2_id: user.id
        });
      }

      if (conversation) {
        await loadConversations();
        // We need to re-find it in the updated list to get the "WithUsers" type
        const allConvs = await dbService.getUserConversations(currentUser.id);
        const conversationWithUsers = allConvs.find(c => c.id === conversation!.id);

        if (conversationWithUsers) {
          handleConversationSelect(conversationWithUsers);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleLoginClick = () => {
    setShowLoginOverlay(false);
    navigate('/?auth=login');
  };

  const handleSignUpClick = () => {
    setShowLoginOverlay(false);
    navigate('/?auth=signup');
  };

  const handleLogout = () => {
    sessionManager.logout();
    navigate('/');
  };

  const handleNavClick = (section: string) => {
    if (section === 'Search') {
      navigate('/search');
    } else if (section === 'Notifications') {
      navigate('/notifications');
    } else if (section === 'Messages') {
      navigate('/messages');
    } else {
      console.log(`${section} navigation clicked`);
      // navigate(section.toLowerCase());
    }
  };

  const handleCreateClick = () => {
    navigate('/create');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onExploreClick={() => handleNavClick('Search')}
          onMessagesClick={() => handleNavClick('Messages')}
          onNotificationsClick={() => handleNavClick('Notifications')}
          onCreateClick={handleCreateClick}
          isAuthenticated={false}
          currentUser={null}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex items-center justify-center p-4 h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-gray-600 mb-4">Please log in to view and send messages</p>
          </div>
          {showLoginOverlay && (
            <LoginOverlay
              onClose={() => setShowLoginOverlay(false)}
              onLogin={handleLoginClick}
              onSignUp={handleSignUpClick}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
      <div className="hidden md:block">
        <Header
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onExploreClick={() => handleNavClick('Search')}
          onMessagesClick={() => handleNavClick('Messages')}
          onNotificationsClick={() => handleNavClick('Notifications')}
          onCreateClick={handleCreateClick}
          isAuthenticated={true}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      <main className="flex-1 w-full md:container md:max-w-6xl md:mx-auto md:py-4 pb-[60px] md:pb-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full shadow-xl bg-white rounded-none md:rounded-2xl overflow-hidden">
          {/* Conversations Sidebar (List) */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col h-full bg-white ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">Messages</h1>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    title="Refresh"
                    className="hover:bg-gray-100 rounded-full"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewChatModal(true)}
                    className="h-8 w-8"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-gray-50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">No messages</h3>
                  <Button onClick={() => setShowNewChatModal(true)}>
                    Start a Chat
                  </Button>
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  currentUserId={currentUser.id}
                  onSelect={handleConversationSelect}
                  selectedId={selectedConversation?.id}
                />
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col h-full bg-gray-50 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                currentUserId={currentUser.id}
                onBack={handleBack}
                onMessagesRead={loadConversations}
              />
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">💬</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Your Messages</h2>
                <p className="text-gray-500">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav
        onExploreClick={() => handleNavClick('Search')}
        onNotificationsClick={() => handleNavClick('Notifications')}
        onCreateClick={handleCreateClick}
        isAuthenticated={true}
        currentUser={currentUser}
      />

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onUserSelect={handleNewUserSelect}
      />
    </div>
  );
};

export default Messages;