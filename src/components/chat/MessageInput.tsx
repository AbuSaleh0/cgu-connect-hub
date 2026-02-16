import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
    onSendMessage: (content: string) => Promise<void>;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || sending || disabled) return;

        setSending(true);
        try {
            await onSendMessage(message.trim());
            setMessage("");
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
        <div className="border-t p-3 bg-white">
            <div className="flex gap-2 items-end">
                <Textarea
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none py-2 px-3 rounded-2xl border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={1}
                />
                <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || disabled}
                    size="icon"
                    className="rounded-full w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Send className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default MessageInput;
