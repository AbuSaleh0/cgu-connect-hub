import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import heroBg from "@/assets/hero-bg.jpg";
import { dbService, sessionManager } from "@/database";

interface AuthPageProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
  onAuthSuccess: () => void;
}

const AuthPage = ({ mode, onBack, onSwitchMode, onAuthSuccess }: AuthPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "details">(() => {
    // Restore signup step from localStorage if in signup mode
    if (mode === "signup") {
      const savedStep = localStorage.getItem('signupStep');
      return (savedStep as "email" | "otp" | "details") || "email";
    }
    return "email";
  });
  const [otpCode, setOtpCode] = useState(() => {
    // Restore OTP code from localStorage
    return localStorage.getItem('otpCode') || "";
  });
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);

  // Save signup step to localStorage
  useEffect(() => {
    if (mode === "signup") {
      localStorage.setItem('signupStep', signupStep);
    }
  }, [signupStep, mode]);

  // Save form data to localStorage
  useEffect(() => {
    if (mode === "signup") {
      localStorage.setItem('signupEmail', email);
    }
  }, [email, mode]);

  useEffect(() => {
    if (mode === "signup") {
      localStorage.setItem('otpCode', otpCode);
    }
  }, [otpCode, mode]);

  // Clear localStorage when switching to login mode
  useEffect(() => {
    if (mode === "login") {
      localStorage.removeItem('signupStep');
      localStorage.removeItem('signupEmail');
      localStorage.removeItem('otpCode');
    }
  }, [mode]);

  // Restore email from localStorage on mount for signup
  useEffect(() => {
    if (mode === "signup") {
      const savedEmail = localStorage.getItem('signupEmail');
      if (savedEmail && !email) {
        setEmail(savedEmail);
      }
    }
  }, [mode]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) return;
    
    setUsernameCheckLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = dbService.checkUsernameAvailability(username);
      setUsernameAvailable(result.available);
      if (!result.available && result.error) {
        setUsernameError(result.error);
      }
    } catch (error) {
      console.error('Username check error:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const validateUsername = (value: string) => {
    if (value.length === 0) {
      setUsernameError("");
      return;
    }

    const usernamePattern = /^[a-z0-9._]+$/;
    
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters long");
    } else if (value.length > 20) {
      setUsernameError("Username must be no more than 20 characters long");
    } else if (!usernamePattern.test(value)) {
      setUsernameError("Only lowercase letters, numbers, dots, and underscores allowed");
    } else {
      setUsernameError("");
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setUsernameAvailable(null); // Reset availability status
    
    if (mode === "signup") {
      validateUsername(value);
      
      // Debounced availability check
      const timeoutId = setTimeout(() => {
        if (value.length >= 3 && !usernameError) {
          checkUsernameAvailability(value);
        }
      }, 800);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSendOTP = async () => {
    if (!email || !email.endsWith('@cgu-odisha.ac.in')) {
      setError('Please enter a valid @cgu-odisha.ac.in email address');
      return;
    }

    setOtpSending(true);
    setError("");
    setGeneratedOTP(null);

    try {
      const result = await dbService.sendOTP(email);
      if (result.success) {
        setOtpSent(true);
        setSignupStep("otp");
        if (result.otp) {
          setGeneratedOTP(result.otp); // Show OTP for demo purposes
        }
        console.log("📧 OTP sent! Generated code:", result.otp);
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (error) {
      setError("Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = dbService.verifyOTP({ email, code: otpCode });
      if (result.success) {
        setSignupStep("details");
      } else {
        setError(result.error || "Invalid OTP");
      }
    } catch (error) {
      setError("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await dbService.login({ email, password });
      if (result.success && result.user) {
        sessionManager.login(result.user);
        onAuthSuccess();
      } else {
        setError(result.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usernameError || usernameAvailable !== true) {
      setError("Please ensure username is valid and available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await dbService.signup({
        username,
        email,
        password,
        avatar: ""
      });

      if (result.success && result.user) {
        sessionManager.login(result.user);
        // Clear all persisted auth data on successful signup
        localStorage.removeItem('signupStep');
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('otpCode');
        onAuthSuccess();
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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
              {mode === "login" ? "Welcome back" : 
               signupStep === "email" ? "Verify your email" : 
               signupStep === "otp" ? "Enter verification code" : 
               "Complete your profile"}
            </h2>
            <p className="text-muted-foreground">
              {mode === "login" ? "Log in to your CGU Connect account" :
               signupStep === "email" ? "We'll send a verification code to your CGU email" :
               signupStep === "otp" ? "Enter the 6-digit code sent to your email" :
               "Create your username and password"}
            </p>
          </div>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@cgu-odisha.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          )}

          {/* Signup Step 1: Email Verification */}
          {mode === "signup" && signupStep === "email" && (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@cgu-odisha.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be a valid @cgu-odisha.ac.in email address
                </p>
              </div>

              <Button 
                onClick={handleSendOTP} 
                variant="gradient" 
                className="w-full" 
                size="lg"
                disabled={otpSending || !email}
              >
                {otpSending ? "Sending code..." : "Send verification code"}
              </Button>
            </div>
          )}

          {/* Signup Step 2: OTP Verification */}
          {mode === "signup" && signupStep === "otp" && (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Verification code sent to:
                </p>
                <p className="font-medium">{email}</p>
                
                {generatedOTP && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-blue-800 font-medium">
                      🔐 Demo Mode - Your OTP Code:
                    </p>
                    <p className="text-2xl font-mono font-bold text-blue-900 tracking-widest">
                      {generatedOTP}
                    </p>
                    <p className="text-xs text-blue-700">
                      In production, this would be sent to your email
                    </p>
                  </div>
                )}
                
                {!generatedOTP && (
                  <p className="text-xs text-blue-600">
                    💡 Check the browser console for the OTP code (demo mode)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSignupStep("email")} 
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyOTP} 
                  variant="gradient" 
                  className="flex-1"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify code"}
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-sm text-primary hover:underline"
                  disabled={otpSending}
                >
                  {otpSending ? "Sending..." : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* Signup Step 3: Username and Password */}
          {mode === "signup" && signupStep === "details" && (
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="john_doe or john.doe123"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={loading}
                  pattern="[a-z0-9._]+"
                  minLength={3}
                  maxLength={20}
                  className={
                    usernameError || usernameAvailable === false 
                      ? "border-red-500 focus:border-red-500" 
                      : usernameAvailable === true 
                        ? "border-green-500 focus:border-green-500"
                        : ""
                  }
                  required
                />
                {usernameError ? (
                  <p className="text-xs text-red-500">{usernameError}</p>
                ) : usernameCheckLoading ? (
                  <p className="text-xs text-blue-500">Checking availability...</p>
                ) : usernameAvailable === false ? (
                  <p className="text-xs text-red-500">Username is already taken</p>
                ) : usernameAvailable === true ? (
                  <p className="text-xs text-green-500">Username is available ✓</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, dots (.) and underscores (_) allowed. 3-20 characters.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setSignupStep("otp")} 
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  variant="gradient" 
                  className="flex-1" 
                  disabled={loading || usernameAvailable !== true}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </form>
          )}

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
