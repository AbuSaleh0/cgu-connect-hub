import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface AuthPageProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
}

const AuthPage = ({ mode, onBack, onSwitchMode }: AuthPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication logic with backend
    console.log("Auth submission:", { mode, email, password, username });
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
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Log in to your CGU Connect account"
                : "Join the exclusive CGU student community"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@cgu-odisha.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Must be a valid @cgu-odisha.ac.in email
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
                required
              />
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="gradient" className="w-full" size="lg">
              {mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>

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
