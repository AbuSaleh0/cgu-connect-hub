import { supabase } from '@/lib/supabase';
import {
    User,
    UserPublic,
    Post,
    PostWithUser,
    Like,
    Comment,
    CommentWithUser,
    Follow,
    Conversation,
    ConversationWithUsers,
    Message,
    MessageWithSender,
    CreateConversationData,
    CreateMessageData,
    Notification,
    SavedPost,
    CreateUserData,
    CreatePostData,
    CreateCommentData,
    CreateLikeData,
    CreateFollowData,
    CreateNotificationData,
    CreateSavedPostData,
    LoginData,
    AuthResult,
    OTPCode,
    CreateOTPData,
    VerifyOTPData,
    GoogleUserData,
    UpdateProfileData
} from './types';

class DatabaseService {

    // ===== USER OPERATIONS =====

    async createUser(userData: CreateUserData): Promise<User> {
        const { data, error } = await supabase
            .from('users')
            .insert({
                username: userData.username,
                email: userData.email,
                password: userData.password,
                avatar: userData.avatar || '',
                displayName: userData.displayName || userData.username,
                bio: userData.bio || '',
                semester: userData.semester || '',
                department: userData.department || '',
                profileSetupComplete: userData.profileSetupComplete ? true : false,
                passwordSetupComplete: userData.passwordSetupComplete ? true : false
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getUserById(id: number): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async getUserByUsername(username: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) return null;
        return data;
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) return null;
        return data;
    }

    async getAllUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return [];
        return data;
    }

    // ===== AUTH OPERATIONS =====

