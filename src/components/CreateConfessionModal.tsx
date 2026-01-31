import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dbService } from "@/database";
import { CreateConfessionData } from "@/database/types";
import { UserPublic } from "@/database/types";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface CreateConfessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserPublic | null;
    onConfessionCreated: () => void;
}

const CreateConfessionModal = ({ isOpen, onClose, currentUser, onConfessionCreated }: CreateConfessionModalProps) => {
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        if (!currentUser) return;

        setIsSubmitting(true);
        try {
            const confessionData: CreateConfessionData = {
                user_id: currentUser.id,
                content: content.trim(),
            };

            const newConfession = await dbService.createConfession(confessionData);

            if (newConfession) {
                toast({
                    title: "Confession posted",
                    description: "Your confession has been posted anonymously.",
                });
                setContent("");
                onConfessionCreated();
                onClose();
            } else {
                throw new Error("Failed to create confession");
            }
        } catch (error) {
            console.error("Error creating confession:", error);
            toast({
                title: "Error",
                description: "Failed to post confession. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Make a Confession</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-200">
                        This will be posted immediately. Your identity will be hidden from other users, and you can delete this later from your profile.
                    </div>
                    <Textarea
                        placeholder="Write your confession here... (Keep it respectful)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[150px] resize-none focus-visible:ring-indigo-500"
                    />
                </div>
                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            "Post Confession"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateConfessionModal;
