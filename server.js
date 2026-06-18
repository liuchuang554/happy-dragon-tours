(function(){try{var fs=require('fs');require('dotenv').config()}catch(e){}})()
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
try{require("./seed")}catch(e){}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use((req,res,next)=>{res.locals.url=req.path;next()});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'happy-dragon-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2) + ext); }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (req.session.admin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}

/* Public routes */
app.get('/', (req, res) => {
  const get = (key, def = '') => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key); return r ? r.value : def; };
  const s = {site_name:get('site_name'),site_url:get('site_url'),contact_email:get('contact_email'),contact_phone:get('contact_phone'),contact_phone2:get('contact_phone2'),contact_address:get('contact_address'),contact_hours:get('contact_hours')};
  const hero = db.prepare('SELECT * FROM hero_content LIMIT 1').get() || {};
  const about = db.prepare('SELECT * FROM about_content LIMIT 1').get() || {};
  const hotels = db.prepare('SELECT * FROM hotels ORDER BY sort_order').all();
  const tours = db.prepare('SELECT * FROM tours ORDER BY sort_order').all();
  const journeys = db.prepare('SELECT * FROM journeys ORDER BY sort_order').all();
  const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order').all();
  const gallery = db.prepare('SELECT * FROM gallery ORDER BY sort_order').all();
  res.render('public', { settings:s, hero, about, hotels, tours, journeys, testimonials, gallery });
});

app.get('/tour/:id', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.redirect('/#tours');
  const get = (k,d='')=>{const r=db.prepare('SELECT value FROM settings WHERE key = ?').get(k);return r?r.value:d;};
  const s = {site_name:get('site_name'),site_url:get('site_url'),contact_email:get('contact_email'),contact_phone:get('contact_phone'),contact_phone2:get('contact_phone2'),contact_address:get('contact_address'),contact_hours:get('contact_hours')};
  const tours = db.prepare('SELECT * FROM tours WHERE id != ? ORDER BY sort_order LIMIT 4').all(req.params.id);
  res.render('tour', { tour:tour, settings:s, relatedTours:tours });
});

app.get('/journey/:id', (req, res) => {
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  if (!journey) return res.redirect('/#journeys');
  const get = (k,d='')=>{const r=db.prepare('SELECT value FROM settings WHERE key = ?').get(k);return r?r.value:d;};
  const s = {site_name:get('site_name'),site_url:get('site_url'),contact_email:get('contact_email'),contact_phone:get('contact_phone'),contact_phone2:get('contact_phone2'),contact_address:get('contact_address'),contact_hours:get('contact_hours')};
  const journeys = db.prepare('SELECT * FROM journeys WHERE id != ? ORDER BY sort_order').all(req.params.id);
  res.render('journey', { journey, settings:s, relatedJourneys:journeys });
});

app.get('/hotel/:id', (req, res) => {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(req.params.id);
  if (!hotel) return res.redirect('/#hotels');
  const get = (k,d='')=>{const r=db.prepare('SELECT value FROM settings WHERE key = ?').get(k);return r?r.value:d;};
  const s = {site_name:get('site_name'),site_url:get('site_url'),contact_email:get('contact_email'),contact_phone:get('contact_phone'),contact_phone2:get('contact_phone2'),contact_address:get('contact_address'),contact_hours:get('contact_hours')};
  const hotels = db.prepare('SELECT * FROM hotels WHERE id != ? ORDER BY sort_order').all(req.params.id);
  res.render('hotel', { hotel, settings:s, relatedHotels:hotels });
});

app.post('/api/booking', (req, res) => {
  const { name, email, nationality, dates, guests, interest, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  db.prepare('INSERT INTO bookings (name,email,nationality,travel_dates,guests,interest,message) VALUES (?,?,?,?,?,?,?)').run(name, email, nationality||'', dates||'', guests||'', interest||'', message||'');
  res.json({ success: true });
});

/* Admin login */
app.get('/admin/login', (req, res) => { if (req.session.admin) return res.redirect('/admin'); res.render('admin/login', { error: null }); });
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const u = process.env.ADMIN_USERNAME || 'admin';
  const p = process.env.ADMIN_PASSWORD || 'admin123';
  if (username === u && password === p) { req.session.admin = { username }; return res.redirect('/admin'); }
  res.render('admin/login', { error: 'Invalid credentials' });
});
app.get('/admin/logout', (req, res) => { req.session.destroy(() => res.redirect('/admin/login')); });

/* Dashboard */
app.get('/admin', requireAuth, (req, res) => {
  const stats = {
    hotels: db.prepare('SELECT COUNT(*) as c FROM hotels').get().c,
    tours: db.prepare('SELECT COUNT(*) as c FROM tours').get().c,
    journeys: db.prepare('SELECT COUNT(*) as c FROM journeys').get().c,
    testimonials: db.prepare('SELECT COUNT(*) as c FROM testimonials').get().c,
    gallery: db.prepare('SELECT COUNT(*) as c FROM gallery').get().c,
    bookings: db.prepare('SELECT COUNT(*) as c FROM bookings').get().c,
    newBookings: db.prepare('SELECT COUNT(*) as c FROM bookings WHERE status = \'new\'').get().c,
    recentBookings: db.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5').all()
  };
  res.render('admin/dashboard', { stats, user: req.session.admin });
});

