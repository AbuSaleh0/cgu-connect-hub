import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import { toast } from "sonner";
import Header from "@/components/Header";

const ChangePassword = () => {
    const navigate = useNavigate();
    const currentUser = sessionManager.getCurrentUser();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (!currentUser?.email) {
            toast.error("User email not found");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify old password
            const isVerified = await dbService.verifyPassword(currentUser.email, currentPassword);

            if (!isVerified) {
                toast.error("Incorrect current password");
                setIsLoading(false);
                return;
            }

            // 2. Update to new password
            const { success, error } = await dbService.updatePassword(newPassword);

            if (success) {
                toast.success("Password updated successfully");
                navigate(`/${currentUser.username}`);
            } else {
                toast.error(error || "Failed to update password");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!currentUser?.email) {
            toast.error("User email not found");
            return;
        }

        if (!confirm("Are you sure you want to reset your password? You will be logged out and a reset link will be sent to your email.")) {
            return;
        }

        setIsResetting(true);
        try {
            const { success, error } = await dbService.resetPasswordForEmail(currentUser.email);

            if (success) {
                toast.success("Password reset email sent. Please check your inbox.");
                await sessionManager.logout();
                navigate("/");
            } else {
                toast.error(error || "Failed to send reset email");
            }
        } catch (error) {
            console.error("Error fetching reset password:", error);
            toast.error("Failed to initiate password reset");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header
                isAuthenticated={true}
                currentUser={currentUser}
                onLoginClick={() => { }}
                onSignUpClick={() => { }}
                onLogout={() => {
                    sessionManager.logout();
                    navigate("/");
                }}
                onNotificationsClick={() => navigate("/notifications")}
                onMessagesClick={() => navigate("/messages")}
                onCreateClick={() => navigate("/create")}
            />

            <div className="max-w-md mx-auto p-4 md:p-6 pt-20">
                <Button
                    variant="ghost"
                    className="mb-6"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                            <KeyRound className="h-6 w-6" />
                            Change Password
                        </h1>
                        <p className="text-muted-foreground">
                            Ensure your account is secure by using a strong password.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input
                                id="current-password"
                                type="password"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Enter new password (min. 6 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Retype new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || isResetting}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Password"
                                )}
                            </Button>
                        </div>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button
                            variant="link"
                            onClick={handleForgotPassword}
                            disabled={isResetting || isLoading}
                            className="text-sm text-muted-foreground hover:text-primary"
                        >
                            {isResetting ? "Sending..." : "Forgot your password?"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
