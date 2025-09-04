# Deployment Guide - Richard Fitness Website

## 🚀 Quick Deployment Options

### **Option 1: Heroku (Recommended)**

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create Heroku app**:
   ```bash
   heroku create your-gym-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set MONGODB_URI=your-mongodb-atlas-url
   heroku config:set SMTP_USER=your-email@gmail.com
   heroku config:set SMTP_PASS=your-app-password
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

### **Option 2: Railway**

1. **Connect GitHub repo** at railway.app
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on git push

### **Option 3: DigitalOcean App Platform**

1. **Create app** from GitHub repo
2. **Configure environment variables**
3. **Deploy with one click**

### **Option 4: Vercel (Frontend + Serverless Functions)**

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

## 🗄️ **Database Setup**

### **MongoDB Atlas (Recommended)**

1. **Create account** at mongodb.com/atlas
2. **Create cluster** (free tier available)
3. **Get connection string**
4. **Update MONGODB_URI** in environment variables
5. **Run seed script**:
   ```bash
   npm run seed
   ```

## 📧 **Email Configuration**

### **Gmail Setup**
1. **Enable 2FA** on Gmail account
2. **Generate app password** in Google Account settings
3. **Use app password** as SMTP_PASS

### **SendGrid (Production)**
1. **Create SendGrid account**
2. **Get API key**
3. **Update email configuration**

## 🔐 **Security Checklist**

- [ ] Change JWT_SECRET to strong random string
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for your domain
- [ ] Set up SSL/HTTPS
- [ ] Update admin credentials
- [ ] Configure rate limiting
- [ ] Set up monitoring

## 📱 **Domain Setup**

1. **Purchase domain** from registrar
2. **Configure DNS** to point to your hosting
3. **Set up SSL certificate**
4. **Update FRONTEND_URL** environment variable

## 🔄 **CI/CD with GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: cd backend && npm install
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "your-app-name"
        heroku_email: "your-email@example.com"
```

## 🐳 **Docker Deployment**

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
COPY frontend/ ./frontend/
EXPOSE 5000
CMD ["npm", "start"]
```

Deploy with:
```bash
docker build -t richard-fitness .
docker run -p 5000:5000 richard-fitness
```

## 📊 **Monitoring & Analytics**

### **Recommended Tools**
- **Uptime**: UptimeRobot, Pingdom
- **Analytics**: Google Analytics
- **Error tracking**: Sentry
- **Performance**: New Relic

## 🔧 **Environment Variables**

```bash
# Production Environment Variables
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gym

# JWT
JWT_SECRET=your-super-secure-64-character-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

## 🚦 **Pre-Deployment Checklist**

- [ ] Test all features locally
- [ ] Set up production database
- [ ] Configure email service
- [ ] Update environment variables
- [ ] Test API endpoints
- [ ] Verify file uploads work
- [ ] Check mobile responsiveness
- [ ] Test contact forms
- [ ] Verify admin dashboard
- [ ] Set up SSL certificate
- [ ] Configure domain DNS
- [ ] Set up monitoring
- [ ] Create backups strategy

## 🆘 **Troubleshooting**

### **Common Issues**
- **MongoDB connection**: Check connection string and IP whitelist
- **Email not sending**: Verify SMTP credentials
- **File uploads failing**: Check file permissions and storage
- **API errors**: Check environment variables
- **Frontend not loading**: Verify static file serving

### **Logs**
- Check application logs in hosting platform
- Monitor database connection logs
- Review email delivery logs
- Check file upload logs

---

**Your professional gym website is ready for production deployment!** 🏋️‍♂️