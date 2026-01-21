import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a hash
 * @param password - The plaintext password to verify
 * @param hash - The hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}
