# SQLite Backend Setup

## Installation
```bash
cd server
npm install
```

## Run Server
```bash
npm run dev
```

Server will run on http://localhost:3001

## Database
- SQLite database file: `cgu-connect.db`
- All tables created automatically on first run
- Data persists between server restarts

## API Endpoints
- POST /api/users - Create user
- GET /api/users/:id - Get user by ID
- GET /api/users/username/:username - Get user by username
- POST /api/posts - Create post
- GET /api/posts - Get all posts
- POST /api/follows/toggle - Follow/unfollow user
- GET /api/notifications/:userId - Get user notifications

## Next Steps
1. Install dependencies: `npm install`
2. Start server: `npm run dev`
3. Update frontend to use API instead of localStorage