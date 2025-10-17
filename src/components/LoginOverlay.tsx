import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LoginOverlayProps {
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
}

const LoginOverlay = ({ onClose, onLogin, onSignUp }: LoginOverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-card rounded-2xl shadow-card-hover max-w-md w-full p-8 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Login to interact</h2>
          <p className="text-muted-foreground">
            Join CGU Connect to like, comment, and share posts with fellow students
          </p>

          <div className="space-y-3 pt-4">
            <Button variant="gradient" className="w-full" size="lg" onClick={onLogin}>
              Log in
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={onSignUp}>
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;
