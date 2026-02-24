import React, { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Upload, Check, Crop, X, Plus, Trash2 } from "lucide-react";
import { dbService } from "@/database";
import { sessionManager } from "@/lib/session";
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

  const [images, setImages] = useState<string[]>([]);
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

  // Auto-redirect after success dialog is shown (fallback)
  useEffect(() => {
    if (success && showSuccessDialog) {
      const timer = setTimeout(() => {

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
        if (imgWidth / imgHeight > 4 / 5) {
          cropHeight = imgHeight;
          cropWidth = imgHeight * (4 / 5);
        } else {
          cropWidth = imgWidth;
          cropHeight = imgWidth * (5 / 4);
        }
        break;
      case '16:9':
        if (imgWidth / imgHeight > 16 / 9) {
          cropHeight = imgHeight;
          cropWidth = imgHeight * (16 / 9);
        } else {
          cropWidth = imgWidth;
          cropHeight = imgWidth * (9 / 16);
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
      if (images.length >= 5) {
        setError("Maximum of 5 images allowed");
        return;
      }

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
    // Reset input value to allow selecting the same file again if needed
    event.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (originalImage) {
      try {
        const croppedImage = await cropImageWithArea(originalImage);
        setImages([...images, croppedImage]);
        setShowCropOptions(false);
        setOriginalImage("");
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

  const handleInteractionStart = (clientX: number, clientY: number) => {
    const startX = clientX;
    const startY = clientY;
    const startCrop = { ...cropArea };

    const handleMove = (moveX: number, moveY: number) => {
      const deltaX = moveX - startX;
      const deltaY = moveY - startY;

      const newX = Math.max(0, Math.min(imageDimensions.width - cropArea.width, startCrop.x + deltaX));
      const newY = Math.max(0, Math.min(imageDimensions.height - cropArea.height, startCrop.y + deltaY));
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const handleCropCancel = () => {
    setShowCropOptions(false);
    setOriginalImage("");
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleCreatePost = async () => {
    if (!currentUser || images.length === 0) {

      return;
    }

    setLoading(true);
    setError(""); // Clear any previous errors
    setSuccess(false); // Clear previous success state

    try {


      const newPost = await dbService.createPost({
        user_id: currentUser.id,
        image: "", // Service will handle this
        images: images,
        caption
      });



      // Double check if the post was actually created
      if (newPost && newPost.id) {

        setSuccess(true);
        setShowSuccessDialog(true);
      } else {
        console.error("Post creation returned invalid result:", newPost);
        setError("Failed to create post. Invalid response from database.");
      }
    } catch (error: any) {
      console.error("Error creating post:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        currentUser: currentUser?.id,
        imagesCount: images.length,
        captionLength: caption?.length || 0
      });

      // Provide specific error messages for different types of errors
      if (error.message && error.message.includes("quota")) {
        setError("Storage full! Your image is too large or browser storage is full. Try using a smaller image or clear browser data.");
      } else if (error.message && error.message.includes("Storage")) {
        setError("Storage error: " + error.message);
      } else {
        setError("Failed to create post. Error: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDialogConfirm = () => {

    setShowSuccessDialog(false);

    // Use window.location.href as a fallback if navigate doesn't work
    try {
      navigate("/");

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
          <div className="ml-auto text-sm text-muted-foreground">
            {images.length}/5 images
          </div>
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

          <div className="space-y-3">
            <Label>Photos</Label>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border">
                    <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add Button Placeholder Loop if less than 5 */}
                {images.length < 5 && (
                  <label className="border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors aspect-square">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Initial Upload Area (only if no images) */}
            {images.length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center relative">
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Click to upload a photo</p>
                  <p className="text-xs text-muted-foreground">
                    Upload up to 5 photos for your post
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Crop Options Modal */}
          {showCropOptions && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crop className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Crop Image</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCropCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {originalImage && (
                  <div className="space-y-3">
                    <div className="flex justify-center bg-gray-100 rounded-lg p-2">
                      <div className="relative inline-block max-w-full overflow-hidden select-none">
                        <img
                          src={originalImage}
                          alt="Crop preview"
                          className="max-w-full max-h-[50vh] block pointer-events-none select-none"
                          style={{ width: 'auto', height: 'auto' }}
                          onDragStart={(e) => e.preventDefault()}
                        />
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move touch-none"
                          style={{
                            left: `${(cropArea.x / imageDimensions.width) * 100}%`,
                            top: `${(cropArea.y / imageDimensions.height) * 100}%`,
                            width: `${(cropArea.width / imageDimensions.width) * 100}%`,
                            height: `${(cropArea.height / imageDimensions.height) * 100}%`
                          }}
                          onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
                          onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium pointer-events-none">
                            Drag to move
                          </div>
                        </div>
                      </div>
                    </div>


                    <div className="space-y-3">
                      <Label>Aspect Ratio:</Label>
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
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={handleCropCancel} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleCropConfirm} className="flex-1">
                        Add Photo
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
            disabled={images.length === 0 || loading || showCropOptions}
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