// Debug script to check localStorage contents
// Run this in browser console to see what data exists

console.log('=== DEBUGGING LOCALSTORAGE ===');

// Check users
const users = localStorage.getItem('cgu_connect_users');
if (users) {
  const parsedUsers = JSON.parse(users);
  console.log('Users found:', parsedUsers.length);
  parsedUsers.forEach(user => {
    console.log(`  - User ${user.id}: ${user.username} (${user.email})`);
  });
} else {
  console.log('No users found');
}

// Check conversations
const conversations = localStorage.getItem('cgu_connect_conversations');
if (conversations) {
  const parsedConversations = JSON.parse(conversations);
  console.log('Conversations found:', parsedConversations.length);
  parsedConversations.forEach(conv => {
    console.log(`  - Conversation ${conv.id}: participant1=${conv.participant1_id}, participant2=${conv.participant2_id}`);
  });
} else {
  console.log('No conversations found');
}

// Check messages
const messages = localStorage.getItem('cgu_connect_messages');
if (messages) {
  const parsedMessages = JSON.parse(messages);
  console.log('Messages found:', parsedMessages.length);
  parsedMessages.forEach(msg => {
    console.log(`  - Message ${msg.id}: conversation=${msg.conversation_id}, sender=${msg.sender_id}, content="${msg.content}"`);
  });
} else {
  console.log('No messages found');
}

// Check current session
const session = localStorage.getItem('cgu_connect_session');
if (session) {
  const parsedSession = JSON.parse(session);
  console.log('Current session:', parsedSession);
} else {
  console.log('No session found');
}

console.log('=== END DEBUG ===');