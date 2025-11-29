export { completeDatabaseService as dbService } from './complete-service';
export { sqliteService } from './sqlite-service';
export { seedDatabase, clearAndReseedDatabase } from './seeder';
export { sessionManager } from './session';
export * from './types';
export * from './utils';
export * from './messaging';

// Convenience function for database initialization
export const initDb = async () => {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Import the service
    console.log('📦 Importing complete database service...');
    const { completeDatabaseService } = await import('./complete-service');
    console.log('✅ Service imported successfully');
    
    // Initialize the service
    console.log('🔧 Calling initialize method...');
    await completeDatabaseService.initialize();
    console.log('✅ Service initialized successfully');
    
    // Check if database is empty and optionally seed it for development
    console.log('📊 Getting database info...');
    const info = completeDatabaseService.getDatabaseInfo();
    console.log('📊 Database info:', info);
    
    // Uncomment the next line to seed the database with sample data on first run
    // if (info.sizeKB < 10) {
    //   console.log('🌱 Seeding database with sample data...');
    //   await completeDatabaseService.seedDatabase();
    // }
    
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    throw new Error(`Failed to initialize the database: ${error instanceof Error ? error.message : String(error)}`);
  }
};