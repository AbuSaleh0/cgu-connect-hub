// Simple script to reset the database
const response = await fetch('http://localhost:3001/api/reset-database', {
  method: 'DELETE'
});

if (response.ok) {
  const result = await response.json();
  console.log('✅', result.message);
} else {
  console.error('❌ Failed to reset database');
}