/* Hotels CRUD */
app.get('/admin/hotels', requireAuth, (req, res) => { res.render('admin/hotels', { hotels: db.prepare('SELECT * FROM hotels ORDER BY sort_order').all() }); });
app.get('/admin/hotels/new', requireAuth, (req, res) => { res.render('admin/hotel-form', { hotel: null }); });
app.get('/admin/hotels/edit/:id', requireAuth, (req, res) => {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(req.params.id);
  if (!hotel) return res.redirect('/admin/hotels');
  res.render('admin/hotel-form', { hotel });
});
app.post('/admin/hotels/save', requireAuth, upload.single('image'), (req, res) => {
  const { id, name, location, description, tags, sort_order } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (req.body.existing_image || '');
  if (id) {
    db.prepare('UPDATE hotels SET name=?,location=?,description=?,image=?,tags=?,sort_order=? WHERE id=?').run(name, location||'', description||'', image, tags||'', sort_order||0, id);
  } else {
    db.prepare('INSERT INTO hotels (name,location,description,image,tags,sort_order) VALUES (?,?,?,?,?,?)').run(name, location||'', description||'', image, tags||'', sort_order||0);
  }
  res.redirect('/admin/hotels');
});
app.get('/admin/hotels/delete/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM hotels WHERE id = ?').run(req.params.id); res.redirect('/admin/hotels'); });

/* Tours CRUD */
app.get('/admin/tours', requireAuth, (req, res) => { res.render('admin/tours', { tours: db.prepare('SELECT * FROM tours ORDER BY sort_order').all() }); });
app.get('/admin/tours/new', requireAuth, (req, res) => { res.render('admin/tour-form', { tour: null }); });
app.get('/admin/tours/edit/:id', requireAuth, (req, res) => { console.log('[DEBUG] Edit tour:', req.params.id, 'Session:', !!req.session.admin);
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.redirect('/admin/tours');
  res.render('admin/tour-form', { tour });
});
app.post('/admin/tours/save', requireAuth, upload.single('image'), (req, res) => {
  const { id, title, label, description, long_description, highlights, duration, tour_type, price, sort_order } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (req.body.existing_image || '');
  if (id) {
    db.prepare('UPDATE tours SET title=?,label=?,description=?,long_description=?,highlights=?,duration=?,tour_type=?,price=?,image=?,sort_order=? WHERE id=?').run(title, label||'', description||'', long_description||'', highlights||'', duration||'', tour_type||'', price||'', image, sort_order||0, id);
  } else {
    db.prepare('INSERT INTO tours (title,label,description,long_description,highlights,duration,tour_type,price,image,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)').run(title, label||'', description||'', long_description||'', highlights||'', duration||'', tour_type||'', price||'', image, sort_order||0);
  }
  res.redirect('/admin/tours');
});
app.get('/admin/tours/delete/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id); res.redirect('/admin/tours'); });

/* Journeys CRUD */
app.get('/admin/journeys', requireAuth, (req, res) => { res.render('admin/journeys', { journeys: db.prepare('SELECT * FROM journeys ORDER BY sort_order').all() }); });
app.get('/admin/journeys/new', requireAuth, (req, res) => { res.render('admin/journey-form', { journey: null }); });
app.get('/admin/journeys/edit/:id', requireAuth, (req, res) => {
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  if (!journey) return res.redirect('/admin/journeys');
  res.render('admin/journey-form', { journey });
});
app.post('/admin/journeys/save', requireAuth, upload.single('image'), (req, res) => {
  const { id, region, title, description, long_description, highlights, sort_order } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (req.body.existing_image || '');
  if (id) {
    db.prepare('UPDATE journeys SET region=?,title=?,description=?,long_description=?,highlights=?,image=?,sort_order=? WHERE id=?').run(region, title, description||'', long_description||'', highlights||'', image, sort_order||0, id);
  } else {
    db.prepare('INSERT INTO journeys (region,title,description,long_description,highlights,image,sort_order) VALUES (?,?,?,?,?,?,?)').run(region, title, description||'', long_description||'', highlights||'', image, sort_order||0);
  }
  res.redirect('/admin/journeys');
});
app.get('/admin/journeys/delete/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM journeys WHERE id = ?').run(req.params.id); res.redirect('/admin/journeys'); });

