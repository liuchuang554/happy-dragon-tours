# Happy Dragon Tours CMS

Full-stack content management system for a Beijing travel business. Built with Node.js, Express, EJS, and SQLite.

## Features

- Public website with hero, about, hotels, tours, extended journeys, testimonials, gallery, and booking form
- Admin panel with login for managing all content
- Upload and manage images for hotels, tours, journeys, and gallery
- Booking management system (view, mark as read, delete)
- All content editable through admin interface (no code changes needed)

## Quick Start

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up environment**
   ```
   cp .env.example .env
   ```
   Edit `.env` with your settings (admin password, contact info, etc.)

3. **Seed the database**
   ```
   npm run seed
   ```

4. **Start the server**
   ```
   npm start
   ```

5. **Open in browser**
   - Public site: `http://localhost:3000`
   - Admin panel: `http://localhost:3000/admin`
   - Login: use the username/password from your `.env` file (default: `admin` / `admin123`)

## Deploying to Production

### Railway (Recommended)

1. Push this folder to a GitHub repository
2. Sign up at [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Add environment variables in Railway dashboard (copy from `.env.example`)
5. Railway will auto-detect Node.js and run `npm start`
6. Add your domain: Railway → Settings → Domains → `happydragontours.com`

### Render

1. Push to GitHub
2. Sign up at [render.com](https://render.com)
3. New Web Service → Connect your repo
4. Build Command: `npm install && npm run seed`
5. Start Command: `npm start`
6. Add environment variables in Render dashboard
7. Add custom domain in Render settings

### Custom VPS

1. Install Node.js 16+ on your server
2. Clone the repo: `git clone <your-repo-url>`
3. `cd happydragontours && npm install && npm run seed`
4. Set up `.env` with production values
5. Run with PM2: `npm install -g pm2 && pm2 start server.js --name hdt`
6. Set up Nginx reverse proxy and SSL with Certbot

## Managing Content

Once deployed, log in to `https://yourdomain.com/admin`:

- **Content** — Edit hero text, about section, contact info
- **Hotels** — Add/edit/delete hotels with images
- **Tours** — Add/edit/delete day tours with images
- **Journeys** — Add/edit/delete extended journeys with images
- **Reviews** — Manage customer testimonials
- **Gallery** — Upload and manage photos
- **Bookings** — View customer inquiries

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3)
- **Templating:** EJS
- **Auth:** Session-based (express-session)
- **File uploads:** Multer
- **Styling:** Custom CSS
- **Icons:** Lucide

## Files Structure

```
happydragontours/
├── server.js         ← Main Express server (all routes)
├── db.js             ← SQLite database setup
├── seed.js           ← Initial data seeder
├── .env              ← Environment config
├── package.json
├── views/
│   ├── public.ejs    ← Public website template
│   └── admin/        ← Admin panel templates
├── public/
│   ├── css/admin.css ← Admin styling
│   └── uploads/      ← Uploaded images
└── data/             ← SQLite database files
```

## Security Notes

- Change `ADMIN_PASSWORD` in `.env` before deploying
- Set a strong `SESSION_SECRET`
- For production, consider adding HTTPS (Railway/Render provide this automatically)
- The admin panel does not have IP restrictions — consider adding Cloudflare Access or VPN for extra security
"# happy-dragon-tours" 
