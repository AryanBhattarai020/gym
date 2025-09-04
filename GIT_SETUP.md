# Git Setup Guide - Richard Fitness Website

## 🔄 **Step-by-Step GitHub Setup**

### **1. Create GitHub Repository**
1. Go to [github.com](https://github.com)
2. Click "New repository"
3. Name it: `richard-fitness-website`
4. Make it public or private
5. **Don't** initialize with README (we have one)
6. Click "Create repository"

### **2. Prepare Local Repository**

```bash
# Navigate to your project folder (after copying files from workspace)
cd richard-fitness-website

# Initialize Git repository
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit: Professional gym website with full backend"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/richard-fitness-website.git

# Push to GitHub
git push -u origin main
```

### **3. Alternative: Using GitHub CLI**

If you have GitHub CLI installed:

```bash
# Create repository and push in one go
gh repo create richard-fitness-website --public --source=. --remote=origin --push
```

## 📁 **Files to Copy from Workspace**

Copy these files/folders to your local machine:

```
richard-fitness-website/
├── backend/                    # Complete backend system
├── frontend/                   # Professional website
├── docs/                       # Documentation
├── .gitignore                 # Git ignore rules
├── .env.example               # Environment template
├── README.md                  # Project documentation
├── DEPLOY.md                  # Deployment guide
├── package.json               # Root package file
└── GIT_SETUP.md              # This file
```

## 🔧 **Git Commands Reference**

### **Basic Workflow**
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### **Branching**
```bash
# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Merge branch
git merge feature-name

# Delete branch
git branch -d feature-name
```

## 🚀 **Deployment from GitHub**

### **Option 1: Heroku**
```bash
# Connect to Heroku
heroku git:remote -a your-app-name

# Deploy
git push heroku main
```

### **Option 2: Vercel**
```bash
# Connect to Vercel
vercel --prod
```

### **Option 3: Railway**
- Connect your GitHub repo in Railway dashboard
- Auto-deploys on push to main branch

## 📋 **Commit Message Examples**

```bash
git commit -m "feat: Add user authentication system"
git commit -m "fix: Resolve mobile navigation issue"
git commit -m "style: Update homepage design"
git commit -m "docs: Add deployment instructions"
git commit -m "refactor: Improve API error handling"
```

## 🔐 **Environment Variables Setup**

After deploying, set these environment variables in your hosting platform:

```bash
NODE_ENV=production
MONGODB_URI=your-database-url
JWT_SECRET=your-secret-key
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🌟 **Repository Features to Enable**

In your GitHub repository settings:

1. **Enable Issues** - for bug tracking
2. **Enable Discussions** - for community
3. **Add Topics** - gym, fitness, nodejs, mongodb
4. **Set up Branch Protection** - for main branch
5. **Enable Security Alerts** - for dependencies

## 📊 **GitHub Actions (Optional)**

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: cd backend && npm install
    - name: Run tests
      run: cd backend && npm test
```

## 🤝 **Contributing Setup**

Create `CONTRIBUTING.md`:

```markdown
# Contributing to Richard Fitness Website

## Development Setup
1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm run install-deps`
4. Create feature branch: `git checkout -b feature-name`
5. Make changes and test
6. Submit pull request

## Code Style
- Use ESLint configuration
- Follow existing patterns
- Add comments for complex logic
- Update documentation
```

---

**Your code is ready for GitHub! Follow these steps to get it online.** 🚀