# Migration Complete - Next Steps

## ✅ What's Been Done

1. **Nginx Reverse Proxy** - Configured to serve frontend and proxy API requests
2. **PM2 Process Manager** - Backend running with auto-restart and clustering
3. **Frontend Build** - Production build created and configured
4. **Environment Variables** - Production environment files created
5. **Auto-startup** - PM2 configured to start on server reboot

## 🔧 Critical Steps You Need to Complete

### 1. Update Domain Configuration
Edit `/etc/nginx/sites-available/researchpprs`:
```bash
sudo nano /etc/nginx/sites-available/researchpprs
```
Replace `your-domain.com` with your actual domain name.

### 2. Configure Backend Environment
Edit `/root/researchpprs/backend/.env.production`:
```bash
nano /root/researchpprs/backend/.env.production
```
Update these values:
- `FRONTEND_ORIGIN=https://your-domain.com`
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- `RAZORPAY_KEY_ID=your-razorpay-key-id`
- `RAZORPAY_KEY_SECRET=your-razorpay-key-secret`

### 3. Setup SSL Certificate
Once your domain points to this server:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 4. Restart Services
```bash
sudo systemctl restart nginx
pm2 restart researchpprs-backend
```

## 🚀 Performance Optimizations

The setup includes:
- **Gzip compression** for faster load times
- **Static asset caching** (1 year for JS/CSS/images)
- **Security headers** (XSS protection, CSRF protection)
- **PM2 clustering** for better CPU utilization
- **Nginx reverse proxy** for efficient request handling

## 📊 Monitoring

Check application status:
```bash
pm2 status          # View process status
pm2 logs            # View application logs
pm2 monit           # Real-time monitoring
sudo nginx -t       # Test Nginx configuration
```

## 🔒 Security Notes

- Change the `JWT_SECRET` in backend `.env.production`
- Ensure your Supabase RLS policies are properly configured
- Regularly update SSL certificate with Let's Encrypt
- Monitor logs for unusual activity

## 📁 File Structure

```
/root/researchpprs/
├── build/                    # Production frontend build
├── backend/
│   ├── src/                  # Backend source code
│   └── .env.production       # Backend environment config
├── ecosystem.config.js       # PM2 configuration
├── logs/                     # Application logs
└── .env.production          # Frontend environment config
```

## 🌐 Domain Pointing

Point your domain's A record to your server's IP address:
- A record: `@` → `YOUR_SERVER_IP`
- A record: `www` → `YOUR_SERVER_IP`

## ⚡ Expected Performance

With this setup, you should see:
- **Frontend**: <2s load time (cached assets)
- **API**: <100ms response time
- **SSL**: Automatic HTTPS with Let's Encrypt
- **Uptime**: 99.9% with PM2 auto-restart
