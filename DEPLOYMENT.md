# Foxhole Enterprise OS - cPanel Deployment Guide

## Prerequisites
- cPanel hosting with PHP 8.0+ support
- MySQL 5.7+ database
- SSL certificate (recommended)

---

## Step 1: Create MySQL Database

1. Login to cPanel
2. Go to **MySQL Databases**
3. Create database: `foxhole_db`
4. Create user: `foxhole_user` with strong password
5. Add user to database with **ALL PRIVILEGES**

**Note:** cPanel prefixes your username, so actual names will be:
- Database: `yourusername_foxhole_db`
- User: `yourusername_foxhole_user`

---

## Step 2: Import Database

1. Go to **phpMyAdmin** in cPanel
2. Select your database
3. Click **Import** tab
4. Upload and execute `backend/database/schema.sql`
5. Upload and execute `backend/database/seed.sql`

---

## Step 3: Upload Backend (API)

### Option A: Upload to subdomain (Recommended)
Create subdomain: `api.yourdomain.com`

1. In cPanel → **Subdomains** → Create `api`
2. Document root: `public_html/api`
3. Upload ALL files from `backend/` folder to `public_html/api/`

### Option B: Upload to subdirectory
1. Create folder: `public_html/foxhole-api/`
2. Upload ALL files from `backend/` folder there

### File Structure on Server:
```
public_html/
└── api/                    (or foxhole-api/)
    ├── config/
    │   ├── app.php
    │   └── database.php
    ├── database/
    │   ├── schema.sql
    │   └── seed.sql
    ├── public/
    │   ├── .htaccess
    │   └── index.php
    ├── src/
    │   ├── Controllers/
    │   ├── Middleware/
    │   ├── Services/
    │   └── Utils/
    └── .env
```

---

## Step 4: Configure Backend

### Edit `.env` file on server:

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=yourusername_foxhole_db
DB_USER=yourusername_foxhole_user
DB_PASS=your_secure_password

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=generate-a-random-64-character-string-here
JWT_EXPIRES=3600
REFRESH_TOKEN_EXPIRES=604800

# App Configuration
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

# CORS - Frontend URL
CORS_ORIGIN=https://yourdomain.com
```

### Generate JWT Secret:
Use this to generate a random secret:
```bash
openssl rand -hex 32
```
Or use: https://randomkeygen.com/

---

## Step 5: Configure .htaccess for API

Make sure `backend/public/.htaccess` contains:

```apache
RewriteEngine On

# Handle Authorization Header
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]

# Redirect to index.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

### Root .htaccess (in api/ folder):

Create `api/.htaccess`:
```apache
RewriteEngine On
RewriteRule ^api/v1/(.*)$ public/index.php [QSA,L]
RewriteRule ^(.*)$ public/$1 [QSA,L]
```

---

## Step 6: Build Frontend

On your local machine:

```bash
cd frontend

# Update .env with your API URL
echo "VITE_API_URL=https://api.yourdomain.com/api/v1" > .env.production

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with production files.

---

## Step 7: Upload Frontend

1. Upload ALL contents of `frontend/dist/` to `public_html/`

   OR to a subdomain like `app.yourdomain.com`

### File Structure:
```
public_html/
├── assets/           (JS, CSS files)
├── index.html
└── ... other files
```

---

## Step 8: Configure Frontend .htaccess

Create `public_html/.htaccess` for SPA routing:

```apache
RewriteEngine On
RewriteBase /

# Don't rewrite files or directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Rewrite everything else to index.html
RewriteRule ^ index.html [L]
```

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

1. Visit `https://api.yourdomain.com/api/v1/auth/me`
   - Should return: `{"success":false,"error":"Unauthorized"}`
   - This means API is working!

2. Visit `https://yourdomain.com`
   - Should show login page

3. Login with seed data:
   - Email: `admin@neofox.in`
   - Password: `password123`

---

## Troubleshooting

### API returns 500 error
- Check PHP error logs in cPanel
- Verify database credentials in `.env`
- Check file permissions (644 for files, 755 for directories)

### CORS errors in browser
- Update `CORS_ORIGIN` in backend `.env`
- Make sure it matches your frontend URL exactly

### Login not working
- Check browser console for errors
- Verify API URL in frontend `.env`
- Test API directly: `curl https://api.yourdomain.com/api/v1/auth/login`

### 404 on page refresh
- Ensure `.htaccess` is uploaded
- Check if `mod_rewrite` is enabled

---

## Security Checklist

- [ ] Change all default passwords in seed data
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set `APP_DEBUG=false` in production
- [ ] Remove or secure phpMyAdmin access
- [ ] Set proper file permissions
- [ ] Enable cPanel firewall rules

---

## Default Login Credentials (CHANGE THESE!)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@neofox.in | password123 |
| PM | pm@neofox.in | password123 |
| Employee | editor@neofox.in | password123 |

**IMPORTANT:** Change these passwords immediately after first login!

---

## File Permissions

Set these permissions via cPanel File Manager or SSH:

```bash
# Directories: 755
find . -type d -exec chmod 755 {} \;

# Files: 644
find . -type f -exec chmod 644 {} \;

# .env file: 600 (more secure)
chmod 600 .env
```

---

## Optional: Cron Jobs

For scheduled tasks (like notifications), add in cPanel → Cron Jobs:

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/php /home/username/public_html/api/cron/notifications.php
```
