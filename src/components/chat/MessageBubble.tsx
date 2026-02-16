import React from 'react';
import { MessageWithSender } from '@/database/types';
import { format } from 'date-fns';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
    message: MessageWithSender;
    isOwn: boolean;
    showSeen?: boolean;
    onUnsend?: (messageId: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showSeen, onUnsend }) => {

    const canUnsend = () => {
        if (!isOwn || message.is_unsent) return false;
        const created = new Date(message.created_at);
        const now = new Date();
        const diffMins = (now.getTime() - created.getTime()) / 60000;
        return diffMins < 30;
    };

    const renderContent = () => {
        if (message.is_unsent) {
            return <i className="text-gray-500 text-sm">This message was unsent</i>;
        }

        switch (message.message_type) {
            case 'image':
                return (
                    <div className="max-w-[250px]">
                        {message.media_url && (
                            <img
                                src={message.media_url}
                                alt="Shared image"
                                className="rounded-lg w-full h-auto object-cover"
                            />
                        )}
                        {message.content && message.content !== 'Sent an image' && (
                            <p className="mt-2 text-sm">{message.content}</p>
                        )}
                    </div>
                );
            case 'video':
                return (
                    <div className="max-w-[250px]">
                        {message.media_url && (
                            <video
                                src={message.media_url}
                                controls
                                className="rounded-lg w-full h-auto"
                            />
                        )}
                        {message.content && message.content !== 'Sent a video' && (
                            <p className="mt-2 text-sm">{message.content}</p>
                        )}
                    </div>
                );
            case 'post':
                if (!message.shared_post) return <p className="text-sm text-red-500">Post unavailable</p>;
                return (
                    <Link to={`/?post=${message.shared_post.id}`} className="block max-w-[250px] bg-white rounded-lg overflow-hidden border border-gray-200">
                        {message.shared_post.image && (
                            <img
                                src={message.shared_post.image}
                                alt="Post"
                                className="w-full h-32 object-cover"
                            />
                        )}
                        <div className="p-2 bg-gray-50">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs font-bold text-gray-900">{message.shared_post.user?.username}</span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{message.shared_post.caption}</p>
                        </div>
                    </Link>
                );
            case 'confession':
                if (!message.shared_confession) return <p className="text-sm text-red-500">Confession unavailable</p>;
                return (
                    <Link to={`/confessions?id=${message.shared_confession.id}`} className="block max-w-[250px] bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs font-bold text-indigo-800">Confession #{message.shared_confession.id}</span>
                        </div>
                        <p className="text-xs text-gray-800 italic line-clamp-3">"{message.shared_confession.content}"</p>
                    </Link>
                );
            case 'text':
            default:
                return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
        }
    };

    return (
        <div className={`flex mb-4 group ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`relative flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Message Bubble */}
                    <div
                        className={`px-4 py-2 rounded-2xl ${message.is_unsent
                            ? 'bg-gray-100 border border-gray-200'
                            : isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            } ${message.message_type === 'post' || message.message_type === 'confession' ? 'p-1' : ''}`}
                    >
                        {renderContent()}
                    </div>

                    {/* Context Menu for Own Messages */}
                    {isOwn && !message.is_unsent && canUnsend() && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 focus:opacity-100">
                                    <MoreHorizontal size={14} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? "end" : "start"}>
                                <DropdownMenuItem
                                    className="text-red-500 focus:text-red-500"
                                    onClick={() => onUnsend && onUnsend(message.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Unsend Message
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Footer: Time & Seen Status */}
                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[10px] text-gray-500">
                        {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                    {isOwn && showSeen && !message.is_unsent && (
                        <span className="text-[10px] text-blue-500 font-medium">Seen</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
