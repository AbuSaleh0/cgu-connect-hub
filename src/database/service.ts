import { supabase } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
    User, PostWithUser, CreatePostData, CreateLikeData, CreateCommentData,
    CommentWithUser, Notification, CreateConversationData, ConversationWithUsers,
    MessageWithSender, CreateMessageData, CreateFollowData, LoginData, AuthResult,
    CreateSavedPostData, Conversation
} from './types';

export class DatabaseService {

    async syncUserWithSupabase(): Promise<{ user: User | null; isNew: boolean }> {
        console.log("Syncing user with Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error getting session:", sessionError);
            return { user: null, isNew: false };
        }

        if (!session?.user) {
            console.log("No session user found.");
            return { user: null, isNew: false };
        }

        const authUser = session.user;
        const email = authUser.email!.toLowerCase();
        console.log("Session user found:", email);

        // Enforce college email domain
        if (!email.endsWith('@cgu-odisha.ac.in')) {
            console.error("Invalid email domain:", email);
            await supabase.auth.signOut();
            return { user: null, isNew: false };
        }

        const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error("Error looking up user:", lookupError);
        }

        if (existingUser) {
            console.log("Existing user found in DB:", existingUser);
            return { user: existingUser as User, isNew: false };
        }

        console.log("User not found in DB, creating new user...");
        const username = email.split('@')[0].replace(/[^a-z0-9]/g, '_');
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: email,
                username: username,
                password: '',
                display_name: authUser.user_metadata.full_name || username,
                avatar: authUser.user_metadata.avatar_url || '',
                password_setup_complete: false
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating user:", error);
            return { user: null, isNew: false };
        }

        console.log("New user created successfully:", newUser);
        return { user: newUser as User, isNew: true };
    }

    async login(credentials: LoginData): Promise<AuthResult> {
        const { data, error } = await supabase.from('users').select('*').eq('email', credentials.email).single();
        if (error || !data) return { success: false, error: 'User not found' };
        if (!data.password) return { success: false, error: 'Please login using Google OAuth' };
        const isValidPassword = await verifyPassword(credentials.password, data.password);
        if (!isValidPassword) return { success: false, error: 'Invalid password' };
        return { success: true, user: data };
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
        const { data } = await supabase.from('posts').select('*, users(username, avatar)').order('created_at', { ascending: false });
        return (data || []).map((post: any) => ({ ...post, username: post.users?.username, user_avatar: post.users?.avatar }));
    }

    async createPost(postData: CreatePostData): Promise<PostWithUser | null> {
        const { data, error } = await supabase.from('posts').insert({
            user_id: postData.user_id, caption: postData.caption, image: postData.image
        }).select('*, users(username, avatar)').single();
        if (error) return null;
        return { ...data, username: data.users?.username, user_avatar: data.users?.avatar };
    }

    async toggleLike(userId: number, postId: number): Promise<boolean> {
        const { data: existing } = await supabase.from('likes').select('id').match({ user_id: userId, post_id: postId }).single();
        if (existing) {
            await supabase.from('likes').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('likes').insert({ user_id: userId, post_id: postId });
            return true;
        }
    }

    async isPostSaved(userId: number, postId: number): Promise<boolean> {
        const { data } = await supabase
            .from('saved_posts')
            .select('id')
            .match({ user_id: userId, post_id: postId })
            .single();
        return !!data;
    }

    async toggleSavePost(data: CreateSavedPostData): Promise<boolean> {
        const { data: existing } = await supabase
            .from('saved_posts')
            .select('id')
            .match({ user_id: data.user_id, post_id: data.post_id })
            .single();

        if (existing) {
            await supabase.from('saved_posts').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('saved_posts').insert({ user_id: data.user_id, post_id: data.post_id });
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

    async updateUserProfile(userId: number, data: any): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('users')
            .update({
                username: data.username,
                display_name: data.displayName,
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

    async updatePassword(userId: number, password: string): Promise<{ success: boolean; error?: string }> {
        // Hash the password before storing
        const hashedPassword = await hashPassword(password);
        const { error } = await supabase
            .from('users')

            .update({ password: hashedPassword, password_setup_complete: true })
            .eq('id', userId);

        if (error) {
            console.error("Error updating password:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    async setupPassword(userId: number, password: string): Promise<{ success: boolean; error?: string }> {
        return this.updatePassword(userId, password);
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
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                user:users!comments_user_id_fkey(username, avatar)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }

        return (data || []).map((comment: any) => ({
            id: comment.id,
            user_id: comment.user_id,
            post_id: comment.post_id,
            username: comment.user?.username || '',
            user_avatar: comment.user?.avatar,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at
        }));
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

        // Increment the post's comment count
        const { data: post } = await supabase
            .from('posts')
            .select('comments_count')
            .eq('id', commentData.post_id)
            .single();

        if (post) {
            await supabase
                .from('posts')
                .update({ comments_count: (post.comments_count || 0) + 1 })
                .eq('id', commentData.post_id);
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
}

export const dbService = new DatabaseService();