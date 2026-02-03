import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, UserMinus, UserPlus, Flag, Edit3, Trash2, Pin, MoreHorizontal } from "lucide-react";
import { dbService } from "@/database";

interface PostOptionsModalProps {
  post: {
    id: string;
    username: string;
    caption: string;
  };
  currentUser?: { id: number; username: string; } | null;
  isOwnPost: boolean;
  onPostUpdate?: (action?: string) => void;
}

const PostOptionsModal = ({ post, currentUser, isOwnPost, onPostUpdate }: PostOptionsModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Load initial states
  useEffect(() => {
    if (currentUser && post.id) {
      dbService.isPostSaved(currentUser.id, Number(post.id)).then(setIsSaved);
      setEditCaption(post.caption);

      if (!isOwnPost) {
        dbService.isFollowingUsername(currentUser.id, post.username).then(setIsFollowing);
      } else {
        // Check if post is pinned
        dbService.getPostById(Number(post.id)).then(postData => {
          setIsPinned(!!postData?.pinned);
        });
      }
    }
  }, [currentUser, post.id, post.username, post.caption, isOwnPost]);

  const handleSave = () => {
    if (!currentUser) return;
    try {
      dbService.toggleSavePost({
        user_id: currentUser.id,
        post_id: Number(post.id)
      }).then(newSaveState => {
        setIsSaved(newSaveState);
        onPostUpdate?.('save');
      });
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
      onPostUpdate?.('follow');
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  };

  const handleEditSave = () => {
    try {
      dbService.updatePostCaption(Number(post.id), editCaption);
      setShowEditModal(false);
      onPostUpdate?.('edit');
    } catch (error) {
      console.error('Error updating caption:', error);
    }
  };

  const handleDelete = () => {
    try {
      dbService.deletePost(Number(post.id));
      setShowDeleteConfirm(false);
      onPostUpdate?.('delete');
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePin = () => {
    try {
      dbService.togglePinPost(Number(post.id)).then(newPinnedState => {
        setIsPinned(newPinnedState);
        onPostUpdate?.('pin');
      });
    } catch (error) {
      console.error('Error pinning post:', error);
    }
  };

  const handleReport = () => {
    alert('Post reported. Thank you for helping keep our community safe.');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isOwnPost ? (
            <>
              <DropdownMenuItem onClick={handleSave}>
                <Bookmark className="mr-2 h-4 w-4" />
                {isSaved ? 'Unsave' : 'Save'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Caption
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePin}>
                <Pin className="mr-2 h-4 w-4" />
                {isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Post
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={handleSave}>
                <Bookmark className="mr-2 h-4 w-4" />
                {isSaved ? 'Unsave' : 'Save'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFollow}>
                {isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isFollowing ? 'Unfollow' : 'Follow'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleReport} className="text-red-600 focus:text-red-600">
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Caption Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                  setEditCaption(post.caption);
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