import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bookmark, UserMinus, UserPlus, Flag, Edit3, Trash2, Pin } from "lucide-react";
import { dbService } from "@/database";

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    username: string;
    caption: string;
  };
  currentUser?: { id: number; username: string; } | null;
  isOwnPost: boolean;
  onPostUpdate?: (action?: string) => void;
}

const PostOptionsModal = ({ isOpen, onClose, post, currentUser, isOwnPost, onPostUpdate }: PostOptionsModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Load initial states
  useEffect(() => {
    if (currentUser && post.id && isOpen) {
      setIsSaved(dbService.isPostSaved(currentUser.id, Number(post.id)));
      setEditCaption(post.caption); // Reset caption when modal opens
      
      if (!isOwnPost) {
        setIsFollowing(dbService.isFollowingUsername(currentUser.id, post.username));
      } else {
        // Check if post is pinned
        try {
          const postData = dbService.getPostById(Number(post.id));
          setIsPinned(postData?.pinned === 1);
        } catch (error) {
          console.error('Error checking pin status:', error);
        }
      }
    }
  }, [currentUser, post.id, post.username, post.caption, isOwnPost, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!currentUser) return;
    try {
      const newSaveState = dbService.toggleSavePost({
        user_id: currentUser.id,
        post_id: Number(post.id)
      });
      setIsSaved(newSaveState);
      onClose();
      onPostUpdate?.('save');
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleFollow = () => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        dbService.unfollowUser(currentUser.id, post.username);
      } else {
        dbService.followUser({
          follower_id: currentUser.id,
          following_username: post.username
        });
      }
      setIsFollowing(!isFollowing);
      onClose();
      onPostUpdate?.('follow');
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  };

  const handleEditSave = () => {
    try {
      dbService.updatePostCaption(Number(post.id), editCaption);
      setShowEditModal(false);
      onClose();
      onPostUpdate?.('edit');
    } catch (error) {
      console.error('Error updating caption:', error);
    }
  };

  const handleDelete = () => {
    try {
      dbService.deletePost(Number(post.id));
      setShowDeleteConfirm(false);
      onClose();
      onPostUpdate?.('delete');
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePin = () => {
    try {
      const newPinnedState = dbService.togglePinPost(Number(post.id));
      setIsPinned(newPinnedState);
      onClose();
      onPostUpdate?.('pin');
    } catch (error) {
      console.error('Error pinning post:', error);
    }
  };

  const handleReport = () => {
    alert('Post reported. Thank you for helping keep our community safe.');
    onClose();
  };

  return (
    <>
      {/* Options Modal */}
      {!showEditModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" 
          onClick={onClose}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-white rounded-lg w-80 max-w-sm" 
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="py-2">
            {isOwnPost ? (
              // Own post options
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <Bookmark className="h-4 w-4" />
                  {isSaved ? 'Unsave' : 'Save'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Caption
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePin();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <Pin className="h-4 w-4" />
                  {isPinned ? 'Unpin from Grid' : 'Pin to Grid'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Post
                </button>
              </>
            ) : (
              // Other user's post options
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <Bookmark className="h-4 w-4" />
                  {isSaved ? 'Unsave' : 'Save'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFollow();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isFollowing ? 'Unfollow' : 'Follow'} @{post.username}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReport();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                >
                  <Flag className="h-4 w-4" />
                  Report
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-500"
            >
              Cancel
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Caption Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Caption</h3>
            <Textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={4}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  setEditCaption(post.caption); // Reset on cancel
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostOptionsModal;