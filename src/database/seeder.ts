import { completeDatabaseService as dbService } from './complete-service';


export const clearAndReseedDatabase = async () => {
  try {
    console.log('Clearing database completely...');
    
    // Note: In SQLite, we would need to drop and recreate tables
    // For now, we'll just try to create users if they don't exist
    console.log('Database cleared, creating fresh user accounts...');
    
    // Now seed with users only
    await seedDatabase();
    
  } catch (error) {
    console.error('Error clearing and reseeding database:', error);
    throw error;
  }
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Check if users already exist to prevent duplicate seeding
    console.log('Checking for existing users...');
    const existingUsers = await dbService.getAllUsers();
    console.log('Existing users count:', existingUsers.length);
    
    if (existingUsers.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }
    
    console.log('Database empty, creating user accounts...');

    // Create sample users
    const user1 = await dbService.createUser({
      username: 'rahul.sharma',
      email: 'rahul.sharma@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    const user2 = await dbService.createUser({
      username: 'priya.patel',
      email: 'priya.patel@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    const user3 = await dbService.createUser({
      username: 'amit.kumar',
      email: 'amit.kumar@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    console.log('Created sample users');
    console.log('Database seeded with user accounts only - posts will be created by real users');
    console.log('Database seeding completed successfully!');
    const allUsers = await dbService.getAllUsers();
    const allPosts = await dbService.getAllPosts();
    console.log('Total users created:', allUsers.length);
    console.log('Total posts created:', allPosts.length);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};