import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, Mail, Lock, User, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import heroBg from "@/assets/hero-bg.png";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AuthPageProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
  onAuthSuccess: () => void;
}

const AuthPage = ({ mode: initialMode, onBack, onSwitchMode, onAuthSuccess }: AuthPageProps) => {
  const [internalMode, setInternalMode] = useState<"login" | "signup" | "verify">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Data
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // For Login (can be email or username)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Validation
      if (!email.endsWith("@cgu-odisha.ac.in")) {
        throw new Error("Only @cgu-odisha.ac.in emails are allowed.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      // 2. Supabase Signup (Triggers OTP Email)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // We can pass metadata, but our SQL trigger handles the profile creation primarily.
          // However, passing data here is good for redundant safety.
          data: {
            full_name: email.split('@')[0],
          }
        }
      });

      if (signUpError) throw signUpError;

      // 3. Switch to Verify Mode
      if (data.user && !data.session) {
        setInternalMode("verify");
      } else if (data.session) {
        // If auto-confirmed (shouldn't happen with email enabled, but just in case)
        handleLoginSuccess(data.session.user);
      }

    } catch (err: any) {
      console.error("Signup error object:", err);
      let errorMessage = "Signup failed.";

      if (typeof err === "string") {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err && typeof err === "object") {
        // Try to stringify if it's an object without message
        errorMessage = JSON.stringify(err);
        if (errorMessage === "{}") errorMessage = "Unknown error occurred (Empty error object).";
      }

      if (errorMessage.includes("rate limit") || errorMessage.includes("confirmation email")) {
        setError("Email limit reached. excessive signups or Supabase limit. Try again later or check SMTP settings.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      if (data.session) {
        await handleLoginSuccess(data.session.user);
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let loginEmail = username; // Default assume it's email

      // If input doesn't look like email, treat as username and resolve it
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
      setError(err.message || "Login failed check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (authUser: any) => {
    // Sync user profile
    const { user } = await dbService.syncUserWithSupabase();

    if (user) {
      sessionManager.login(user);

      // Check if profile setup is needed (New Signups)
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
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </button>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gradient">CGU Connect</h1>
            <h2 className="text-3xl font-bold">
              {internalMode === "login" && "Welcome back"}
              {internalMode === "signup" && "Join the Community"}
              {internalMode === "verify" && "Verify Email"}
            </h2>
            <p className="text-muted-foreground">
              {internalMode === "login" ? "Sign in to your account" :
                internalMode === "signup" ? "Use your college email to get started" :
                  "Enter the code sent to " + email}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* LOGIN FORM */}
          {internalMode === "login" && (
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
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {internalMode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>College Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="radius...12@cgu-odisha.ac.in"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be a @cgu-odisha.ac.in email</p>
              </div>
              <div className="space-y-2">
                <Label>Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending Code..." : "Sign Up"}
              </Button>
            </form>
          )}

          {/* VERIFY FORM */}
          {internalMode === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label>One-Time Password (OTP)</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <div className="w-4" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setInternalMode("signup")}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Wrong email? Go back
                </button>
              </div>
            </form>
          )}

          {/* Footer Switches */}
          {internalMode !== "verify" && (
            <div className="text-center text-sm pt-4">
              <span className="text-muted-foreground">
                {internalMode === "login" ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => {
                  const newMode = internalMode === "login" ? "signup" : "login";
                  setInternalMode(newMode);
                  onSwitchMode(); // Notify parent if needed
                }}
                className="text-primary hover:underline font-medium"
              >
                {internalMode === "login" ? "Sign up" : "Log in"}
              </button>
            </div>
          )}

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