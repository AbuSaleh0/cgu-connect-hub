import React, { useState, useEffect } from "react";
import { User } from "@/database/types";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";
import { DEPARTMENTS } from "@/lib/constants";

export default function ProfileSetup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState<User | null>(sessionManager.getCurrentUser());

    const [formData, setFormData] = useState({
        username: "",
        display_name: "",
        bio: "",
        department: "",
        semester: ""
    });

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // If not logged in, redirect to login
        if (!sessionManager.isLoggedIn()) {
            navigate("/");
            return;
        }

        // If profile is already setup, redirect to home
        if (user?.profile_setup_complete) {
            navigate("/");
            return;
        }

        if (user && !formData.username) {
            setFormData(prev => ({ ...prev, username: user.username || "" }));
        }
    }, [user, navigate]);

    // Constructive scroll to error
    useEffect(() => {
        if (error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [error]);

    const validateUsername = async (username: string) => {
        // Basic regex check
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            setError("Username must be 3-20 characters, alphanumeric or underscore.");
            return false;
        }

        // Check availability (if changed)
        if (username !== user?.username) {
            const { available } = await dbService.checkUsernameAvailability(username);
            if (!available) {
                setError("Username is already taken.");
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!user) return;

        try {
            // Validate Passwords
            if (password.length < 6) {
                setError("Password must be at least 6 characters.");
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setLoading(false);
                return;
            }

            if (!(await validateUsername(formData.username))) {
                setLoading(false);
                return;
            }

            // 1. Update Password in Supabase Auth
            const { error: passwordError } = await supabase.auth.updateUser({ password: password });
            if (passwordError) {
                setError("Failed to set password: " + passwordError.message);
                setLoading(false);
                return;
            }

            // 2. Update User Profile in DB
            const { success, error: profileError } = await dbService.updateUserProfile(user.id, {
                ...formData,
                avatar: user.avatar // Keep existing avatar or default
            });

            if (!success) {
                setError(profileError || "Failed to update profile.");
                setLoading(false);
                return;
            }

            // 3. Mark setup as complete
            const { error: flagError } = await supabase
                .from("users")
                .update({ profile_setup_complete: true })
                .eq("id", user.id);

            if (flagError) {
                console.error("Failed to set completion flag", flagError);
                // Warning but proceed? No, user might get stuck. Warn.
                setError("Profile saved but failed to complete setup. Please try again.");
                setLoading(false);
                return;
            }

            // Refresh local session and redirect
            const { user: updatedUser } = await dbService.syncUserWithSupabase();
            if (updatedUser) {
                sessionManager.login(updatedUser);
                window.location.href = "/"; // Force full reload to clear any state
            }

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4 flex flex-col justify-center sm:px-6 lg:px-8 bg-background">
            <div className="max-w-md w-full mx-auto space-y-8 bg-card p-6 md:p-8 rounded-xl shadow-lg border">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-muted-foreground mt-2">Set up your password and details</p>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Security Section */}
                    <div className="space-y-4 pt-2 pb-4 border-b">
                        <h3 className="font-medium text-sm text-foreground/80">Account Security</h3>
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="******"
                                    className="pr-10"
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
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="******"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                            placeholder="johndoe"
                            required
                        />
                        <p className="text-xs text-muted-foreground">Unique identifier for your profile.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="displayName"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Computer Science Student | Tech Enthusiast"
                            className="resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select onValueChange={(val) => setFormData({ ...formData, department: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map((dept) => (
                                        <SelectItem key={dept.value} value={dept.value}>
                                            {dept.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select onValueChange={(val) => setFormData({ ...formData, semester: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1st</SelectItem>
                                    <SelectItem value="2">2nd</SelectItem>
                                    <SelectItem value="3">3rd</SelectItem>
                                    <SelectItem value="4">4th</SelectItem>
                                    <SelectItem value="5">5th</SelectItem>
                                    <SelectItem value="6">6th</SelectItem>
                                    <SelectItem value="7">7th</SelectItem>
                                    <SelectItem value="8">8th</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Saving..." : "Save & Complete Setup"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
