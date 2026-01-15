# Foxhole Enterprise OS - cPanel Deployment Guide

## Single Directory Deployment (Frontend + API together)

This guide shows how to deploy both frontend and backend in the same `public_html` directory.

---

## Final Structure on Server

```
public_html/
├── .htaccess              # Root routing (handles SPA + API)
├── index.html             # Frontend entry point
├── assets/                # Frontend JS/CSS (from build)
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
├── api/                   # Backend API
│   ├── .htaccess          # API routing
│   ├── .env               # API configuration
│   ├── index.php          # API entry point
│   ├── config/
│   │   ├── app.php
│   │   └── database.php
│   └── src/
│       ├── Controllers/
│       ├── Middleware/
│       ├── Services/
│       └── Utils/
└── uploads/               # File uploads (create this)
```

---

## Step 1: Create MySQL Database

1. Login to cPanel
2. Go to **MySQL Databases**
3. Create database: `foxhole`
4. Create user: `foxhole_user` with strong password
5. Add user to database with **ALL PRIVILEGES**

**Note:** cPanel prefixes your username:
- Database: `yourusername_foxhole`
- User: `yourusername_foxhole_user`

---

## Step 2: Import Database Schema

1. Go to **phpMyAdmin** in cPanel
2. Select your database
3. Click **Import** tab
4. Upload and execute `backend/database/schema.sql`
5. Upload and execute `backend/database/seed.sql`

---

## Step 3: Upload Backend (API)

Upload these folders/files to `public_html/api/`:

```
From: backend/
├── config/           → public_html/api/config/
├── src/              → public_html/api/src/
└── .env.example      → public_html/api/.env (rename and edit)

From: public_html/api/
├── index.php         → public_html/api/index.php
└── .htaccess         → public_html/api/.htaccess
```

**Or simply:**
1. Create folder `public_html/api/`
2. Upload contents of `backend/config/` to `public_html/api/config/`
3. Upload contents of `backend/src/` to `public_html/api/src/`
4. Upload `public_html/api/index.php` (from this repo)
5. Upload `public_html/api/.htaccess` (from this repo)
6. Copy `.env.example` to `.env` and configure

---

## Step 4: Configure API (.env)

Create `public_html/api/.env`:

```env
# Database - Use your cPanel prefixed names
DB_HOST=localhost
DB_NAME=yourusername_foxhole
DB_USER=yourusername_foxhole_user
DB_PASS=your_database_password

# JWT Secret - Generate a random string!
# Run: openssl rand -hex 32
JWT_SECRET=paste-your-64-character-random-string-here
JWT_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800

# App Settings
APP_URL=https://yourdomain.com/api
APP_ENV=production
APP_DEBUG=false

# CORS - Your domain (no trailing slash)
CORS_ORIGIN=https://yourdomain.com

# File Uploads
UPLOAD_MAX_SIZE=52428800
UPLOAD_PATH=../uploads
```

---

## Step 5: Build Frontend

On your local machine:

```bash
cd frontend

# Create production environment file
echo "VITE_API_URL=/api" > .env.production

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder.

---

## Step 6: Upload Frontend

Upload contents of `frontend/dist/` to `public_html/`:

```
frontend/dist/
├── index.html        → public_html/index.html
├── assets/           → public_html/assets/
└── (other files)     → public_html/
```

---

## Step 7: Upload Root .htaccess

Upload `public_html/.htaccess` (from this repo) to `public_html/`:

This file handles:
- SPA routing (all non-file requests → index.html)
- API routing (/api/* → api/index.php)
- Security headers
- Caching

---

## Step 8: Create Uploads Directory

```
public_html/uploads/
```

Set permissions: `755`

---

## Step 9: Set PHP Version

1. cPanel → **Select PHP Version**
2. Choose PHP 8.0, 8.1, or 8.2
3. Enable extensions:
   - pdo_mysql
   - json
   - mbstring
   - openssl

---

## Step 10: Test Deployment

### Test API:
```
https://yourdomain.com/api/auth/me
```
Should return: `{"success":false,"error":"Unauthorized"}`

### Test Frontend:
```
https://yourdomain.com
```
Should show login page.

### Test Login:
- Email: `admin@neofox.in`
- Password: `password123`

---

## File Permissions

Set via cPanel File Manager or SSH:

```bash
# Directories: 755
find public_html -type d -exec chmod 755 {} \;

# Files: 644
find public_html -type f -exec chmod 644 {} \;

# .env file: 600 (more secure)
chmod 600 public_html/api/.env

# Uploads directory: 755
chmod 755 public_html/uploads
```

---

## Troubleshooting

### API returns 500 error
1. Check PHP error logs in cPanel → Error Log
2. Verify database credentials in `.env`
3. Ensure all PHP files uploaded correctly
4. Check PHP version is 8.0+

### 404 on API routes
1. Ensure `.htaccess` files are uploaded
2. Check if mod_rewrite is enabled
3. Verify file paths in index.php

### Login not working
1. Check browser console for errors
2. Verify API URL in network tab
3. Test API directly: `curl https://yourdomain.com/api/auth/login`

### 404 on page refresh
1. Ensure root `.htaccess` is present
2. Check SPA routing rules

### CORS errors
1. Check `CORS_ORIGIN` in api/.env matches your domain exactly
2. Include https:// in the URL
3. No trailing slash

---

## Quick Upload Checklist

```
□ public_html/.htaccess (root)
□ public_html/index.html (frontend)
□ public_html/assets/ (frontend build)
□ public_html/api/.htaccess
□ public_html/api/.env
□ public_html/api/index.php
□ public_html/api/config/app.php
□ public_html/api/config/database.php
□ public_html/api/src/Controllers/*.php (11 files)
□ public_html/api/src/Middleware/*.php (2 files)
□ public_html/api/src/Services/*.php (4 files)
□ public_html/api/src/Utils/*.php (4 files)
□ public_html/uploads/ (create empty)
□ Database imported (schema.sql + seed.sql)
```

---

## Default Login Credentials

| Role     | Email              | Password    |
|----------|-------------------|-------------|
| Admin    | admin@neofox.in   | password123 |
| PM       | pm@neofox.in      | password123 |
| Employee | editor@neofox.in  | password123 |

**⚠️ CHANGE THESE PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!**

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT_SECRET (64+ chars)
- [ ] Set APP_DEBUG=false
- [ ] SSL/HTTPS enabled
- [ ] .env file permissions set to 600
- [ ] Removed phpMyAdmin default access (optional)
- [ ] Database user has minimal required privileges

---

## Optional: Custom Domain for API

If you prefer `api.yourdomain.com`:

1. Create subdomain in cPanel
2. Point it to `public_html/api/`
3. Update frontend: `VITE_API_URL=https://api.yourdomain.com`
4. Update CORS: `CORS_ORIGIN=https://yourdomain.com`
