import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { dbService, sessionManager } from "@/database";
import { GoogleUserData } from "@/database/types";

interface AuthPageProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
  onAuthSuccess: () => void;
}

const AuthPage = ({ mode, onBack, onSwitchMode, onAuthSuccess }: AuthPageProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      
      try {
        // Fetch user info from Google
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }
        
        const googleUser: GoogleUserData = await response.json();
        
        // Authenticate with our backend
        const result = dbService.loginOrRegisterWithGoogle(googleUser);
        
        if (result.success && result.user) {
          sessionManager.login(result.user);
          
          // Check if this is a new user (no password setup)
          if (!result.user.passwordSetupComplete && result.user.password === 'google_auth') {
            navigate('/password-setup');
          } else if (!result.user.profileSetupComplete) {
            navigate('/profile-setup');
          } else {
            onAuthSuccess();
          }
        } else if (result.error?.includes('already registered')) {
          setError('You already have an account. Please use the login option instead.');
        } else {
          setError(result.error || "Authentication failed");
        }
      } catch (error) {
        console.error('Google auth error:', error);
        setError("Failed to authenticate with Google. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google authentication was cancelled or failed.");
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg gradient-primary" />
              <h1 className="text-2xl font-bold text-gradient">CGU Connect</h1>
            </div>
            <h2 className="text-3xl font-bold">
              {mode === "login" ? "Welcome back" : "Join CGU Connect"}
            </h2>
            <p className="text-muted-foreground">
              {mode === "login" 
                ? "Sign in with your CGU Google account" 
                : "Create your account using your CGU Google account"}
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={() => googleLogin()}
              variant="outline" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Signing in..." : `Sign ${mode === "login" ? "in" : "up"} with Google`}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Only @cgu-odisha.ac.in email addresses are allowed
            </div>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              onClick={onSwitchMode}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Hero image */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src={heroBg}
          alt="CGU Campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-primary opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white space-y-4">
            <h3 className="text-4xl font-bold">Connect with CGU Students</h3>
            <p className="text-xl opacity-90">
              Share moments, ideas, and experiences with your campus community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
