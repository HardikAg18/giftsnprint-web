# GiftsNPrint — Custom Printing & Corporate Gifting Platform

**A full-stack Node.js + MySQL website for a custom printing business.**

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MySQL (via `mysql2`) |
| Payments | Razorpay |
| Frontend | Vanilla HTML/CSS/JS |
| Auth | JWT (JSON Web Tokens) |
| Uploads | Multer |
| Email | Nodemailer |

---

## 📁 Project Structure

```
giftsnprint/
├── server.js                  # Main Express server
├── package.json
├── .env.example               # Environment variables template
├── database/
│   └── schema.sql             # Full database schema
├── server/
│   ├── config/database.js     # MySQL connection pool
│   ├── middleware/auth.js     # JWT authentication
│   └── routes/
│       ├── auth.js            # Admin login/logout
│       ├── products.js        # Product CRUD + categories
│       ├── orders.js          # Order management
│       ├── payment.js         # Razorpay integration
│       ├── contact.js         # Contact/Quote forms
│       └── reviews.js         # Customer reviews
├── public/                    # Frontend files (served at /)
│   ├── index.html             # Homepage
│   ├── about.html
│   ├── services.html
│   ├── products.html
│   ├── product-detail.html
│   ├── gallery.html
│   ├── contact.html
│   ├── quote.html
│   ├── cart.html
│   ├── checkout.html
│   ├── order-success.html
│   ├── 404.html
│   ├── category/
│   │   ├── custom-printing.html
│   │   ├── corporate-gifts.html
│   │   ├── awards-trophies.html
│   │   ├── promotional-items.html
│   │   └── advanced-printing.html
│   ├── css/style.css          # Main dark purple/gold theme
│   ├── js/
│   │   ├── main.js            # Navbar, animations, WhatsApp
│   │   ├── cart.js            # Cart management
│   │   ├── chatbot.js         # AI FAQ chatbot
│   │   ├── products.js        # Product listing & detail
│   │   └── payment.js         # Razorpay checkout
│   └── images/                # Category & hero images
└── admin/                     # Admin dashboard (served at /admin)
    ├── login.html
    ├── index.html             # Dashboard with stats
    ├── orders.html
    ├── products.html
    ├── customers.html
    ├── enquiries.html
    ├── reviews.html
    ├── settings.html
    ├── css/admin.css
    └── js/admin.js
```

---

## ⚙️ Local Setup

### 1. Install Dependencies
```bash
cd giftsnprint
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=giftsnprint
JWT_SECRET=your_very_secret_key_here
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
SITE_URL=http://localhost:3000
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

### 3. Set Up Database
```bash
mysql -u root -p < database/schema.sql
```

### 4. Run the Server
```bash
npm start
# or for development:
npm run dev
```

Visit: `http://localhost:3000`  
Admin: `http://localhost:3000/admin`

---

## 🌐 Hostinger Deployment Guide

### Step 1 — Purchase & Prepare Hosting

1. Buy a **Hostinger VPS** plan (KVM 1 or higher recommended)
2. Choose **Ubuntu 22.04** as OS during setup
3. Note your VPS IP, root password, and SSH credentials

### Step 2 — Connect via SSH

```bash
ssh root@YOUR_VPS_IP
```

### Step 3 — Install Node.js & MySQL

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install MySQL
apt install mysql-server -y
mysql_secure_installation

# Install PM2 (process manager)
npm install -g pm2
```

### Step 4 — Set Up MySQL Database

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database and user
CREATE DATABASE giftsnprint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gnpuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON giftsnprint.* TO 'gnpuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;

-- Import schema
mysql -u gnpuser -p giftsnprint < /var/www/giftsnprint/database/schema.sql
```

### Step 5 — Upload Project Files

**Option A: Using Git**
```bash
cd /var/www
git clone https://github.com/yourusername/giftsnprint.git
cd giftsnprint
```

**Option B: Using FileZilla (FTP/SFTP)**
1. Open FileZilla
2. Connect to your VPS: Host = `sftp://YOUR_VPS_IP`, Port = `22`
3. Upload the entire `giftsnprint` folder to `/var/www/giftsnprint/`

### Step 6 — Configure Environment

```bash
cd /var/www/giftsnprint
cp .env.example .env
nano .env
```

Fill in all values with your production credentials.

### Step 7 — Install Dependencies & Start

```bash
npm install --production
pm2 start server.js --name giftsnprint
pm2 startup
pm2 save
```

### Step 8 — Set Up Nginx Reverse Proxy

```bash
apt install nginx -y
nano /etc/nginx/sites-available/giftsnprint
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/giftsnprint /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 9 — SSL Certificate (HTTPS)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts — certbot auto-renews SSL
```

### Step 10 — Point Domain to VPS

In your domain registrar / Hostinger DNS panel:
- Add **A record**: `@` → `YOUR_VPS_IP`
- Add **A record**: `www` → `YOUR_VPS_IP`

DNS propagates in 10–60 minutes.

---

## 🔑 Admin Access

Default admin account is created via:
```sql
-- In schema.sql, an admin user is inserted with:
-- username: admin
-- password: Admin@123 (bcrypt hashed)
```

**Change the password immediately** after first login via Settings page.

Admin URL: `https://yourdomain.com/admin`

---

## 💳 Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Complete KYC verification
3. Get your **Key ID** and **Key Secret** from Dashboard → Settings → API Keys
4. For production, use **Live** keys; for testing use **Test** keys
5. Add webhook: Dashboard → Settings → Webhooks → `https://yourdomain.com/api/payment/webhook`

---

## 📱 WhatsApp Integration

Update the WhatsApp number in:
- `public/js/main.js` — `const WHATSAPP = '91XXXXXXXXXX';`
- `public/js/chatbot.js` — `const WHATSAPP_NUM = '91XXXXXXXXXX';`

---

## 🔧 PM2 Commands

```bash
pm2 status            # View running processes
pm2 logs giftsnprint  # View logs
pm2 restart giftsnprint  # Restart server
pm2 stop giftsnprint  # Stop server
```

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Gmail account
2. Generate an **App Password**: Google Account → Security → App Passwords
3. Add to `.env`: `EMAIL_USER=your@gmail.com` and `EMAIL_PASS=xxxx xxxx xxxx xxxx`

---

## 🛡️ Security Checklist

- [ ] Change default admin password
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Use production Razorpay keys
- [ ] Enable HTTPS via Let's Encrypt
- [ ] Set `SITE_URL` to your domain in `.env`
- [ ] Configure firewall: `ufw allow 22,80,443 && ufw enable`
- [ ] Keep Node.js and dependencies updated

---

## 📞 Support

**GiftsNPrint** — info@giftsnprint.com | +91 98765 43210

---

*Built with ❤️ for GiftsNPrint*
