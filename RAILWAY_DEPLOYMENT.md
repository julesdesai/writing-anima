# Railway Deployment Guide

This guide will help you deploy the Writing Anima application to Railway.

## Prerequisites

1. A [Railway account](https://railway.app/) (free to start)
2. A GitHub account with this repo pushed
3. Your API keys ready:
   - Anthropic API key
   - Firebase service account credentials
   - (Optional) OpenAI API key

## Step 1: Push to GitHub

If you haven't already, push your code to GitHub:

```bash
cd "/Users/julesdesai/Documents/HAI Lab Code/writing-anima"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app/) and sign in
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `writing-anima` repository
5. Railway will detect it's a monorepo - select the `backend` directory
6. Add environment variables (in Railway dashboard):
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `OPENAI_API_KEY`: Your OpenAI API key (if using)
   - `QDRANT_HOST`: Use Railway's Qdrant template (see Step 3) or external Qdrant
   - `QDRANT_PORT`: 6333
   - `FIREBASE_CREDENTIALS`: Your Firebase service account JSON (as a single-line string)
   - `ALLOWED_ORIGINS`: Will add after deploying frontend

7. Railway will auto-deploy your backend
8. Copy the backend URL (e.g., `https://your-backend.up.railway.app`)

## Step 3: Add Qdrant Database

1. In your Railway project, click "New"
2. Select "Database" → "Qdrant"
3. Railway will create a Qdrant instance
4. Copy the connection details and update your backend environment variables:
   - `QDRANT_HOST`: From Railway Qdrant dashboard
   - `QDRANT_API_KEY`: From Railway Qdrant dashboard

## Step 4: Deploy Frontend to Railway

1. In the same Railway project, click "New"
2. Choose "Deploy from GitHub repo" (same repo)
3. Select the `frontend` directory
4. Add environment variables:
   - `REACT_APP_API_URL`: Your backend URL from Step 2
   - `REACT_APP_FIREBASE_API_KEY`: Your Firebase config
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`: Your Firebase config
   - `REACT_APP_FIREBASE_PROJECT_ID`: Your Firebase config
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`: Your Firebase config
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase config
   - `REACT_APP_FIREBASE_APP_ID`: Your Firebase config

5. Railway will auto-deploy your frontend
6. Copy the frontend URL (e.g., `https://your-frontend.up.railway.app`)

## Step 5: Update CORS

1. Go back to your backend service in Railway
2. Update the `ALLOWED_ORIGINS` environment variable:
   ```
   https://your-frontend.up.railway.app,http://localhost:3000
   ```
3. Railway will auto-redeploy

## Step 6: Test Your Deployment

1. Visit your frontend URL
2. Try creating an account and logging in
3. Create an anima and upload some corpus files
4. Test the writing interface with "Think" button

## Costs

- **Free tier**: $5 credit/month (enough for testing)
- **Hobby plan**: $5/month per service (backend + frontend = $10/month)
- **Pro plan**: $20/month for higher limits

## Troubleshooting

### Backend won't start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure `requirements.txt` is up to date

### Frontend can't connect to backend
- Verify `REACT_APP_API_URL` points to your backend URL
- Check backend CORS settings in `ALLOWED_ORIGINS`
- Verify backend is running (check Railway logs)

### Qdrant connection errors
- Verify Qdrant service is running in Railway
- Check `QDRANT_HOST` and `QDRANT_API_KEY` are correct
- Ensure backend can reach Qdrant (they should be in same Railway project)

## Custom Domain (Optional)

1. In Railway dashboard, go to your frontend service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Don't forget to update backend `ALLOWED_ORIGINS`!

## Monitoring

- Railway provides built-in logs and metrics
- Check "Observability" tab for each service
- Set up usage alerts in Settings

## Updates

Railway auto-deploys on every push to main:
1. Make your changes locally
2. `git push origin main`
3. Railway will automatically rebuild and deploy

---

Need help? Check [Railway docs](https://docs.railway.app/) or their Discord community.
