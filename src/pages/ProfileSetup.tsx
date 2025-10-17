import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertCircle, Check, X } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import { useNavigate } from "react-router-dom";
import ImageCropModal from "@/components/ImageCropModal";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatar, setAvatar] = useState("");
  const [semester, setSemester] = useState(currentUser?.semester || "");
  const [department, setDepartment] = useState(currentUser?.department || "");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState("");

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("");
      setUsernameAvailable(null);
      return;
    }

    const usernamePattern = /^[a-z0-9._]+$/;
    
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters long");
      setUsernameAvailable(false);
    } else if (value.length > 20) {
      setUsernameError("Username must be no more than 20 characters long");
      setUsernameAvailable(false);
    } else if (!usernamePattern.test(value)) {
      setUsernameError("Only lowercase letters, numbers, dots, and underscores allowed");
      setUsernameAvailable(false);
    } else {
      setUsernameError("");
      checkUsernameAvailability(value);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    setCheckingUsername(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = dbService.checkUsernameAvailability(username);
      setUsernameAvailable(result.available);
      if (!result.available && result.error) {
        setUsernameError(result.error);
      }
    } catch (error) {
      console.error('Username check error:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    validateUsername(value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTempImageSrc(e.target?.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setAvatar(croppedImage);
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
        username,
        displayName: displayName || username,
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
            // Update session with completed profile
            sessionManager.login(updatedUser);
            
            // Clear the new signup flag since profile setup is now complete
            sessionStorage.removeItem('newSignup');
            
            // Clear any auth view state that might redirect back to signup
            localStorage.setItem('cgu_auth_view', 'feed');
            localStorage.removeItem('authState');
            localStorage.removeItem('authMode');
            
            // Force navigation to feed
            window.location.href = '/';
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
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="john_doe or john.doe123"
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
              <div className="flex items-center gap-1 text-xs text-red-500">
                <X className="h-3 w-3" />
                {usernameError}
              </div>
            ) : checkingUsername ? (
              <p className="text-xs text-blue-500">Checking availability...</p>
            ) : usernameAvailable === false ? (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <X className="h-3 w-3" />
                Username is already taken
              </div>
            ) : usernameAvailable === true ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" />
                Username is available
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, dots (.) and underscores (_) allowed. 3-20 characters.
              </p>
            )}
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

          <Button
            onClick={handleComplete}
            className="w-full"
            disabled={loading || !username || usernameAvailable !== true}
          >
            {loading ? "Saving..." : "Complete Profile"}
          </Button>
        </div>
      </div>
      
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default ProfileSetup;