# Leaderboard Integration - Setup & Testing Guide

## Prerequisites

1. **Python 3.8+** with pip
2. **Node.js 18+** with npm
3. **Oracle Database** connection configured (for the leaderboard backend)

## Step 1: Set Up Leaderboard Backend

The leaderboard backend is in `ai_tutor/backend/`.

### Install Python Dependencies

```bash
cd ai_tutor/backend
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file in `ai_tutor/backend/` (or set environment variables):

```bash
# Oracle Database Configuration
TNS_ADMIN=/path/to/wallet/folder
ADB_DSN=aitutordb_tp
ADB_USER=ADMIN
ADB_PASSWORD=your_password
WALLET_PASSWORD=wallet_password_if_encrypted
```

### Start the Leaderboard Backend

```bash
cd ai_tutor/backend
uvicorn main:app --reload --port 8001
```

The backend will run on `http://localhost:8001`

**Verify it's working:**
- Visit `http://localhost:8001/docs` to see the API documentation
- Visit `http://localhost:8001/leaderboard` to test the leaderboard endpoint

## Step 2: Set Up Frontend

The main frontend is in `frontend/`.

### Install Node Dependencies

```bash
cd frontend
npm install
```

### Configure Environment Variables (Optional)

Create a `.env.local` file in `frontend/`:

```bash
# Main API URL (for chat functionality)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Leaderboard API URL
NEXT_PUBLIC_LEADERBOARD_API_URL=http://localhost:8001
```

**Note:** If you don't set these, the defaults are:
- `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`
- `NEXT_PUBLIC_LEADERBOARD_API_URL` defaults to `http://localhost:8001`

### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## Step 3: Test the Integration

### 1. Access the Leaderboard Page

- Open your browser to `http://localhost:3000`
- Navigate to `/leaderboard` or click the "Leaderboard" button in the sidebar
- You should see the leaderboard page with two tabs:
  - **Leaderboard Tab**: Shows all users ranked by performance
  - **My Stats Tab**: Shows your personal statistics (requires login)

### 2. Test Leaderboard (No Auth Required)

- The leaderboard endpoint (`/leaderboard`) doesn't require authentication
- You should see a table with rankings, queries, MCQs, accuracy, and streaks
- If no data exists, you'll see an empty state message

### 3. Test My Stats (Requires Login)

- Click on the "My Stats" tab
- If not logged in, you'll see a message prompting you to log in
- After logging in, you should see your personal statistics in card format

### 4. Test Navigation

- From the chat page (`/chat`), click the "Leaderboard" button in the sidebar
- It should navigate to `/leaderboard`
- The leaderboard should load and display data

## Troubleshooting

### Backend Issues

**Problem:** Backend won't start
- Check that port 8001 is not already in use
- Verify Oracle database connection settings
- Check that all Python dependencies are installed

**Problem:** CORS errors
- The backend already has CORS configured to allow all origins
- If issues persist, check the browser console for specific error messages

### Frontend Issues

**Problem:** Can't connect to leaderboard backend
- Verify the backend is running on port 8001
- Check the browser console for network errors
- Verify `NEXT_PUBLIC_LEADERBOARD_API_URL` is set correctly

**Problem:** TypeScript errors
- Run `npm install` in the frontend directory
- Restart your IDE/editor to refresh TypeScript server
- The errors should resolve after dependencies are installed

**Problem:** Styles not loading
- Ensure Tailwind CSS is properly configured
- Check that `globals.css` is imported in `layout.tsx`
- Restart the Next.js dev server

## Quick Start Commands

```bash
# Terminal 1: Start Leaderboard Backend
cd ai_tutor/backend
uvicorn main:app --reload --port 8001

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Then open http://localhost:3000/leaderboard
```

## API Endpoints

The leaderboard backend provides:

- `GET /leaderboard` - Get all users ranked by performance (no auth)
- `GET /users/me/stats` - Get current user's stats (requires JWT token)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

## Next Steps

1. **Add sample data** to the database to see the leaderboard populated
2. **Test authentication** by registering/logging in users
3. **Customize styling** in `frontend/src/app/globals.css` if needed
4. **Deploy** both services when ready for production

