import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";
import { dbService } from "@/database";
import { UserPublic } from "@/database/types";
import ImageCropModal from "@/components/ImageCropModal";
import { DEPARTMENTS } from "@/lib/constants";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserPublic;
  onUpdate: () => void;
}

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }: EditProfileModalProps) => {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [semester, setSemester] = useState(user.semester);
  const [department, setDepartment] = useState(user.department);
  const [loading, setLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState("");

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await dbService.updateUserProfile(user.id, {
        display_name: displayName,
        bio,
        avatar,
        semester,
        department
      });

      if (result.success) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Update profile error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatar} />
                <AvatarFallback className="text-lg">
                  {displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90">
                <Camera className="h-3 w-3" />
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
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </Dialog>
  );
};

export default EditProfileModal;