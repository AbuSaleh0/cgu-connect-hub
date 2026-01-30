import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, MessageSquare } from "lucide-react";
import { UserPublic } from "@/database/types";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserPublic | null;
}

const FeedbackModal = ({ isOpen, onClose, currentUser }: FeedbackModalProps) => {
  const [formData, setFormData] = useState({
    name: currentUser?.display_name || currentUser?.username || "",
    email: currentUser?.email || "",
    category: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  const resetForm = () => {
    setFormData({
      name: currentUser?.display_name || currentUser?.username || "",
      email: currentUser?.email || "",
      category: "",
      subject: "",
      message: ""
    });
    setError("");
    setIsSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Name is required";
    }
    if (!formData.email.trim()) {
      return "Email is required";
    }
    if (!formData.email.includes('@')) {
      return "Please enter a valid email address";
    }
    if (!formData.category) {
      return "Please select a feedback category";
    }
    if (!formData.subject.trim()) {
      return "Subject is required";
    }
    if (!formData.message.trim()) {
      return "Message is required";
    }
    if (formData.message.trim().length < 10) {
      return "Message must be at least 10 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Create form data for Netlify
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('form-name', 'cgu-connect-feedback');
      formDataToSubmit.append('name', formData.name);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('category', formData.category);
      formDataToSubmit.append('subject', formData.subject);
      formDataToSubmit.append('message', formData.message);
      formDataToSubmit.append('user-id', currentUser?.id?.toString() || 'anonymous');
      formDataToSubmit.append('username', currentUser?.username || 'anonymous');
      formDataToSubmit.append('timestamp', new Date().toISOString());

      const params = new URLSearchParams();
      formDataToSubmit.forEach((value, key) => {
        if (typeof value === 'string') {
          params.append(key, value);
        }
      });

      // Submit to Netlify
      const response = await fetch('/', {
        method: 'POST',
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      if (response.ok) {
        setIsSubmitted(true);
        resetForm();
        // Auto-close after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false);
          handleClose();
        }, 3000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = !validateForm();

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-semibold">Thank You!</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground max-w-sm">
                Your feedback has been submitted successfully. We appreciate you taking the time to help us improve CGU Connect!
              </DialogDescription>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-4 sm:mx-auto">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-5 w-5" />
            Send Feedback
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Help us improve CGU Connect by sharing your thoughts, suggestions, or reporting issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your name"
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@example.com"
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug Report</SelectItem>
                  <SelectItem value="feature">💡 Feature Request</SelectItem>
                  <SelectItem value="improvement">✨ Improvement Suggestion</SelectItem>
                  <SelectItem value="ui-ux">🎨 UI/UX Feedback</SelectItem>
                  <SelectItem value="performance">⚡ Performance Issue</SelectItem>
                  <SelectItem value="general">💬 General Feedback</SelectItem>
                  <SelectItem value="other">📝 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject *
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Brief summary of your feedback"
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Message *
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Please provide detailed information about your feedback. For bugs, include steps to reproduce the issue."
                className="min-h-[120px] resize-none w-full"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border">
              <p className="font-medium text-foreground mb-2">* Required fields</p>
              <p className="leading-relaxed">
                Your feedback helps us make CGU Connect better for everyone. Thank you for taking the time to share your thoughts!
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-6">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Feedback"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;