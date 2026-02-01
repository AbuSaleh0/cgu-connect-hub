import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import heroBg from "@/assets/hero-bg.png";
import googleIcon from "@/assets/google.svg"; // Assuming you have a google icon asset, if not use text or lucide

interface AuthPageProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
  onAuthSuccess: () => void;
}

const AuthPage = ({ mode, onBack, onSwitchMode, onAuthSuccess }: AuthPageProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login Form Data
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Data
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setLoading(true);
    setError("");

    try {
      const { success, error } = await dbService.resetPasswordForEmail(resetEmail);
      if (success) {
        alert("Password reset email sent! Please check your inbox.");
        setIsResetting(false);
      } else {
        throw new Error(error || "Failed to send reset email.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'cgu-odisha.ac.in' // Restrict to CGU domain
          },
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to connect with Google.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let loginEmail = username;

      // If input doesn't look like email, treat as username
      if (!username.includes("@")) {
        const resolvedEmail = await dbService.getEmailByUsername(username);
        if (!resolvedEmail) {
          throw new Error("Username not found.");
        }
        loginEmail = resolvedEmail;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (signInError) throw signInError;

      if (data.session) {
        await handleLoginSuccess(data.session.user);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (authUser: any) => {
    const { user } = await dbService.syncUserWithSupabase();

    if (user) {
      sessionManager.login(user);

      if (!user.profile_setup_complete) {
        window.location.href = "/profile-setup";
      } else {
        onAuthSuccess();
      }
    } else {
      setError("Failed to load user profile.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gradient">CGU Connect</h1>
            <h2 className="text-3xl font-bold">
              {mode === "login" ? "Welcome back" : "Join the Community"}
            </h2>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Sign in to access your account"
                : "Sign up with your college email"}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <>
              {isResetting ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg">Reset Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your email to receive a password reset link.
                    </p>
                  </div>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="student@cgu-odisha.ac.in"
                          required
                          type="email"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setIsResetting(false)}
                        className="text-sm text-muted-foreground"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email or Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="student@cgu-odisha.ac.in or username"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto font-normal text-xs text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setResetEmail(username.includes("@") ? username : "");
                          setIsResetting(true);
                          setError("");
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* SIGNUP (GOOGLE ONLY) */}
          {mode === "signup" && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
                <p>New users must sign up using their official CGU email.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full py-6 flex items-center gap-2 text-lg"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {/* Fallback icon if asset missing, or use text */}
                <span className="font-bold text-blue-600">G</span>
                Sign up with Google
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You will be asked to set a password and profile details after verification.
              </p>
            </div>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {mode === "login" ? "New here?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <div className="text-center">
            <Button variant="link" onClick={onSwitchMode} className="text-primary hover:underline">
              {mode === "login" ? "Create an account" : "Log in with Password"}
            </Button>
          </div>

        </div>
      </div>

      {/* Right Image Panel */}
      <div className="hidden lg:block flex-1 relative bg-black">
        <img
          src={heroBg}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          alt="Campus Life"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-12">
          <div className="text-white">
            <h3 className="text-3xl font-bold mb-2">Connect with your Campus</h3>
            <p className="text-gray-300">Join the student community, share moments, and stay updated.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;