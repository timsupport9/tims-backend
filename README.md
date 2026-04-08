# TIMS Support Portal Backend

Deploy on Render in 2 minutes.

## Steps

1. Push this code to a GitHub repository.
2. Log in to [Render](https://render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repo.
5. Use these settings:
   - **Name**: `tims-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
6. Add environment variable:
   - Key: `JWT_SECRET`  
     Value: (click "Generate" or paste a long random string)
7. Click **Create Web Service**.

Your backend will be live at `https://tims-backend.onrender.com`.

## Connect Frontend

In your TIMS frontend HTML, replace `http://localhost:3001` with your Render URL (e.g., `https://tims-backend.onrender.com`).

## Default Logins

- Admin: `admin@tims.com` / `admin123`
- Agents: `sarah@tims.com`, `michael@tims.com`, `elena@tims.com` / `agent123`

## Important

The SQLite database is stored in `/tmp` and will reset on each redeploy. For production persistence, switch to PostgreSQL (Render offers a free PostgreSQL database).
