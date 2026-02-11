import { supabase } from '@/lib/supabase';

import {
    User, UserPublic, Post, PostWithUser, CreatePostData, CreateLikeData, CreateCommentData,
    CommentWithUser, Notification, CreateConversationData, ConversationWithUsers,
    MessageWithSender, CreateMessageData, CreateFollowData, LoginData, AuthResult,
    CreateSavedPostData, Conversation, UpdateProfileData,
    Confession, ConfessionLike, ConfessionComment, ConfessionCommentWithUser, CreateConfessionData,
    CreateConfessionLikeData, CreateConfessionCommentData
} from './types';

export class DatabaseService {

    async syncUserWithSupabase(): Promise<{ user: User | null; isNew: boolean }> {
        console.log("Syncing user with Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            console.log("No session found.");
            return { user: null, isNew: false };
        }

        const authUser = session.user;
        console.log("Session user found:", authUser.email);

        // Fetch user profile linked to this Auth ID
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authUser.id) // Ensure we match by Auth ID for security
            .single();

        if (error || !userProfile) {
            console.error("Error fetching user profile:", error);
            // In a correct setup with Triggers, this should rarely happen for new users
            // unless the trigger failed.
            return { user: null, isNew: false };
        }

        console.log("User profile found:", userProfile);
        return { user: userProfile as User, isNew: false };
    }

    async getEmailByUsername(username: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('users')
            .select('email')
            .eq('username', username)
            .single();

        if (error || !data) return null;
        return data.email;
    }



    async getUserById(id: number): Promise<User | null> {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        return data;
    }

    async getUserByUsername(username: string): Promise<User | null> {
        const { data } = await supabase.from('users').select('*').eq('username', username).single();
        return data;
    }

    async getAllUsers(): Promise<User[]> {
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        return data || [];
    }

    async getAllPosts(): Promise<PostWithUser[]> {
        const { data, error } = await supabase
            .from('posts')
            .select('*, users(username, avatar), likes(count), comments(count)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            return [];
        }

        return (data || []).map((post: any) => ({
            ...post,
            username: post.users?.username,
            user_avatar: post.users?.avatar,
            likes_count: post.likes?.[0]?.count || 0,
            comments_count: post.comments?.[0]?.count || 0
        }));
    }

    async createPost(postData: CreatePostData): Promise<PostWithUser | null> {
        // Ensure image is set (use first of images if available) and images array is populated
        const mainImage = postData.image || (postData.images && postData.images.length > 0 ? postData.images[0] : "");
        const imagesList = postData.images && postData.images.length > 0 ? postData.images : [mainImage];

        const { data, error } = await supabase.from('posts').insert({
            user_id: postData.user_id,
            caption: postData.caption,
            image: mainImage,
            images: imagesList
        }).select('*, users(username, avatar)').single();
        if (error) {
            console.error("Error creating post in Supabase:", error);
            return null;
        }
        return { ...data, username: data.users?.username, user_avatar: data.users?.avatar };
    }

    async toggleLike(userId: number, postId: number): Promise<boolean> {
        const { data: existing } = await supabase.from('likes').select('id').match({ user_id: userId, post_id: postId }).single();
        const { data: post } = await supabase.from('posts').select('user_id, likes_count').eq('id', postId).single();

        if (existing) {
            await supabase.from('likes').delete().eq('id', existing.id);
            // Decrement likes_count
            if (post) {
                await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', postId);
            }

            // Remove notification if it exists (and we have the post owner)
            // Remove notification if it exists (and we have the post owner)
            if (post) {
                const { error: deleteError } = await supabase.from('notifications')
                    .delete()
                    .eq('user_id', post.user_id)
                    .eq('type', 'like')
                    .eq('from_user_id', userId)
                    .eq('post_id', postId);

                if (deleteError) console.error("Error deleting like notification:", deleteError);
            }
            return false;
        } else {
            await supabase.from('likes').insert({ user_id: userId, post_id: postId });
            // Increment likes_count
            if (post) {
                await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', postId);
            }

            // Notification logic...
            if (post && post.user_id !== userId) {
                await this.createNotification({
                    user_id: post.user_id, type: 'like', from_user_id: userId, post_id: postId, message: 'liked your post', read: false
                });
            }
            return true;
        }
    }

    async isPostLikedByUser(userId: number, postId: number): Promise<boolean> {
        const { data } = await supabase.from('likes').select('id').match({ user_id: userId, post_id: postId }).single();
        return !!data;
    }

    async getPostWithUserById(postId: number): Promise<PostWithUser | null> {
        const { data } = await supabase.from('posts').select('*, users(username, avatar)').eq('id', postId).single();
        if (!data) return null;
        return { ...data, username: data.users?.username, user_avatar: data.users?.avatar };
    }

    async isPostSaved(userId: number, postId: number): Promise<boolean> {
        const { data, error } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();

        if (error) {
            console.error('Error checking if post is saved:', error);
            return false;
        }

        return !!data;
    }

    async toggleSavePost(data: CreateSavedPostData): Promise<boolean> {
        // First check if it exists
        const { data: existing, error: checkError } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('user_id', data.user_id)
            .eq('post_id', data.post_id)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing saved post:', checkError);
            // Assume not saved if error, or handle gracefully? 
            // Better to try inserting if we can't read might be permission issue, but let's try standard flow.
        }

        if (existing) {
            const { error: deleteError } = await supabase
                .from('saved_posts')
                .delete()
                .eq('id', existing.id);

            if (deleteError) {
                console.error('Error deleting saved post:', deleteError);
                // If delete fails, return true (still saved)
                return true;
            }
            return false;
        } else {
            const { error: insertError } = await supabase
                .from('saved_posts')
                .insert({ user_id: data.user_id, post_id: data.post_id });

            if (insertError) {
                console.error('Error inserting saved post:', insertError);
                return false;
            }
            return true;
        }
    }

    async updateUsername(userId: number, newUsername: string): Promise<boolean> {
        const { error } = await supabase
            .from('users')
            .update({ username: newUsername })
            .eq('id', userId);

        if (error) {
            console.error("Error updating username:", error);
            return false;
        }
        return true;
    }

    async updateUserProfile(userId: number, data: UpdateProfileData): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('users')
            .update({
                username: data.username,
                display_name: data.display_name,
                bio: data.bio,
                avatar: data.avatar,
                semester: data.semester,
                department: data.department
            })
            .eq('id', userId);

        if (error) {
            console.error("Error updating profile:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }



    async checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (error) {
            console.error("Error checking username:", error);
            return { available: false, error: error.message };
        }

        return { available: !data };
    }

    async getPostsByUser(userId: number): Promise<PostWithUser[]> {
        const { data } = await supabase
            .from('posts')
            .select('*, users(username, avatar), likes(count), comments(count)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        return (data || []).map((post: any) => ({
            ...post,
            username: post.users?.username,
            user_avatar: post.users?.avatar,
            likes_count: post.likes?.[0]?.count || 0,
            comments_count: post.comments?.[0]?.count || 0
        }));
    }

    async isFollowing(followerId: number, followingId: number): Promise<boolean> {
        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .maybeSingle();
        return !!data;
    }

    async toggleFollow(data: CreateFollowData): Promise<boolean> {
        const { data: existing } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', data.follower_id)
            .eq('following_id', data.following_id)
            .maybeSingle();

        if (existing) {
            await supabase.from('follows').delete().eq('id', existing.id);

            // Remove relevant notification
            // Remove relevant notification
            const { error: deleteError } = await supabase.from('notifications')
                .delete()
                .eq('user_id', data.following_id)
                .eq('type', 'follow')
                .eq('from_user_id', data.follower_id);

            if (deleteError) {
                console.error("Error deleting notification:", deleteError);
            }

            return false;
        } else {
            await supabase.from('follows').insert({ follower_id: data.follower_id, following_id: data.following_id });

            // Create notification for the user being followed
            await this.createNotification({
                user_id: data.following_id, // The user receiving the notification
                type: 'follow',
                from_user_id: data.follower_id,
                message: 'started following you',
                read: false
            });

            return true;
        }
    }

    async getFollowerCount(userId: number): Promise<number> {
        const { count } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', userId);
        return count || 0;
    }

    async getFollowingCount(userId: number): Promise<number> {
        const { count } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId);
        return count || 0;
    }

    async getFollowersList(userId: number): Promise<UserPublic[]> {
        const { data } = await supabase
            .from('follows')
            .select('follower_id, users!follows_follower_id_fkey(*)')
            .eq('following_id', userId);

        return (data || []).map((item: any) => {
            const { password, ...user } = item.users;
            return user as UserPublic;
        });
    }

    async getFollowingList(userId: number): Promise<UserPublic[]> {
        const { data } = await supabase
            .from('follows')
            .select('following_id, users!follows_following_id_fkey(*)')
            .eq('follower_id', userId);

        return (data || []).map((item: any) => {
            const { password, ...user } = item.users;
            return user as UserPublic;
        });
    }

    // Notification methods
    async getUserNotifications(userId: number): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                from_user:users!notifications_from_user_id_fkey(username, avatar)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data || [];
    }

    async getUnreadNotificationCount(userId: number): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error counting unread notifications:', error);
            return 0;
        }

        return count || 0;
    }

    async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .insert(notification);

        if (error) {
            console.error('Error creating notification:', error);
        } else {
            console.log('Notification created successfully');
        }
    }

    async markNotificationsAsRead(userId: number): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    // Messaging methods
    async getUserConversations(userId: number): Promise<ConversationWithUsers[]> {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                participant1:users!conversations_participant1_id_fkey(id, username, avatar),
                participant2:users!conversations_participant2_id_fkey(id, username, avatar)
            `)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }

        // Transform data and calculate unread counts
        const conversations = await Promise.all((data || []).map(async (conv: any) => {
            const unreadCount = await this.getUnreadMessageCountForConversation(conv.id, userId);

            return {
                id: conv.id,
                participant1_id: conv.participant1_id,
                participant2_id: conv.participant2_id,
                participant1_username: conv.participant1?.username || '',
                participant1_avatar: conv.participant1?.avatar,
                participant2_username: conv.participant2?.username || '',
                participant2_avatar: conv.participant2?.avatar,
                last_message_id: conv.last_message_id,
                last_message_at: conv.last_message_at,
                last_message_content: conv.last_message_content,
                created_at: conv.created_at,
                updated_at: conv.updated_at,
                unread_count: unreadCount
            };
        }));

        return conversations;
    }

    async searchConversations(userId: number, searchTerm: string): Promise<ConversationWithUsers[]> {
        const allConversations = await this.getUserConversations(userId);
        const searchLower = searchTerm.toLowerCase();

        return allConversations.filter(conv => {
            const otherUsername = conv.participant1_id === userId
                ? conv.participant2_username
                : conv.participant1_username;
            return otherUsername.toLowerCase().includes(searchLower);
        });
    }

    async getConversationMessages(conversationId: number): Promise<MessageWithSender[]> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(username, avatar)
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return (data || []).map((msg: any) => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            sender_username: msg.sender?.username || '',
            sender_avatar: msg.sender?.avatar,
            content: msg.content,
            message_type: msg.message_type,
            media_url: msg.media_url,
            is_read: msg.is_read,
            created_at: msg.created_at,
            updated_at: msg.updated_at
        }));
    }

    async createMessage(messageData: CreateMessageData): Promise<MessageWithSender | null> {
        // Insert the message
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                conversation_id: messageData.conversation_id,
                sender_id: messageData.sender_id,
                content: messageData.content,
                message_type: messageData.message_type || 'text',
                media_url: messageData.media_url
            })
            .select(`
                *,
                sender:users!messages_sender_id_fkey(username, avatar)
            `)
            .single();

        if (messageError || !message) {
            console.error('Error creating message:', messageError);
            return null;
        }

        // Update conversation's last message info
        await supabase
            .from('conversations')
            .update({
                last_message_id: message.id,
                last_message_at: message.created_at,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageData.conversation_id);

        return {
            id: message.id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            sender_username: message.sender?.username || '',
            sender_avatar: message.sender?.avatar,
            content: message.content,
            message_type: message.message_type,
            media_url: message.media_url,
            is_read: message.is_read,
            created_at: message.created_at,
            updated_at: message.updated_at
        };
    }

    async getConversationBetweenUsers(user1Id: number, user2Id: number): Promise<Conversation | null> {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(participant1_id.eq.${user1Id},participant2_id.eq.${user2Id}),and(participant1_id.eq.${user2Id},participant2_id.eq.${user1Id})`)
            .maybeSingle();

        if (error) {
            console.error('Error finding conversation:', error);
            return null;
        }

        return data;
    }

    async createConversation(convData: CreateConversationData): Promise<Conversation | null> {
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                participant1_id: convData.participant1_id,
                participant2_id: convData.participant2_id,
                last_message_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating conversation:', error);
            return null;
        }

        return data;
    }

    async markConversationMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', userId);

        if (error) {
            console.error('Error marking messages as read:', error);
            return false;
        }

        return true;
    }

    async getUnreadMessageCount(userId: number): Promise<number> {
        // Get all conversations for this user
        const { data: conversations } = await supabase
            .from('conversations')
            .select('id')
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

        if (!conversations || conversations.length === 0) return 0;

        const conversationIds = conversations.map(c => c.id);

        // Count unread messages across all conversations where user is NOT the sender
        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .eq('is_read', false)
            .neq('sender_id', userId);

        if (error) {
            console.error('Error counting unread messages:', error);
            return 0;
        }

        return count || 0;
    }

    private async getUnreadMessageCountForConversation(conversationId: number, userId: number): Promise<number> {
        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', userId);

        if (error) {
            console.error('Error counting unread messages for conversation:', error);
            return 0;
        }

        return count || 0;
    }

    // Comment methods
    async getPostComments(postId: number): Promise<CommentWithUser[]> {
        // 1. Fetch Comments
        const { data: comments, error: commentsError } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (commentsError) {
            console.error('Error fetching comments:', commentsError);
            return [];
        }

        if (!comments || comments.length === 0) return [];

        // 2. Fetch Users
        const userIds = [...new Set(comments.map(c => c.user_id))];
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, avatar')
            .in('id', userIds);

        if (usersError) {
            console.error('Error fetching comment users:', usersError);
            // Return comments without user info as fallback? Or empty? 
            // Better to show content than nothing.
        }

        // 3. Merge Data
        const userMap = new Map(users?.map(u => [u.id, u]) || []);

        const mappedComments = comments.map(comment => {
            const user = userMap.get(comment.user_id);
            return {
                id: comment.id,
                user_id: comment.user_id,
                post_id: comment.post_id,
                username: user?.username || 'Unknown User',
                user_avatar: user?.avatar,
                content: comment.content,
                created_at: comment.created_at,
                updated_at: comment.updated_at
            };
        });

        console.log('Final Mapped Comments:', mappedComments);
        return mappedComments;
    }

    async deleteComment(commentId: number): Promise<boolean> {
        // Fetch comment details details first
        const { data: comment } = await supabase
            .from('comments')
            .select('user_id, post_id, content')
            .eq('id', commentId)
            .single();

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error);
            return false;
        }

        // Delete associated notification
        if (comment) {
            // We need to find the post owner to know whose notification to delete
            const { data: post } = await supabase
                .from('posts')
                .select('user_id')
                .eq('id', comment.post_id)
                .single();

            if (post) {
                // Delete the exact notification using comment_id
                console.log(`Attempting to delete notification for comment_id=${commentId}`);

                const { error: notificationError, count } = await supabase
                    .from('notifications')
                    .delete({ count: 'exact' })
                    .match({
                        comment_id: commentId
                    });

                if (notificationError) {
                    console.error('Error deleting comment notification:', notificationError);
                } else {
                    console.log(`Deleted ${count} notifications`);
                }
            }
        }

        return true;
    }

    async createComment(commentData: CreateCommentData): Promise<CommentWithUser | null> {
        // Insert the comment
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .insert({
                user_id: commentData.user_id,
                post_id: commentData.post_id,
                content: commentData.content
            })
            .select(`
                *,
                user:users!comments_user_id_fkey(username, avatar)
            `)
            .single();

        if (commentError || !comment) {
            console.error('Error creating comment:', commentError);
            return null;
        }

        // Fetch post owner to create notification
        const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', commentData.post_id)
            .single();

        if (post && post.user_id !== commentData.user_id) {
            const truncatedContent = commentData.content.length > 50
                ? commentData.content.substring(0, 50) + "..."
                : commentData.content;

            console.log(`Creating notification for user ${post.user_id} from ${commentData.user_id}`);

            await this.createNotification({
                user_id: post.user_id,
                type: 'comment',
                from_user_id: commentData.user_id,
                post_id: commentData.post_id,
                comment_id: comment.id,
                message: `commented: ${truncatedContent}`,
                read: false
            });
        }

        return {
            id: comment.id,
            user_id: comment.user_id,
            post_id: comment.post_id,
            username: comment.user?.username || '',
            user_avatar: comment.user?.avatar,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at
        };
    }

    // Helper methods
    formatTimestamp(timestamp: string): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    }

    async initialize(): Promise<void> {
        // No-op for Supabase as it's cloud-based
        console.log("Database initialized");
        return Promise.resolve();
    }

    // Saved Confessions methods
    async isConfessionSaved(userId: number, confessionId: number): Promise<boolean> {
        const { data } = await supabase
            .from('saved_confessions')
            .select('id')
            .match({ user_id: userId, confession_id: confessionId })
            .single();
        return !!data;
    }

    async toggleConfessionSave(userId: number, confessionId: number): Promise<boolean> {
        const { data: existing } = await supabase
            .from('saved_confessions')
            .select('id')
            .match({ user_id: userId, confession_id: confessionId })
            .single();

        if (existing) {
            await supabase.from('saved_confessions').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('saved_confessions').insert({ user_id: userId, confession_id: confessionId });
            return true;
        }
    }

    async getSavedConfessions(userId: number): Promise<Confession[]> {
        const { data, error } = await supabase
            .from('saved_confessions')
            .select(`
                confession_id,
                confession:confessions (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved confessions:', error);
            return [];
        }

        // Extract confessions from the join
        return (data || [])
            .map((item: any) => item.confession)
            .filter((confession: any) => confession !== null);
    }

    async getSavedPosts(userId: number): Promise<PostWithUser[]> {
        const { data, error } = await supabase
            .from('saved_posts')
            .select(`
                post_id,
                posts:posts (*, users(username, avatar), likes(count), comments(count))
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved posts:', error);
            return [];
        }

        return (data || []).map((item: any) => {
            const post = item.posts;
            if (!post) return null;
            return {
                ...post,
                username: post.users?.username,
                user_avatar: post.users?.avatar,
                likes_count: post.likes?.[0]?.count || 0,
                comments_count: post.comments?.[0]?.count || 0
            };
        }).filter((post: any) => post !== null);
    }

    async getLastSeenMessageId(conversationId: number, userId: number): Promise<number | null> {
        const { data, error } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('sender_id', userId)
            .eq('is_read', true)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error getting last seen message:', error);
            return null;
        }

        return data?.id || null;
    }

    // Confession Methods
    async getConfessions(): Promise<Confession[]> {
        const { data, error } = await supabase
            .from('confessions')
            .select('id, content, likes_count, comments_count, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching confessions:', error);
            return [];
        }
        return data || [];
    }

    async getUserConfessions(userId: number): Promise<Confession[]> {
        const { data, error } = await supabase
            .from('confessions')
            .select('*') // We can select all for the owner
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user confessions:', error);
            return [];
        }
        return data || [];
    }

    async verifyPassword(email: string, password: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error || !data.user) {
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Error updating password:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/change-password`,
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Error sending reset password email:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteConfession(confessionId: number): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('confessions')
            .delete()
            .eq('id', confessionId);

        if (error) {
            console.error('Error deleting confession:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    async createConfession(data: CreateConfessionData): Promise<Confession | null> {
        const { data: confession, error } = await supabase
            .from('confessions')
            .insert({
                user_id: data.user_id,
                content: data.content
            })
            .select('*')
            .single();

        if (error) {
            console.error('Error creating confession:', error);
            return null;
        }
        return confession;
    }

    async isConfessionLiked(userId: number, confessionId: number): Promise<boolean> {
        const { data } = await supabase
            .from('confession_likes')
            .select('id')
            .match({ user_id: userId, confession_id: confessionId })
            .maybeSingle(); // Use maybeSingle to avoid 406 error if not found
        return !!data;
    }

    async toggleConfessionLike(userId: number, confessionId: number): Promise<boolean> {
        const { data: existing } = await supabase
            .from('confession_likes')
            .select('id')
            .match({ user_id: userId, confession_id: confessionId })
            .maybeSingle();

        if (existing) {
            await supabase.from('confession_likes').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('confession_likes').insert({ user_id: userId, confession_id: confessionId });
            return true;
        }
    }

    async getConfessionComments(confessionId: number): Promise<ConfessionCommentWithUser[]> {
        const { data, error } = await supabase
            .from('confession_comments')
            .select(`
                *,
                user:users (
                    username,
                    avatar
                )
            `)
            .eq('confession_id', confessionId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching confession comments:', error);
            return [];
        }

        // Supabase returns nested data, we need to cast it safely
        return (data as unknown as ConfessionCommentWithUser[]) || [];
    }

    async createConfessionComment(data: CreateConfessionCommentData): Promise<ConfessionComment | null> {
        const { data: comment, error } = await supabase
            .from('confession_comments')
            .insert({
                user_id: data.user_id,
                confession_id: data.confession_id,
                content: data.content
            })
            .select('*')
            .single();

        if (error) {
            console.error('Error creating confession comment:', error);
            return null;
        }

        return comment;
    }

    async deleteConfessionComment(commentId: number): Promise<boolean> {
        const { error } = await supabase
            .from('confession_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting confession comment:', error);
            return false;
        }
        return true;
    }
    // Missing methods for PostOptionsModal
    async isFollowingUsername(followerId: number, followingUsername: string): Promise<boolean> {
        const { data: user } = await supabase.from('users').select('id').eq('username', followingUsername).single();
        if (!user) return false;
        return this.isFollowing(followerId, user.id);
    }

    async followUser(data: { follower_id: number; following_username: string }): Promise<boolean> {
        const { data: user } = await supabase.from('users').select('id').eq('username', data.following_username).single();
        if (!user) return false;
        return this.toggleFollow({ follower_id: data.follower_id, following_id: user.id });
    }

    async unfollowUser(followerId: number, followingUsername: string): Promise<boolean> {
        const { data: user } = await supabase.from('users').select('id').eq('username', followingUsername).single();
        if (!user) return false;
        return this.toggleFollow({ follower_id: followerId, following_id: user.id });
    }

    async getPostById(postId: number): Promise<Post | null> {
        const { data } = await supabase.from('posts').select('*').eq('id', postId).single();
        return data;
    }

    async updatePostCaption(postId: number, newCaption: string): Promise<boolean> {
        const { error } = await supabase.from('posts').update({ caption: newCaption }).eq('id', postId);
        if (error) {
            console.error("Error updating caption:", error);
            return false;
        }
        return true;
    }

    async deletePost(postId: number): Promise<boolean> {
        // Delete related data first (likes, comments, saved_posts are usually cascaded but good to be safe if not)
        // With Supabase cascade delete on foreign keys, deleting post should be enough if configured
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) {
            console.error("Error deleting post:", error);
            return false;
        }
        return true;
    }

    async togglePinPost(postId: number): Promise<boolean> {
        const { data: post } = await supabase.from('posts').select('pinned').eq('id', postId).single();
        if (!post) return false;

        const newPinned = !post.pinned;
        // Depending on DB schema, pinned might be boolean or int (0/1). 
        // Based on types.ts it is boolean? But earlier code checked === 1.
        // I will assume boolean in types, but DB might be int. 
        // Let's check schemas safely.

        const { error } = await supabase.from('posts').update({ pinned: newPinned }).eq('id', postId);
        if (error) {
            console.error("Error pinning post:", error);
            return false;
        }
        return newPinned;
    }
}

export const dbService = new DatabaseService();