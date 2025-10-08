import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import { useNavigate } from "react-router-dom";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatar, setAvatar] = useState(currentUser?.avatar || "");
  const [semester, setSemester] = useState(currentUser?.semester || "");
  const [department, setDepartment] = useState(currentUser?.department || "");
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!currentUser) {
      console.error("No current user found");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Updating profile for user:", currentUser.id);
      const updateResult = dbService.updateUserProfile(currentUser.id, {
        displayName: displayName || currentUser.username,
        bio,
        avatar,
        semester,
        department
      });
      
      console.log("Update result:", updateResult);
      
      if (updateResult.success) {
        const setupResult = dbService.completeProfileSetup(currentUser.id);
        console.log("Setup completion result:", setupResult);
        
        if (setupResult.success) {
          const updatedUser = dbService.getUserById(currentUser.id);
          console.log("Updated user:", updatedUser);
          
          if (updatedUser) {
            sessionManager.login(updatedUser);
            navigate("/");
          }
        }
      } else {
        console.error("Profile update failed:", updateResult.error);
      }
    } catch (error) {
      console.error("Profile setup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentUser) {
      console.error("No current user found");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Skipping profile setup for user:", currentUser.id);
      const result = dbService.completeProfileSetup(currentUser.id);
      console.log("Skip result:", result);
      
      if (result.success) {
        const updatedUser = dbService.getUserById(currentUser.id);
        console.log("Updated user after skip:", updatedUser);
        
        if (updatedUser) {
          sessionManager.login(updatedUser);
          navigate("/");
        }
      } else {
        console.error("Skip failed:", result.error);
      }
    } catch (error) {
      console.error("Skip profile setup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Let others know more about you
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatar} />
                <AvatarFallback className="text-lg">
                  {displayName?.[0]?.toUpperCase() || currentUser?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Semester</SelectItem>
                  <SelectItem value="2nd">2nd Semester</SelectItem>
                  <SelectItem value="3rd">3rd Semester</SelectItem>
                  <SelectItem value="4th">4th Semester</SelectItem>
                  <SelectItem value="5th">5th Semester</SelectItem>
                  <SelectItem value="6th">6th Semester</SelectItem>
                  <SelectItem value="7th">7th Semester</SelectItem>
                  <SelectItem value="8th">8th Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">Computer Science</SelectItem>
                  <SelectItem value="ECE">Electronics & Communication</SelectItem>
                  <SelectItem value="ME">Mechanical Engineering</SelectItem>
                  <SelectItem value="CE">Civil Engineering</SelectItem>
                  <SelectItem value="EE">Electrical Engineering</SelectItem>
                  <SelectItem value="IT">Information Technology</SelectItem>
                  <SelectItem value="MBA">Business Administration</SelectItem>
                  <SelectItem value="BBA">Bachelor of Business Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={loading}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleComplete}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;