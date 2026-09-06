# 🚀 Deploying Red Network (RN) to Railway.com

This guide provides step-by-step instructions to deploy the **Red Network GTA RP Syndicate System** to [Railway.com](https://railway.app/).

---

## ⚡ Quick Deployment (Single Service)

The Red Network project is structured as a unified fullstack single-service:
1. **Frontend**: Built with Vite + React + Tailwind into static assets in `dist/`.
2. **Backend**: Express.js + Socket.io running on Node.js, serving both API endpoints, realtime websockets, and frontend SPA files from `dist/`.

---

## 📋 Steps to Deploy on Railway

### Step 1: Push Code to GitHub
Ensure your repository is pushed to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: Red Network syndicate app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/RN.git
git push -u origin main
```

### Step 2: Create a New Project on Railway
1. Log in to [railway.app](https://railway.app/).
2. Click **"New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Choose your `RN` repository.

### Step 3: Configure Environment Variables in Railway
Go to your service in Railway -> **Variables** tab, and add:
| Variable | Value | Description |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | `RNLEADER#1` *(or your custom password)* | Leader full-access passcode |
| `MEMBER_PASSWORD` | `redgang2026` *(or your custom password)* | Member access passcode |
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | *(Railway injects this automatically)* | Port assigned by Railway |
| `MONGODB_URI` | *(Optional)* | Mongo Atlas URI (if using MongoDB) |
| `ADMIN_DISCORD_IDS`| *(Optional)* | Comma-separated Discord User IDs |

> [!NOTE]
> If `MONGODB_URI` is not set, Red Network automatically uses the file-based JSON store (`server/data/db.json`), ensuring zero-config operation out-of-the-box!

### Step 4: Generate a Public Domain
1. In Railway, click on your deployed service.
2. Go to the **Settings** tab.
3. Under **Networking**, click **"Generate Domain"** (e.g., `rn-production-xxxx.up.railway.app`).
4. Open the generated domain in your browser!

---

## 🔑 Default Credentials

- **Viewer (Upper Layer)**: No password required. Click *"Enter as Guest Viewer"*.
- **Gang Member**: Passcode `redgang2026`
- **Leader (Full Access)**: Passcode `RNLEADER#1`
