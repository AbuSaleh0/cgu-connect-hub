import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { dbService } from "@/database";
import { sessionManager } from "@/lib/session";
import { useNavigate } from "react-router-dom";

const PasswordSetup = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetupPassword = async () => {
    if (!currentUser) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await dbService.setupPassword(currentUser.id, password);

      if (result.success) {
        const updatedUser = await dbService.getUserById(currentUser.id);
        if (updatedUser) {
          sessionManager.login(updatedUser);
        }

        // Check if profile setup is needed
        if (!updatedUser?.profileSetupComplete) {
          // Keep the new signup flag since user is still in signup flow
          navigate("/profile-setup");
        } else {
          // User has completed setup, clear the flag
          sessionStorage.removeItem('newSignup');
          navigate("/");
        }
      } else {
        setError(result.error || "Failed to setup password");
      }
    } catch (error) {
      console.error("Password setup error:", error);
      setError("An error occurred while setting up password");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Setup Your Password</h1>
          <p className="text-muted-foreground">
            Create a password to login with email next time
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSetupPassword}
            className="w-full"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? "Setting up..." : "Setup Password"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetup;