-- Migration: Make Password Mandatory for All Users
-- This script makes the password field NOT NULL in the users table
-- Run this AFTER all existing OAuth users have set their passwords via the app

-- ============================================
-- STEP 1: Check current state (OPTIONAL - for verification)
-- ============================================

-- Check how many users have NULL passwords
-- SELECT COUNT(*) as users_without_password 
-- FROM public.users 
-- WHERE password IS NULL OR password = '';

-- List users without passwords
-- SELECT id, username, email, password_setup_complete 
-- FROM public.users 
-- WHERE password IS NULL OR password = '';

-- ============================================
-- STEP 2: (IF NEEDED) Set temporary password for existing users without passwords
-- ============================================

-- ONLY run this if you have existing users without passwords
-- This will fail if password is already NOT NULL

-- Option A: Set a random temporary password (users will need to reset)
-- UPDATE public.users 
-- SET password = '$2a$10$temporaryhash.willneedtoreset', 
--     password_setup_complete = false 
-- WHERE password IS NULL OR password = '';

-- Option B: Better - Wait for users to set passwords via the app
-- The app now forces OAuth users to /password-setup page
-- So just wait for all users to login once and set their passwords

-- ============================================
-- STEP 3: Make password column NOT NULL
-- ============================================

-- WARNING: This will FAIL if any user still has NULL password
-- Make sure all users have passwords first!

ALTER TABLE public.users 
ALTER COLUMN password SET NOT NULL;

-- ============================================
-- STEP 4: Verify the change
-- ============================================

-- Check that the column is now NOT NULL
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'password';
-- Should show: is_nullable = 'NO'

-- ============================================
-- NOTES FOR EXISTING DEPLOYMENT:
-- ============================================

-- If you have EXISTING USERS in production:
-- 1. Deploy the code changes first (App.tsx redirect logic)
-- 2. Wait for all OAuth users to login once and set passwords
-- 3. Verify all users have passwords (run STEP 1 query)
-- 4. Only then run STEP 3 to make password NOT NULL

-- If you're starting fresh with NO existing users:
-- 1. Just run STEP 3 immediately
-- 2. The app will force all new OAuth users to set passwords

-- ============================================
-- ROLLBACK (if needed):
-- ============================================

-- To make password nullable again:
-- ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
