import { dbService } from './service';


export const clearAndReseedDatabase = () => {
  try {
    console.log('Clearing database completely...');
    
    // Clear all existing data
    localStorage.removeItem('cgu-connect-db');
    
    console.log('Database cleared, creating fresh user accounts...');
    
    // Now seed with users only
    seedDatabase();
    
  } catch (error) {
    console.error('Error clearing and reseeding database:', error);
    throw error;
  }
};

export const seedDatabase = () => {
  try {
    console.log('Starting database seeding...');

    // Check if users already exist to prevent duplicate seeding
    console.log('Checking for existing users...');
    const existingUsers = dbService.getAllUsers();
    console.log('Existing users count:', existingUsers.length);
    
    if (existingUsers.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }
    
    console.log('Database empty, creating user accounts...');

    // Create sample users
    const user1 = dbService.createUser({
      username: 'rahul.sharma',
      email: 'rahul.sharma@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    const user2 = dbService.createUser({
      username: 'priya.patel',
      email: 'priya.patel@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    const user3 = dbService.createUser({
      username: 'amit.kumar',
      email: 'amit.kumar@cgu-odisha.ac.in',
      password: 'password123',
      avatar: ''
    });

    console.log('Created sample users');
    console.log('Database seeded with user accounts only - posts will be created by real users');
    console.log('Database seeding completed successfully!');
    console.log('Total users created:', dbService.getAllUsers().length);
    console.log('Total posts created:', dbService.getAllPosts().length);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};