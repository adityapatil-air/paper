#!/bin/bash

echo "🚀 Deploying Research Paper Review Platform"

# Build frontend
echo "📦 Building frontend..."
npm run build

# Deploy backend (choose one)
echo "🔧 Choose deployment option:"
echo "1. Railway"
echo "2. Render"
echo "3. Heroku"

read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo "🚂 Deploying to Railway..."
    cd backend
    railway login
    railway up
    ;;
  2)
    echo "🎨 Deploying to Render..."
    echo "Please connect your repository to Render and set environment variables"
    ;;
  3)
    echo "🔷 Deploying to Heroku..."
    cd backend
    heroku create your-app-name
    heroku config:set PORT=4000
    heroku config:set SUPABASE_URL=https://vvtpfaohltoeevwicrnv.supabase.co
    heroku config:set SUPABASE_SERVICE_ROLE_KEY=
    heroku config:set JWT_SECRET=researchclient
    git push heroku main
    ;;
esac

echo "✅ Deployment complete!"
echo "📝 Don't forget to:"
echo "   - Update FRONTEND_ORIGIN environment variable"
echo "   - Set REACT_APP_API_URL in frontend"
echo "   - Test all functionality"
