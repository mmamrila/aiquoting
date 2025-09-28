const { seedDatabase } = require('./database/seedData');

console.log('🚀 Initializing database with sample data...');

// Add a small delay to ensure database connection is ready
setTimeout(() => {
  seedDatabase();
  console.log('✅ Database initialization complete!');
  console.log('🎯 You can now start the application with: npm run dev');
  process.exit(0);
}, 1000);