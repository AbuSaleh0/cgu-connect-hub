import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { dbService } from "@/database";
import { UserPublic } from "@/database/types";

interface ChangeUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPublic;
  onUsernameUpdated: (newUsername: string) => void;
}

const ChangeUsernameModal = ({
  isOpen,
  onClose,
  currentUser,
  onUsernameUpdated
}: ChangeUsernameModalProps) => {
  console.log('ChangeUsernameModal props:', { isOpen, currentUser: currentUser?.username });

  const [newUsername, setNewUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewUsername(currentUser.username);
      setError("");
      setIsAvailable(null);
    }
  }, [isOpen, currentUser.username]);

  const validateUsername = (username: string) => {
    if (!username.trim()) {
      return "Username is required";
    }

    if (username.length < 3 || username.length > 20) {
      return "Username must be between 3 and 20 characters";
    }

    const usernamePattern = /^[a-z0-9._]+$/;
    if (!usernamePattern.test(username)) {
      return "Username can only contain lowercase letters, numbers, dots, and underscores";
    }

    return null;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username === currentUser.username) {
      setIsAvailable(true);
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const existingUser = await dbService.getUserByUsername(username);
      setIsAvailable(!existingUser);
      if (existingUser) {
        setError("This username is already taken");
      }
    } catch (err) {
      setError("Error checking username availability");
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const lowercaseValue = value.toLowerCase();
    setNewUsername(lowercaseValue);
    setError("");
    setIsAvailable(null);

    const validationError = validateUsername(lowercaseValue);
    if (validationError) {
      setError(validationError);
      return;
    }
  };

  // Debounced availability check
  useEffect(() => {
    if (!newUsername || newUsername === currentUser.username) {
      setIsAvailable(newUsername === currentUser.username ? true : null);
      return;
    }

    const validationError = validateUsername(newUsername);
    if (validationError) {
      return; // Don't check availability if validation fails
    }

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newUsername, currentUser.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with username:', newUsername);

    const validationError = validateUsername(newUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newUsername === currentUser.username) {
      onClose();
      return;
    }

    if (!isAvailable) {
      setError("Please choose an available username");
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      console.log('Attempting to update username from', currentUser.username, 'to', newUsername);
      const success = await dbService.updateUsername(currentUser.id, newUsername);
      console.log('Update result:', success);
      if (success) {
        console.log('Username update successful, calling onUsernameUpdated');
        onUsernameUpdated(newUsername);
        onClose();
      } else {
        console.log('Username update failed');
        setError("Failed to update username. Please try again.");
      }
    } catch (err) {
      console.error('Username update error:', err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const isFormValid = newUsername.trim() && !error && isAvailable && !isChecking;
  console.log('Form validation:', {
    newUsername: newUsername.trim(),
    hasError: !!error,
    isAvailable,
    isChecking,
    isFormValid
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Username</DialogTitle>
          <DialogDescription>
            Choose a new username for your account. This will change your profile URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Enter new username"
                  disabled={isUpdating}
                />

                {isChecking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking availability...
                  </div>
                )}

                {!isChecking && isAvailable === true && newUsername !== currentUser.username && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Username is available
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Username"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeUsernameModal;