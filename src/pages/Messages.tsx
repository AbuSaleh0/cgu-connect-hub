import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Edit3, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import LoginOverlay from "@/components/LoginOverlay";
import { dbService, sessionManager, messageEventSystem, useRealtimeMessages } from "@/database";
import { ConversationWithUsers, MessageWithSender, User } from "@/database/types";

interface MessageInputProps {
  conversationId: number;
  onMessageSent: () => void;
}

const MessageInput = ({ conversationId, onMessageSent }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const currentUser = sessionManager.getCurrentUser();
    if (!currentUser) return;

    setSending(true);
    try {
      console.log('Sending message:', {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: message.trim()
      });
      
      const newMessage = await dbService.createMessage({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: message.trim(),
        message_type: 'text'
      });

      console.log('Message created:', newMessage);

      if (newMessage) {
        setMessage("");
        onMessageSent();
        
        // Emit real-time event
        console.log('Emitting message event');
        messageEventSystem.emit({
          type: 'new_message',
          data: {
            conversationId: conversationId,
            messageId: newMessage.id,
            senderId: currentUser.id,
            content: newMessage.content,
            timestamp: newMessage.created_at
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-white">
      <div className="flex gap-2">
        <Textarea
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="sm"
          className="self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  showSeen?: boolean;
}

const MessageBubble = ({ message, isOwn, showSeen }: MessageBubbleProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <p className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </p>
          {isOwn && showSeen && (
            <span className="text-xs text-blue-500 font-medium">Seen</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChatWindowProps {
  conversation: ConversationWithUsers;
  currentUserId: number;
  onBack: () => void;
  onMessagesRead?: () => void;
}

const ChatWindow = ({ conversation, currentUserId, onBack, onMessagesRead }: ChatWindowProps) => {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<number | null>(null);
  const { shouldRefresh, resetRefresh } = useRealtimeMessages(conversation.id);

  // Get the other participant's details
  const otherParticipant = conversation.participant1_id === currentUserId
    ? {
        username: conversation.participant2_username,
        avatar: conversation.participant2_avatar
      }
    : {
        username: conversation.participant1_username,
        avatar: conversation.participant1_avatar
      };

  const loadMessages = async () => {
    try {
      console.log('ChatWindow: Loading messages for conversation:', conversation.id);
      const conversationMessages = await dbService.getConversationMessages(conversation.id);
      console.log('ChatWindow: Loaded messages:', conversationMessages.length, conversationMessages);
      setMessages(conversationMessages);
      
      // Get the other participant ID
      const otherParticipantId = conversation.participant1_id === currentUserId 
        ? conversation.participant2_id 
        : conversation.participant1_id;
      
      // Get the last seen message ID for messages sent by current user
      const lastSeen = dbService.getLastSeenMessageId(conversation.id, currentUserId);
      setLastSeenMessageId(lastSeen);
      
      // Mark messages as read (messages sent by the other participant that we're now reading)
      console.log('Marking messages as read for conversation:', conversation.id, 'user:', currentUserId);
      const markedAsRead = await dbService.markMessagesAsRead(conversation.id, currentUserId);
      console.log('Messages marked as read result:', markedAsRead);
      
      if (markedAsRead) {
        console.log('Emitting message_read event for conversation:', conversation.id);
        messageEventSystem.emit({
          type: 'message_read',
          data: {
            conversationId: conversation.id,
            timestamp: new Date().toISOString()
          }
        });
        
        // Notify parent component that messages were read
        if (onMessagesRead) {
          onMessagesRead();
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  // Handle real-time message updates
  useEffect(() => {
    if (shouldRefresh) {
      loadMessages();
      resetRefresh();
    }
  }, [shouldRefresh, resetRefresh]);

  // Polling for real-time updates (fallback for cross-browser messaging)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh seen status, not all messages to avoid scrolling issues
      const lastSeen = dbService.getLastSeenMessageId(conversation.id, currentUserId);
      setLastSeenMessageId(lastSeen);
    }, 3000); // Poll every 3 seconds for seen status

    return () => clearInterval(interval);
  }, [conversation.id, currentUserId]);

  const handleMessageSent = () => {
    loadMessages();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b bg-white p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
          {otherParticipant.avatar ? (
            <img 
              src={otherParticipant.avatar} 
              alt={otherParticipant.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-semibold">
              {otherParticipant.username?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{otherParticipant.username}</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-lg mb-2">👋</div>
            <p className="text-center">
              Start a conversation with {otherParticipant.username}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              
              // Show "Seen" on the last message sent by current user if it has been read
              const isLastOwnMessage = isOwn && (
                index === messages.length - 1 || 
                messages[index + 1]?.sender_id !== currentUserId
              );
              const showSeen = isOwn && isLastOwnMessage && lastSeenMessageId && message.id <= lastSeenMessageId;
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showSeen={showSeen}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInput conversationId={conversation.id} onMessageSent={handleMessageSent} />
    </div>
  );
};

interface ConversationItemProps {
  conversation: ConversationWithUsers;
  currentUserId: number;
  onClick: () => void;
}

const ConversationItem = ({ conversation, currentUserId, onClick }: ConversationItemProps) => {
  const otherParticipant = conversation.participant1_id === currentUserId
    ? {
        username: conversation.participant2_username,
        avatar: conversation.participant2_avatar
      }
    : {
        username: conversation.participant1_username,
        avatar: conversation.participant1_avatar
      };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-0 border-b"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
          {otherParticipant.avatar ? (
            <img 
              src={otherParticipant.avatar} 
              alt={otherParticipant.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {otherParticipant.username?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 truncate">
              {otherParticipant.username}
            </h3>
            <span className="text-xs text-gray-500">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">
              {conversation.last_message_content || 'Start a conversation'}
            </p>
            {(() => {
              console.log(`ConversationItem: ${otherParticipant.username} unread_count: ${conversation.unread_count} (type: ${typeof conversation.unread_count})`);
              return conversation.unread_count > 0;
            })() && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-semibold">
                  {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

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
          // Get all users and filter by search term
          const allUsers = await dbService.getAllUsers();
          console.log('All users in database:', allUsers);
          console.log('Current user:', currentUser);
          
          const filteredUsers = allUsers.filter(user => 
            user.id !== currentUser?.id &&
            (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          console.log('Filtered users for search:', filteredUsers);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
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
        
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.trim() ? 'No users found' : 'Type to search users'}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => {
                  onUserSelect(user);
                  onClose();
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {user.username[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    {user.displayName && (
                      <p className="text-sm text-gray-600">{user.displayName}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
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
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  const currentUser = sessionManager.getCurrentUser();

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      console.log('Loading conversations for user:', currentUser.id, currentUser.username);
      const userConversations = searchTerm 
        ? await dbService.searchConversations(currentUser.id, searchTerm)
        : await dbService.getUserConversations(currentUser.id);
      
      console.log('User conversations loaded:', userConversations.length);
      userConversations.forEach(conv => {
        console.log(`Conversation ${conv.id}: unread_count = ${conv.unread_count}, other participant: ${conv.participant1_id === currentUser.id ? conv.participant2_username : conv.participant1_username}`);
      });
      
      // Debug: Check messages in each conversation
      for (const conv of userConversations) {
        const messages = await dbService.getConversationMessages(conv.id);
        const unreadMessages = messages.filter(m => m.sender_id !== currentUser.id && !m.is_read);
        console.log(`Conversation ${conv.id} has ${messages.length} total messages, ${unreadMessages.length} unread messages from others`);
        unreadMessages.forEach(msg => {
          console.log(`  - Unread message ${msg.id}: "${msg.content}" from sender ${msg.sender_id}, is_read: ${msg.is_read}`);
        });
      }
      
      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setShowLoginOverlay(true);
      return;
    }

    loadConversations();
    
    // Check if there's a conversation ID in the URL
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      const conversation = conversations.find(c => c.id === parseInt(conversationId));
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }

    // Listen for message read events to update unread counts
    const handleMessageReadEvent = (event: any) => {
      console.log('Received message_read event:', event);
      // Reload conversations to update unread counts
      loadConversations();
    };

    const unsubscribeEvents = messageEventSystem.on('message_read', handleMessageReadEvent);

    // Polling for real-time conversation updates
    const interval = setInterval(() => {
      loadConversations();
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
      unsubscribeEvents();
    };
  }, [currentUser, navigate, searchParams, searchTerm]);

  const handleConversationSelect = (conversation: ConversationWithUsers) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id.toString() });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
    // Reload conversations to update unread counts after reading messages
    loadConversations();
  };

  const handleNewUserSelect = async (user: User) => {
    if (!currentUser) return;

    try {
      // Try to find existing conversation or create new one
      let conversation = await dbService.getConversationBetweenUsers(currentUser.id, user.id);
      
      if (!conversation) {
        conversation = await dbService.createConversation({
          participant1_id: currentUser.id,
          participant2_id: user.id
        });
      }

      if (conversation) {
        // Reload conversations to get the updated list
        await loadConversations();
        
        // Select the conversation
        const conversationWithUsers = (await dbService.getUserConversations(currentUser.id))
          .find(c => c.id === conversation!.id);
        
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

  if (!currentUser) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>
        
        {/* Login Required Message */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-gray-600 mb-4">
              Please log in to view and send messages
            </p>
          </div>
        </div>
        
        {showLoginOverlay && (
          <LoginOverlay
            onClose={() => setShowLoginOverlay(false)}
            onLogin={handleLoginClick}
            onSignUp={handleSignUpClick}
          />
        )}
      </div>
    );
  }

  // Mobile: Show chat window when conversation is selected
  if (selectedConversation) {
    return (
      <div className="h-screen flex flex-col">
        <ChatWindow
          conversation={selectedConversation}
          currentUserId={currentUser.id}
          onBack={handleBack}
          onMessagesRead={loadConversations}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('🔄 Manual refresh clicked');
                loadConversations();
              }}
              title="Refresh conversations"
            >
              🔄
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewChatModal(true)}
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
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading conversations...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-center mb-4">
              Start a conversation with your friends and classmates
            </p>
            <Button onClick={() => setShowNewChatModal(true)}>
              Send a Message
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                currentUserId={currentUser.id}
                onClick={() => handleConversationSelect(conversation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onUserSelect={handleNewUserSelect}
      />
      
      {showLoginOverlay && (
        <LoginOverlay
          onClose={() => setShowLoginOverlay(false)}
          onLogin={handleLoginClick}
          onSignUp={handleSignUpClick}
        />
      )}
    </div>
  );
};

export default Messages;