/* Testimonials CRUD */
app.get('/admin/testimonials', requireAuth, (req, res) => { res.render('admin/testimonials', { testimonials: db.prepare('SELECT * FROM testimonials ORDER BY sort_order').all() }); });
app.get('/admin/testimonials/new', requireAuth, (req, res) => { res.render('admin/testimonial-form', { testimonial: null }); });
app.get('/admin/testimonials/edit/:id', requireAuth, (req, res) => {
  const t = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (!t) return res.redirect('/admin/testimonials');
  res.render('admin/testimonial-form', { testimonial: t });
});
app.post('/admin/testimonials/save', requireAuth, (req, res) => {
  const { id, name, origin, avatar_initials, rating, text, sort_order } = req.body;
  if (id) {
    db.prepare('UPDATE testimonials SET name=?,origin=?,avatar_initials=?,rating=?,text=?,sort_order=? WHERE id=?').run(name, origin||'', avatar_initials||'', rating||5, text||'', sort_order||0, id);
  } else {
    db.prepare('INSERT INTO testimonials (name,origin,avatar_initials,rating,text,sort_order) VALUES (?,?,?,?,?,?)').run(name, origin||'', avatar_initials||'', rating||5, text||'', sort_order||0);
  }
  res.redirect('/admin/testimonials');
});
app.get('/admin/testimonials/delete/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id); res.redirect('/admin/testimonials'); });

/* Gallery */
app.get('/admin/gallery', requireAuth, (req, res) => { res.render('admin/gallery', { items: db.prepare('SELECT * FROM gallery ORDER BY sort_order').all() }); });
app.post('/admin/gallery/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.redirect('/admin/gallery');
  db.prepare('INSERT INTO gallery (filename, alt_text, sort_order) VALUES (?,?,?)').run(req.file.filename, req.body.alt_text || '', Date.now());
  res.redirect('/admin/gallery');
});
app.get('/admin/gallery/delete/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (item) {
    const fp = path.join(uploadDir, item.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  }
  res.redirect('/admin/gallery');
});

/* Bookings */
app.get('/admin/bookings', requireAuth, (req, res) => { res.render('admin/bookings', { bookings: db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all() }); });
app.get('/admin/bookings/mark/:id', requireAuth, (req, res) => { db.prepare('UPDATE bookings SET status = \'read\' WHERE id = ?').run(req.params.id); res.redirect('/admin/bookings'); });
app.get('/admin/bookings/delete/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id); res.redirect('/admin/bookings'); });

/* Content editing */
app.get('/admin/content', requireAuth, (req, res) => {
  const hero = db.prepare('SELECT * FROM hero_content LIMIT 1').get() || {};
  const about = db.prepare('SELECT * FROM about_content LIMIT 1').get() || {};
  const sets = {};
  db.prepare('SELECT * FROM settings').all().forEach(s => { sets[s.key] = s.value; });
  res.render('admin/content', { hero, about, settings:sets });
});

app.post('/admin/content/hero', requireAuth, (req, res) => {
  const { badge, title_line1, title_line2, subtitle, cta1_text, cta2_text } = req.body;
  const hero = db.prepare('SELECT * FROM hero_content LIMIT 1').get();
  if (hero) {
    db.prepare('UPDATE hero_content SET badge=?,title_line1=?,title_line2=?,subtitle=?,cta1_text=?,cta2_text=? WHERE id=?').run(badge, title_line1, title_line2, subtitle, cta1_text, cta2_text, hero.id);
  } else {
    db.prepare('INSERT INTO hero_content (badge,title_line1,title_line2,subtitle,cta1_text,cta2_text) VALUES (?,?,?,?,?,?)').run(badge, title_line1, title_line2, subtitle, cta1_text, cta2_text);
  }
  res.redirect('/admin/content');
});

app.post('/admin/content/about', requireAuth, (req, res) => {
  const { label, title, paragraph1, paragraph2, stat1_num, stat1_label, stat2_num, stat2_label, stat3_num, stat3_label } = req.body;
  const about = db.prepare('SELECT * FROM about_content LIMIT 1').get();
  if (about) {
    db.prepare('UPDATE about_content SET label=?,title=?,paragraph1=?,paragraph2=?,stat1_num=?,stat1_label=?,stat2_num=?,stat2_label=?,stat3_num=?,stat3_label=? WHERE id=?').run(label, title, paragraph1||'', paragraph2||'', stat1_num, stat1_label, stat2_num, stat2_label, stat3_num, stat3_label, about.id);
  } else {
    db.prepare('INSERT INTO about_content (label,title,paragraph1,paragraph2,stat1_num,stat1_label,stat2_num,stat2_label,stat3_num,stat3_label) VALUES (?,?,?,?,?,?,?,?,?,?)').run(label, title, paragraph1||'', paragraph2||'', stat1_num, stat1_label, stat2_num, stat2_label, stat3_num, stat3_label);
  }
  res.redirect('/admin/content');
});

app.post('/admin/content/settings', requireAuth, (req, res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)');
  ['site_name','site_url','contact_email','contact_phone','contact_phone2','contact_address','contact_hours'].forEach(k => {
    if (req.body[k] !== undefined) upd.run(k, req.body[k]);
  });
  res.redirect('/admin/content');
});

app.listen(PORT, '0.0.0.0', () => { setTimeout(function(){ try{require('./seed')}catch(e){} }, 3000);
  console.log('Happy Dragon Tours CMS running on http://localhost:' + PORT);
  console.log('Admin panel: http://localhost:' + PORT + '/admin');
  console.log('Login: ' + (process.env.ADMIN_USERNAME || 'admin') + ' / ' + (process.env.ADMIN_PASSWORD || 'admin123'));
});
