# Clear All Data

## Method 1: Clear localStorage (Current System)
Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

## Method 2: Reset SQLite Database (When Server is Running)
1. Start the server: `cd server && npm run dev`
2. Run reset script: `node reset-db.js`

## Method 3: Manual Database Reset
Delete the database file:
```bash
cd server
rm cgu-connect.db
```
The database will be recreated when you restart the server.

## Method 4: API Call
Make a DELETE request to: `http://localhost:3001/api/reset-database`