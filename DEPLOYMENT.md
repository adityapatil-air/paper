# Deployment Guide

## Overview

This is a full-stack React application with Node.js/Express backend and Supabase database. The application includes:
- **Frontend**: React 18 with Create React App
- **Backend**: Express.js with Supabase integration
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage

## Deployment Options

### Option 1: Vercel (Recommended for Frontend) + Railway/Render (Backend)

#### Frontend Deployment (Vercel)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Build and Deploy**:
```bash
# From project root
npm run build
vercel --prod
```

3. **Environment Variables in Vercel**:
- Set `REACT_APP_API_URL` to your backend URL
- Example: `https://your-backend-url.railway.app`

#### Backend Deployment (Railway/Render)

**Using Railway:**

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **Deploy Backend**:
```bash
cd backend
railway login
railway init
railway up
```

3. **Set Environment Variables in Railway**:
```
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
SUPABASE_URL=https://vvtpfaohltoeevwicrnv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=manuscripts
JWT_SECRET=researchclient
```

**Using Render:**

1. Create a `render.yaml` file in backend directory
2. Connect your GitHub repository
3. Set environment variables in Render dashboard

### Option 2: Netlify (Frontend) + Heroku (Backend)

#### Frontend Deployment (Netlify)

1. **Build the application**:
```bash
npm run build
```

2. **Deploy to Netlify**:
- Drag and drop the `build` folder to Netlify
- Or connect your GitHub repository

3. **Set environment variables**:
- `REACT_APP_API_URL`: Your backend URL

#### Backend Deployment (Heroku)

1. **Install Heroku CLI**:
```bash
npm install -g heroku
```

2. **Deploy**:
```bash
cd backend
heroku create your-app-name
heroku config:set PORT=4000
heroku config:set FRONTEND_ORIGIN=https://your-frontend-url.netlify.app
heroku config:set SUPABASE_URL=https://vvtpfaohltoeevwicrnv.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
heroku config:set SUPABASE_STORAGE_BUCKET=manuscripts
heroku config:set JWT_SECRET=researchclient
git push heroku main
```

### Option 3: Docker Deployment

1. **Create Dockerfiles** for frontend and backend
2. **Use docker-compose** for local development
3. **Deploy to cloud providers** (AWS, Google Cloud, Azure)

## Pre-Deployment Checklist

### Frontend
- [ ] Update API URLs in environment variables
- [ ] Test build locally: `npm run build`
- [ ] Verify all routes work correctly
- [ ] Check responsive design

### Backend
- [ ] Verify environment variables
- [ ] Test database connection
- [ ] Check CORS settings
- [ ] Test API endpoints
- [ ] Verify file upload functionality

### Database (Supabase)
- [ ] Ensure Supabase project is active
- [ ] Check RLS policies
- [ ] Verify storage bucket exists
- [ ] Test database connections

## Environment Variables

### Frontend (.env)
```bash
REACT_APP_API_URL=https://your-backend-url.com
```

### Backend (.env)
```bash
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-url.com
SUPABASE_URL=https://vvtpfaohltoeevwicrnv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=manuscripts
JWT_SECRET=researchclient
```

## Post-Deployment Steps

1. **Test the application**:
   - User registration and login
   - Paper submission and review
   - File uploads
   - Admin dashboard

2. **Monitor performance**:
   - Set up monitoring tools
   - Check error logs
   - Monitor database usage

3. **Security**:
   - Update JWT secret if needed
   - Review CORS settings
   - Check Supabase RLS policies

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update `FRONTEND_ORIGIN` in backend
2. **Database Connection**: Verify Supabase credentials
3. **File Upload**: Check Supabase Storage bucket permissions
4. **Build Errors**: Check for missing environment variables

### Debug Commands

```bash
# Frontend build check
npm run build

# Backend health check
curl https://your-backend-url.com/api/health

# Check environment variables
heroku config --app your-app-name  # Heroku
railway variables list              # Railway
```

## Cost Optimization

- **Frontend**: Vercel/Netlify free tier sufficient
- **Backend**: Railway/Render free tier for small projects
- **Database**: Supabase free tier (up to 500MB)
- **Storage**: Supabase Storage free tier (1GB)

## Scaling Considerations

- Add CDN for static assets
- Implement caching strategies
- Consider serverless functions for API endpoints
- Scale database based on user growth
