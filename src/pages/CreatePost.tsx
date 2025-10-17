import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Upload, Check, Crop } from "lucide-react";
import { dbService, sessionManager } from "@/database";
import DatabaseConnection from "@/database/connection";
import { useNavigate } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";

const CreatePost = () => {
  const navigate = useNavigate();
  const currentUser = sessionManager.getCurrentUser();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  const [image, setImage] = useState("");
  const [originalImage, setOriginalImage] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showCropOptions, setShowCropOptions] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [storageInfo, setStorageInfo] = useState<{usedMB: string; totalPosts: number; totalUsers: number} | null>(null);

  // Load storage info on component mount
  useEffect(() => {
    try {
      const db = DatabaseConnection.getInstance();
      setStorageInfo(db.getStorageInfo());
    } catch (error) {
      console.error("Error getting storage info:", error);
    }
  }, []);

  // Auto-redirect after success dialog is shown (fallback)
  useEffect(() => {
    if (success && showSuccessDialog) {
      const timer = setTimeout(() => {
        console.log("Auto-redirecting after 5 seconds...");
        setShowSuccessDialog(false);
        navigate("/");
      }, 5000); // Auto redirect after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [success, showSuccessDialog, navigate]);

  const updateCropArea = (ratio: string, imgWidth: number, imgHeight: number) => {
    let cropWidth, cropHeight;
    
    switch (ratio) {
      case '1:1':
        const minDim = Math.min(imgWidth, imgHeight);
        cropWidth = cropHeight = minDim;
        break;
      case '4:5':
        if (imgWidth / imgHeight > 4/5) {
          cropHeight = imgHeight;
          cropWidth = imgHeight * (4/5);
        } else {
          cropWidth = imgWidth;
          cropHeight = imgWidth * (5/4);
        }
        break;
      case '16:9':
        if (imgWidth / imgHeight > 16/9) {
          cropHeight = imgHeight;
          cropWidth = imgHeight * (16/9);
        } else {
          cropWidth = imgWidth;
          cropHeight = imgWidth * (9/16);
        }
        break;
      default:
        cropWidth = imgWidth;
        cropHeight = imgHeight;
    }
    
    setCropArea({
      x: (imgWidth - cropWidth) / 2,
      y: (imgHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    });
  };

  const cropImageWithArea = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 800;
        let finalWidth = cropArea.width;
        let finalHeight = cropArea.height;
        
        if (cropArea.width > maxWidth) {
          finalWidth = maxWidth;
          finalHeight = (cropArea.height * maxWidth) / cropArea.width;
        }
        
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        
        ctx?.drawImage(
          img,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, finalWidth, finalHeight
        );
        
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(croppedDataUrl);
      };
      
      img.src = imageDataUrl;
    });
  };

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type;
      
      if (fileType.startsWith('image/')) {
        const maxSize = 5 * 1024 * 1024; // 5MB limit
        
        if (file.size > maxSize) {
          setError("Image must be smaller than 5MB");
          return;
        }
        
        // Compress image and show crop options
        try {
          compressImage(file, 800, 0.7).then((compressedImage) => {
            console.log("Compressed image size:", (compressedImage.length / 1024 / 1024).toFixed(2), "MB");
            setOriginalImage(compressedImage);
            
            // Get image dimensions
            const img = new Image();
            img.onload = () => {
              setImageDimensions({ width: img.width, height: img.height });
              updateCropArea('1:1', img.width, img.height);
              setShowCropOptions(true);
            };
            img.src = compressedImage;
            
            setError(""); // Clear any previous errors
          });
        } catch (error) {
          console.error("Error compressing image:", error);
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            setOriginalImage(result);
            
            const img = new Image();
            img.onload = () => {
              setImageDimensions({ width: img.width, height: img.height });
              updateCropArea('1:1', img.width, img.height);
              setShowCropOptions(true);
            };
            img.src = result;
          };
          reader.readAsDataURL(file);
        }
      } else {
        setError("Please select an image file");
      }
    }
  };

  const handleCropConfirm = async () => {
    if (originalImage) {
      try {
        const croppedImage = await cropImageWithArea(originalImage);
        setImage(croppedImage);
        setShowCropOptions(false);
      } catch (error) {
        console.error("Error cropping image:", error);
        setError("Failed to crop image");
      }
    }
  };

  const handleRatioChange = (ratio: string) => {
    setSelectedRatio(ratio);
    updateCropArea(ratio, imageDimensions.width, imageDimensions.height);
  };

  const handleCropDrag = (e: React.MouseEvent, type: 'move' | 'resize') => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...cropArea };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      if (type === 'move') {
        const newX = Math.max(0, Math.min(imageDimensions.width - cropArea.width, startCrop.x + deltaX));
        const newY = Math.max(0, Math.min(imageDimensions.height - cropArea.height, startCrop.y + deltaY));
        setCropArea(prev => ({ ...prev, x: newX, y: newY }));
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCropCancel = () => {
    setShowCropOptions(false);
    setOriginalImage("");
  };

  const handleCreatePost = async () => {
    if (!currentUser || !image) {
      console.log("Missing user or image:", { user: !!currentUser, image: !!image });
      return;
    }
    
    setLoading(true);
    setError(""); // Clear any previous errors
    setSuccess(false); // Clear previous success state
    
    try {
      console.log("Creating post for user:", currentUser.username, "with data:", { 
        user_id: currentUser.id, 
        image: image.substring(0, 50) + "...", 
        caption 
      });
      
      const newPost = await dbService.createPost({
        user_id: currentUser.id,
        image: image,
        caption
      });
      
      console.log("Post created successfully:", newPost);
      
      // Double check if the post was actually created
      if (newPost && newPost.id) {
        console.log("Post validation successful, ID:", newPost.id);
        setSuccess(true);
        setShowSuccessDialog(true);
      } else {
        console.error("Post creation returned invalid result:", newPost);
        setError("Failed to create post. Invalid response from database.");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        currentUser: currentUser?.id,
        imageExists: !!image,
        captionLength: caption?.length || 0
      });
      
      // Provide specific error messages for different types of errors
      if (error.message.includes("quota")) {
        setError("Storage full! Your image is too large or browser storage is full. Try using a smaller image or clear browser data.");
      } else if (error.message.includes("Storage")) {
        setError("Storage error: " + error.message);
      } else {
        setError("Failed to create post. Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDialogConfirm = () => {
    console.log("Navigating to home page...");
    setShowSuccessDialog(false);
    
    // Use window.location.href as a fallback if navigate doesn't work
    try {
      navigate("/");
      console.log("Navigation attempted with useNavigate");
    } catch (error) {
      console.error("Navigate failed, using window.location:", error);
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 pb-20 md:pb-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Create Post</h1>
        </div>

        <div className="space-y-6">
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Post created successfully! Redirecting to feed...
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {storageInfo && parseFloat(storageInfo.usedMB) > 4 && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertDescription className="text-orange-800">
                ⚠️ Storage Warning: Using {storageInfo.usedMB} MB ({storageInfo.totalPosts} posts). 
                Consider using smaller images to avoid storage issues.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center relative">
              {image ? (
                <div className="space-y-2">
                  <img src={image} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                  <p className="text-xs text-green-600">
                    ✓ Image cropped to {selectedRatio} ratio and optimized
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setImage("");
                      setOriginalImage("");
                    }}
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Click to upload a photo</p>
                  <p className="text-xs text-muted-foreground">
                    Choose aspect ratio after upload for best display
                  </p>
                </div>
              )}
              {!image && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Crop Options Modal */}
          {showCropOptions && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <div className="flex items-center gap-2">
                  <Crop className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Choose Aspect Ratio</h3>
                </div>
                
                {originalImage && (
                  <div className="space-y-3">
                    <img src={originalImage} alt="Original" className="w-full max-h-48 object-contain rounded" />
                    
                    <div className="space-y-3">
                      <Label>Select aspect ratio and drag to position:</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={selectedRatio === '1:1' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRatioChange('1:1')}
                          className="text-xs"
                        >
                          1:1 Square
                        </Button>
                        <Button
                          variant={selectedRatio === '4:5' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRatioChange('4:5')}
                          className="text-xs"
                        >
                          4:5 Portrait
                        </Button>
                        <Button
                          variant={selectedRatio === '16:9' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRatioChange('16:9')}
                          className="text-xs"
                        >
                          16:9 Landscape
                        </Button>
                      </div>
                      
                      {/* Interactive Crop Area */}
                      <div className="relative inline-block max-w-full">
                        <img 
                          src={originalImage} 
                          alt="Crop preview" 
                          className="max-w-full max-h-64 block"
                          style={{ width: 'auto', height: 'auto' }}
                        />
                        <div 
                          className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                          style={{
                            left: `${(cropArea.x / imageDimensions.width) * 100}%`,
                            top: `${(cropArea.y / imageDimensions.height) * 100}%`,
                            width: `${(cropArea.width / imageDimensions.width) * 100}%`,
                            height: `${(cropArea.height / imageDimensions.height) * 100}%`
                          }}
                          onMouseDown={(e) => handleCropDrag(e, 'move')}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                            Drag to move
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={handleCropCancel} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleCropConfirm} className="flex-1">
                        Crop & Continue
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
            />
          </div>

          <Button
            type="button"
            onClick={handleCreatePost}
            className="w-full"
            disabled={!image || loading || showCropOptions}
          >
            {loading ? "Creating Post..." : "Create Post"}
          </Button>
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Post Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your post has been created and shared with the CGU Connect community. 
              Click "Go to Home Feed" or wait 5 seconds for automatic redirect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleDialogConfirm}>
              Go to Home Feed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onExploreClick={() => navigate('/search')}
        onNotificationsClick={() => navigate('/notifications')}
        onCreateClick={() => navigate('/create')}
        isAuthenticated={!!currentUser}
        currentUser={currentUser}
      />
    </div>
  );
};

export default CreatePost;