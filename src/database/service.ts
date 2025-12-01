import { supabase } from '@/lib/supabase';
import {
    User, PostWithUser, CreatePostData, CreateLikeData, CreateCommentData,
    CommentWithUser, Notification, CreateConversationData, ConversationWithUsers,
    MessageWithSender, CreateMessageData, CreateFollowData, LoginData, AuthResult
} from './types';

export class DatabaseService {

    async syncUserWithSupabase(): Promise<User | null> {
        console.log("Syncing user with Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error getting session:", sessionError);
            return null;
        }

        if (!session?.user) {
            console.log("No session user found.");
            return null;
        }

        const authUser = session.user;
        const email = authUser.email!;
        console.log("Session user found:", email);

        // Enforce college email domain
        if (!email.endsWith('@cgu-odisha.ac.in')) {
            console.error("Invalid email domain:", email);
            await supabase.auth.signOut();
            return null;
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
            return existingUser as User;
        }

        console.log("User not found in DB, creating new user...");
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: email,
                username: username,
                password: '',
                display_name: authUser.user_metadata.full_name || username,
                avatar: authUser.user_metadata.avatar_url || '',
                profile_setup_complete: false,
                password_setup_complete: false
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating user:", error);
            return null;
        }

        console.log("New user created successfully:", newUser);
        return newUser as User;
    }

    async login(credentials: LoginData): Promise<AuthResult> {
        const { data, error } = await supabase.from('users').select('*').eq('email', credentials.email).single();
        if (error || !data) return { success: false, error: 'User not found' };
        if (data.password !== credentials.password) return { success: false, error: 'Invalid password' };
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
}

export const dbService = new DatabaseService();