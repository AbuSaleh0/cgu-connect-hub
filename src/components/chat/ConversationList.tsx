import React from 'react';
import { ConversationWithUsers } from '@/database/types';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ConversationListProps {
    conversations: ConversationWithUsers[];
    currentUserId: number;
    onSelect: (conversation: ConversationWithUsers) => void;
    selectedId?: number | null;
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, currentUserId, onSelect, selectedId }) => {

    const getOtherParticipant = (conversation: ConversationWithUsers) => {
        return conversation.participant1_id === currentUserId
            ? {
                username: conversation.participant2_username,
                avatar: conversation.participant2_avatar
            }
            : {
                username: conversation.participant1_username,
                avatar: conversation.participant1_avatar
            };
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) {
            return format(date, 'h:mm a');
        } else if (isYesterday(date)) {
            return 'Yesterday';
        } else {
            return format(date, 'MMM d');
        }
    };

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-sm">Start a conversation with your friends and classmates</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const isSelected = selectedId === conversation.id;

                return (
                    <div
                        key={conversation.id}
                        onClick={() => onSelect(conversation)}
                        className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50",
                            isSelected && "bg-blue-50 hover:bg-blue-100"
                        )}
                    >
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.username} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                {otherParticipant.username[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className={cn("font-semibold truncate", isSelected ? "text-blue-900" : "text-gray-900")}>
                                    {otherParticipant.username}
                                </h3>
                                <span className={cn("text-xs whitespace-nowrap", conversation.unread_count > 0 ? "text-blue-600 font-medium" : "text-gray-400")}>
                                    {formatTime(conversation.last_message_at)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className={cn("text-sm truncate pr-2", conversation.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500")}>
                                    {conversation.last_message_content || 'Start a conversation'}
                                </p>
                                {conversation.unread_count > 0 && (
                                    <div className="min-w-[20px] h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ConversationList;
