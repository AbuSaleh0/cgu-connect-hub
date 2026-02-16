import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send } from "lucide-react";
import { User, Post, Confession } from "@/database/types";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ShareToChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    post?: Post;
    confession?: Confession;
}

const ShareToChatModal: React.FC<ShareToChatModalProps> = ({ isOpen, onClose, post, confession }) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const currentUser = sessionManager.getCurrentUser();

    useEffect(() => {
        if (isOpen) {
            setSearchTerm("");
            setSelectedUser(null);
            setMessage("");
            // Initial load of users (recent contacts could be better, but all users for now)
            loadUsers();
        }
    }, [isOpen]);

    const loadUsers = async (search: string = "") => {
        setLoading(true);
        try {
            // Ideally we should have a getRecentContacts or similar
            // For now, we reuse getAllUsers but filtered
            const allUsers = await dbService.getAllUsers();
            const filtered = allUsers.filter(u =>
                u.id !== currentUser?.id &&
                (u.username.toLowerCase().includes(search.toLowerCase()) ||
                    u.display_name.toLowerCase().includes(search.toLowerCase()))
            );
            setUsers(filtered.slice(0, 10)); // Limit to 10 for performance
        } catch (error) {
            console.error("Error searching users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isOpen) loadUsers(searchTerm);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, isOpen]);

    const handleSend = async () => {
        if (!selectedUser || !currentUser) return;

        setSending(true);
        try {
            // 1. Get or create conversation
            let conversation = await dbService.getConversationBetweenUsers(currentUser.id, selectedUser.id);
            if (!conversation) {
                conversation = await dbService.createConversation({
                    participant1_id: currentUser.id,
                    participant2_id: selectedUser.id
                });
            }

            if (!conversation) throw new Error("Could not create conversation");

            // 2. Send message
            await dbService.createMessage({
                conversation_id: conversation.id,
                sender_id: currentUser.id,
                content: message, // Optional text
                message_type: post ? 'post' : 'confession',
                shared_post_id: post?.id,
                shared_confession_id: confession?.id
            });

            toast({
                title: "Sent!",
                description: "Content shared successfully.",
            });
            onClose();
        } catch (error) {
            console.error("Error sharing content:", error);
            toast({
                title: "Error",
                description: "Failed to share content.",
                variant: "destructive"
            });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share to Chat</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search User */}
                    {!selectedUser ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search people..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="h-[200px] overflow-y-auto border rounded-md">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-500">Loading...</div>
                                ) : users.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">No users found</div>
                                ) : (
                                    <div className="divide-y">
                                        {users.map(user => (
                                            <div
                                                key={user.id}
                                                className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                                                onClick={() => setSelectedUser(user)}
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-sm truncate">{user.username}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.display_name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Selected User View
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={selectedUser.avatar} />
                                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">Sending to {selectedUser.username}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="text-xs">
                                    Change
                                </Button>
                            </div>

                            {/* Content Preview */}
                            <div className="border rounded-md p-3 bg-gray-50">
                                {post && (
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                                            {post.image && (
                                                <img src={post.image} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-gray-700">{post.user?.username}</p>
                                            <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                                        </div>
                                    </div>
                                )}
                                {confession && (
                                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                                        <p className="text-xs font-bold text-indigo-800 mb-1">Confession #{confession.id}</p>
                                        <p className="text-xs text-gray-800 italic line-clamp-3">"{confession.content}"</p>
                                    </div>
                                )}
                            </div>

                            <Input
                                placeholder="Add a message (optional)..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
                                <Button onClick={handleSend} disabled={sending}>
                                    {sending ? 'Sending...' : 'Send'}
                                    <Send className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareToChatModal;
