import { dbService } from './service';
import samplePost1 from '../assets/sample-post-1.jpg';
import samplePost2 from '../assets/sample-post-2.jpg';
import samplePost3 from '../assets/sample-post-3.jpg';

export const seedDatabase = () => {
  try {
    console.log('Starting database seeding...');

    // Check if users already exist
    const existingUsers = dbService.getAllUsers();
    if (existingUsers.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

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

    // Create sample posts
    const post1 = dbService.createPost({
      user_id: user1.id,
      image: samplePost1,
      caption: 'Beautiful day at CGU campus! 🌟 #CGULife #CampusVibes'
    });

    const post2 = dbService.createPost({
      user_id: user2.id,
      image: samplePost2,
      caption: 'Study group sessions hitting different 📚✨ Grateful for these amazing people!'
    });

    const post3 = dbService.createPost({
      user_id: user3.id,
      image: samplePost3,
      caption: 'Our campus is a work of art 🏛️ #CGUArchitecture #ProudToBeHere'
    });

    console.log('Created sample posts');

    // Add some likes (simulate different users liking posts)
    // Post 1: 234 likes
    for (let i = 0; i < 234; i++) {
      try {
        dbService.toggleLike({
          user_id: (i % 3) + 1, // Rotate between our 3 users
          post_id: post1.id
        });
      } catch (e) {
        // Skip if like already exists
      }
    }

    // Post 2: 189 likes  
    for (let i = 0; i < 189; i++) {
      try {
        dbService.toggleLike({
          user_id: (i % 3) + 1,
          post_id: post2.id
        });
      } catch (e) {
        // Skip if like already exists
      }
    }

    // Post 3: 312 likes
    for (let i = 0; i < 312; i++) {
      try {
        dbService.toggleLike({
          user_id: (i % 3) + 1,
          post_id: post3.id
        });
      } catch (e) {
        // Skip if like already exists
      }
    }

    // Add some comments
    // Post 1: 18 comments
    const post1Comments = [
      'Amazing view! 😍',
      'Love this place!',
      'CGU is the best! 🔥',
      'Such a beautiful campus',
      'Missing this place',
      'Stunning architecture',
      'Perfect weather today',
      'Great shot! 📸',
      'Absolutely gorgeous',
      'This is why I chose CGU',
      'Best university ever!',
      'So peaceful',
      'Incredible view',
      'This made my day',
      'Beautiful campus life',
      'Living the dream',
      'Perfect timing',
      'Outstanding!'
    ];

    post1Comments.forEach((comment, index) => {
      dbService.createComment({
        user_id: (index % 3) + 1,
        post_id: post1.id,
        content: comment
      });
    });

    // Post 2: 12 comments  
    const post2Comments = [
      'Study goals! 💯',
      'Team work makes the dream work',
      'Inspiring!',
      'Keep it up guys!',
      'Study squad goals',
      'This is dedication',
      'Amazing group',
      'Future leaders right here',
      'So motivated by this',
      'Hard work pays off',
      'Best study buddies',
      'Academic excellence!'
    ];

    post2Comments.forEach((comment, index) => {
      dbService.createComment({
        user_id: (index % 3) + 1,
        post_id: post2.id,
        content: comment
      });
    });

    // Post 3: 24 comments
    const post3Comments = [
      'Architectural masterpiece!',
      'This building is iconic',
      'So proud of our campus',
      'Best architecture in the region',
      'This never gets old',
      'Stunning design',
      'Perfect symmetry',
      'Historical beauty',
      'Classic architecture',
      'This is art',
      'Magnificent structure',
      'Timeless beauty',
      'Proud alumnus here',
      'Heritage at its finest',
      'Breathtaking view',
      'Architectural wonder',
      'This is home',
      'Incredible craftsmanship',
      'Cultural heritage',
      'Majestic building',
      'Perfect photograph',
      'Amazing perspective',
      'Architectural excellence',
      'Beautiful composition'
    ];

    post3Comments.forEach((comment, index) => {
      dbService.createComment({
        user_id: (index % 3) + 1,
        post_id: post3.id,
        content: comment
      });
    });

    console.log('Added sample likes and comments');
    console.log('Database seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};