    async login(credentials: LoginData): Promise<AuthResult> {
        try {
            // 1. Try to find user by email or username
            let { data: user, error } = await supabase
                .from('users')
                .select('*')
                .or(`email.eq.${credentials.email},username.eq.${credentials.email}`)
                .single();

            if (error || !user) {
                return { success: false, error: 'User not found' };
            }

            // 2. Verify password (In a real app, use bcrypt. Here we assume plain text or handled by Supabase Auth if integrated)
            // Since we are migrating from a system that might have stored passwords plainly or we don't have the hashing lib here:
            if (user.password !== credentials.password) {
                return { success: false, error: 'Invalid password' };
            }

            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    }

    async loginWithGoogle(googleUser: GoogleUserData): Promise<AuthResult> {
        // This is now handled mostly by Supabase Auth in the frontend, 
        // but we still need to sync/check our 'users' table.

        // Check if user exists in our DB
        const user = await this.getUserByEmail(googleUser.email);

        if (user) {
            return { success: true, user };
        } else {
            return { success: false, error: 'User not found. Please sign up.' };
        }
    }

    async signupWithGoogle(googleUser: GoogleUserData): Promise<AuthResult> {
        try {
            // Check if user already exists
            const existingUser = await this.getUserByEmail(googleUser.email);
            if (existingUser) {
                return { success: true, user: existingUser };
            }

            // Create new user
            const username = googleUser.email.split('@')[0];
            const newUser = await this.createUser({
                username,
                email: googleUser.email,
                password: '', // No password for Google auth users initially
                avatar: googleUser.picture,
                displayName: googleUser.name,
                profileSetupComplete: false,
                passwordSetupComplete: false
            });

            return { success: true, user: newUser };
        } catch (error) {
            console.error('Google signup error:', error);
            return { success: false, error: 'Failed to create account' };
        }
    }

    // ===== POST OPERATIONS =====

    async createPost(postData: CreatePostData): Promise<Post> {
        let mediaUrl = postData.image; // Default to what was passed (could be string)

        // Handle File upload if image is a File object (or Blob)
        // Note: In TypeScript, CreatePostData.image is string, but we might pass a File in practice or need to change the type.
        // Assuming the caller handles the upload or passes a base64 string if we stick to the old way, 
        // BUT the requirement says: "If postData.image is a File object, upload it..."
        // We'll check if it's a File object (requires type assertion or changing type definition, 
        // but here we'll assume it's passed as 'any' or we handle the upload logic here if possible).

        // Since we can't easily check `instanceof File` in strict Node env (though this is frontend code),
        // we'll assume the caller might pass a file object in a property or we handle it if it's a blob.
        // However, keeping strictly to the requested signature:

        // If the image string starts with 'data:', it's base64. We should convert to blob and upload.
        // Or if the caller passes a File object cast as string.

        // For this implementation, let's assume the frontend passes the File object in a separate way 
        // OR we detect if `postData.image` is actually a File (if type checking allows).
        // Let's try to handle the upload if it looks like a file or base64.

        // SIMPLIFIED STRATEGY: 
        // We will assume `postData.image` might be a File object (casted to any) or a base64 string.

        const imageFile = (postData as any).imageFile || (postData.image instanceof Blob ? postData.image : null);

        if (imageFile) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(fileName);

            mediaUrl = publicUrl;
        }

        const { data, error } = await supabase
            .from('posts')
            .insert({
                user_id: postData.user_id,
                media_url: mediaUrl,
                caption: postData.caption || '',
                media_type: 'image' // Defaulting to image for now
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getPostById(id: number): Promise<Post | null> {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async getAllPosts(): Promise<PostWithUser[]> {
        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        users (
          username,
          avatar
        )
      `)
            .order('created_at', { ascending: false });

        if (error) return [];

        // Map the result to match PostWithUser interface
        return data.map((post: any) => ({
            ...post,
            username: post.users?.username,
            user_avatar: post.users?.avatar
        }));
    }

    async getPostsByUser(userId: number): Promise<PostWithUser[]> {
        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        users (
          username,
          avatar
        )
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return [];

        return data.map((post: any) => ({
            ...post,
            username: post.users?.username,
            user_avatar: post.users?.avatar
        }));
    }

    // ===== LIKE OPERATIONS =====

    async toggleLike(userId: number, postId: number): Promise<boolean> {
        // Check if like exists
        const { data: existingLike } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (existingLike) {
            // Unlike
            await supabase
                .from('likes')
                .delete()
                .eq('user_id', userId)
                .eq('post_id', postId);
            return false;
        } else {
            // Like
            await supabase
                .from('likes')
                .insert({ user_id: userId, post_id: postId });
            return true;
        }
    }

    async hasUserLikedPost(userId: number, postId: number): Promise<boolean> {
        const { data, error } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        return !!data && !error;
    }

    // ===== COMMENT OPERATIONS =====

    async createComment(commentData: CreateCommentData): Promise<Comment> {
        const { data, error } = await supabase
            .from('comments')
            .insert({
                user_id: commentData.user_id,
                post_id: commentData.post_id,
                content: commentData.content
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getCommentsByPostId(postId: number): Promise<CommentWithUser[]> {
        const { data, error } = await supabase
            .from('comments')
            .select(`
        *,
        users (
          username,
          avatar
        )
      `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) return [];

        return data.map((comment: any) => ({
            ...comment,
            username: comment.users?.username,
            user_avatar: comment.users?.avatar
        }));
    }

    // ===== FOLLOW OPERATIONS =====

    async followUser(followerId: number, followingId: number): Promise<void> {
        await supabase
            .from('follows')
            .insert({ follower_id: followerId, following_id: followingId });
    }

    async unfollowUser(followerId: number, followingId: number): Promise<void> {
        await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
    }

    async isFollowing(followerId: number, followingId: number): Promise<boolean> {
        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();

        return !!data && !error;
    }

    async getFollowersCount(userId: number): Promise<number> {
        const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);

        return count || 0;
    }

    async getFollowingCount(userId: number): Promise<number> {
        const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);

        return count || 0;
    }

    // ===== NOTIFICATION OPERATIONS =====

    async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: notificationData.user_id,
                type: notificationData.type,
                from_user_id: notificationData.from_user_id,
                post_id: notificationData.post_id,
                message: notificationData.message,
                read: false
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getNotifications(userId: number): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return [];
        return data;
    }

    async getUnreadNotificationCount(userId: number): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        return count || 0;
    }

    async markNotificationAsRead(notificationId: number): Promise<void> {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
    }

    async markAllNotificationsAsRead(userId: number): Promise<void> {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);
    }

    // ===== CONVERSATION & MESSAGE OPERATIONS =====

    async getConversations(userId: number): Promise<ConversationWithUsers[]> {
        // This is complex in Supabase/SQL without a view or join.
        // We need conversations where participant1 or participant2 is the user.
        const { data, error } = await supabase
            .from('conversations')
            .select(`
        *,
        p1:users!participant1_id(username, avatar, displayName),
        p2:users!participant2_id(username, avatar, displayName)
      `)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .order('updated_at', { ascending: false });

        if (error) return [];

        return data.map((conv: any) => {
            const otherUser = conv.participant1_id === userId ? conv.p2 : conv.p1;
            return {
                ...conv,
                other_user_id: conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id,
                other_username: otherUser.username,
                other_user_avatar: otherUser.avatar,
                other_display_name: otherUser.displayName
            };
        });
    }

    async getMessages(conversationId: number): Promise<MessageWithSender[]> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        users (
          username,
          avatar
        )
      `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) return [];

        return data.map((msg: any) => ({
            ...msg,
            sender_username: msg.users?.username,
            sender_avatar: msg.users?.avatar
        }));
    }

    async sendMessage(messageData: CreateMessageData): Promise<Message> {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: messageData.conversation_id,
                sender_id: messageData.sender_id,
                content: messageData.content,
                message_type: messageData.message_type || 'text',
                media_url: messageData.media_url
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async createConversation(data: CreateConversationData): Promise<Conversation> {
        // Check if exists
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(participant1_id.eq.${data.participant1_id},participant2_id.eq.${data.participant2_id}),and(participant1_id.eq.${data.participant2_id},participant2_id.eq.${data.participant1_id})`)
            .single();

        if (existing) return existing;

        const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
                participant1_id: data.participant1_id,
                participant2_id: data.participant2_id
            })
            .select()
            .single();

        if (error) throw error;
        return newConv;
    }

    // ===== SAVED POSTS =====

    async toggleSavePost(userId: number, postId: number): Promise<boolean> {
        const { data: existing } = await supabase
            .from('saved_posts')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (existing) {
            await supabase.from('saved_posts').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId });
            return true;
        }
    }

    async getSavedPosts(userId: number): Promise<PostWithUser[]> {
        const { data, error } = await supabase
            .from('saved_posts')
            .select(`
        post_id,
        posts (
          *,
          users (username, avatar)
        )
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return [];

        return data.map((item: any) => ({
            ...item.posts,
            username: item.posts.users?.username,
            user_avatar: item.posts.users?.avatar
        }));
    }
}

export const dbService = new DatabaseService();
