import React, { useState, useEffect, useRef } from 'react';
import { ConversationWithUsers, MessageWithSender } from '@/database/types';
import { dbService } from '@/database/service';
import { messageEventSystem, useRealtimeMessages } from '@/database/messaging';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

interface ChatWindowProps {
    conversation: ConversationWithUsers;
    currentUserId: number;
    onBack: () => void;
    onMessagesRead?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUserId, onBack, onMessagesRead }) => {
    const { toast } = useToast();
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { shouldRefresh, resetRefresh } = useRealtimeMessages(conversation.id);

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
            const conversationMessages = await dbService.getConversationMessages(conversation.id);
            setMessages(conversationMessages);

            // Get the last seen message ID for messages sent by current user
            const lastSeen = dbService.getLastSeenMessageId(conversation.id, currentUserId);
            setLastSeenMessageId(lastSeen);

            // Mark messages as read
            const markedAsRead = await dbService.markConversationMessagesAsRead(conversation.id, currentUserId);

            if (markedAsRead) {
                messageEventSystem.emit({
                    type: 'message_read',
                    data: {
                        conversationId: conversation.id,
                        timestamp: new Date().toISOString()
                    }
                });

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        loadMessages();
    }, [conversation.id]);

    useEffect(() => {
        if (!loading) {
            scrollToBottom();
        }
    }, [messages.length, loading]);

    useEffect(() => {
        if (shouldRefresh) {
            loadMessages();
            resetRefresh();
        }
    }, [shouldRefresh, resetRefresh]);

    // Polling for seen status updates
    useEffect(() => {
        const interval = setInterval(() => {
            const lastSeen = dbService.getLastSeenMessageId(conversation.id, currentUserId);
            setLastSeenMessageId(lastSeen);
        }, 3000);
        return () => clearInterval(interval);
    }, [conversation.id, currentUserId]);


    const handleSendMessage = async (content: string) => {
        const newMessage = await dbService.createMessage({
            conversation_id: conversation.id,
            sender_id: currentUserId,
            content: content,
            message_type: 'text'
        });

        if (newMessage) {
            // Optimistically add message or reload
            setMessages(prev => [...prev, newMessage]);

            messageEventSystem.emit({
                type: 'new_message',
                data: {
                    conversationId: conversation.id,
                    messageId: newMessage.id,
                    senderId: currentUserId,
                    content: newMessage.content,
                    timestamp: newMessage.created_at
                }
            });
        }
    };

    const handleUnsend = async (messageId: number) => {
        const result = await dbService.unsendMessage(messageId, currentUserId);
        if (result.success) {
            toast({
                title: "Message unsent",
                description: "The message has been removed for everyone."
            });
            loadMessages(); // Refresh to show "This message was unsent"
            messageEventSystem.emit({
                type: 'new_message', // Trigger refresh for other user too
                data: {
                    conversationId: conversation.id,
                    messageId: messageId,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "Could not unsend message",
                variant: "destructive"
            });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-gray-500 animate-pulse">Loading conversation...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white p-3 flex items-center gap-3 shadow-sm z-10">
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Button>

                <Avatar className="h-9 w-9 border border-gray-100">
                    <AvatarImage src={otherParticipant.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium text-sm">
                        {otherParticipant.username[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{otherParticipant.username}</h3>
                    {/* Could add online status here later */}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-4xl mb-2 grayscale opacity-50">👋</div>
                        <p className="text-sm">Say hello to {otherParticipant.username}!</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isOwn = message.sender_id === currentUserId;

                        // Show "Seen" only on the very last message sent by current user, if read
                        const isLastOwnMessage = isOwn && (
                            index === messages.length - 1 ||
                            messages[index + 1]?.sender_id !== currentUserId
                        );

                        // Simplified seen logic for now based on polling/event or is_read from DB
                        // Since we load messages fresh, message.is_read is accurate from DB
                        const showSeen = isOwn && isLastOwnMessage && message.is_read; // Or use lastSeenMessageId logic if preferred

                        return (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={isOwn}
                                showSeen={showSeen}
                                onUnsend={handleUnsend}
                            />
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatWindow;
