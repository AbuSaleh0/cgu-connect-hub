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

export default function ProfileSetup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState<User | null>(sessionManager.getCurrentUser());

    const [formData, setFormData] = useState({
        username: "",
        displayName: "",
        bio: "",
        department: "",
        semester: ""
    });

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

        // Pre-fill email derived username if available
        if (user && !formData.username) {
            setFormData(prev => ({ ...prev, username: user.username || "" }));
        }
    }, [user, navigate]);

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
            if (!(await validateUsername(formData.username))) {
                setLoading(false);
                return;
            }

            // Update User in DB
            const { success, error } = await dbService.updateUserProfile(user.id, {
                ...formData,
                avatar: user.avatar // Keep existing avatar or default
            });

            if (!success) {
                setError(error || "Failed to update profile.");
                setLoading(false);
                return;
            }

            // Mark setup as complete in DB (We need a specific method or update the flag manually)
            // Since updateUserProfile in service.ts doesn't explicitly set profile_setup_complete=true, 
            // we might need to handle that. 
            // Ideally, the SQL trigger should set it to false, and this action sets it to true.
            // Let's assume updateUserProfile can handle generic updates or we make a specific call.

            // We'll update the 'profile_setup_complete' flag manually since the generic update might not capture it if not in UI
            // Actually, let's call supabase directly here or add a method to service. But to keep it clean, let's just 
            // trust that we can add 'profile_setup_complete: true' to the update object if the service allows arbitrary fields 
            // or we just call the service method which allows us to pass "data".

            // Let's modify the service call to include this flag explicitly if the type allows it, 
            // or rely on a specific "completeSetup" method if we had one.
            // Since we don't, let's do a direct Supabase update for the flag to ensure it sticks.

            const { supabase } = await import("@/lib/supabase");
            await supabase.from("users").update({ profile_setup_complete: true }).eq("id", user.id);

            // Refresh local session
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl shadow-lg border">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-muted-foreground mt-2">Tell us a bit about yourself</p>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
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
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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
                                    <SelectItem value="CSE">CSE</SelectItem>
                                    <SelectItem value="ECE">ECE</SelectItem>
                                    <SelectItem value="EE">EE</SelectItem>
                                    <SelectItem value="ME">ME</SelectItem>
                                    <SelectItem value="Civil">Civil</SelectItem>
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
                        {loading ? "Saving..." : "Complete Setup"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
