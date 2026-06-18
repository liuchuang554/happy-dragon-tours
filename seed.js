require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('Seeding database...');

/* Hero content */
const hero = db.prepare(`SELECT id FROM hero_content LIMIT 1`).get();
if (!hero) {
  db.prepare(`INSERT INTO hero_content (badge, title_line1, title_line2, subtitle, cta1_text, cta2_text)
    VALUES ('Since 2008 · Beijing & Beyond', 'Discover China''s', 'Timeless Capital',
    'From the Great Wall to hidden hutong alleys, experience Beijing with premium accommodations and expertly curated day tours.',
    'Explore Tours', 'Book Now')`).run();
  console.log('  ✓ Hero content created');
}

/* About content */
const about = db.prepare(`SELECT id FROM about_content LIMIT 1`).get();
if (!about) {
  db.prepare(`INSERT INTO about_content (label, title, paragraph1, paragraph2,
    stat1_num, stat1_label, stat2_num, stat2_label, stat3_num, stat3_label)
    VALUES ('About Us', 'Your Gateway to China',
    'With over 15 years of experience, Happy Dragon Tours brings together premium accommodations and authentic travel experiences. We own and operate boutique hotels in central Beijing and offer expertly guided day tours to iconic landmarks.',
    'Through trusted partnerships with regional operators in Inner Mongolia and Tibet, we offer seamless extended journeys beyond Beijing—from the vast grasslands of the north to the roof of the world.',
    '15+', 'Years Experience', '5K+', 'Happy Guests', '40+', 'Destinations')`).run();
  console.log('  ✓ About content created');
}

/* Hotels */
const hotelCount = db.prepare(`SELECT COUNT(*) as c FROM hotels`).get().c;
if (hotelCount === 0) {
  const ins = db.prepare(`INSERT INTO hotels (name, location, description, tags, sort_order) VALUES (?,?,?,?,?)`);
  ins.run('Dragon Courtyard Hotel', 'Dongcheng District · 0.5 km to Forbidden City',
    'A restored siheyuan (courtyard mansion) with 28 elegantly appointed rooms, a tranquil garden teahouse, and rooftop terrace overlooking the Forbidden City.',
    'Free WiFi,Breakfast Included,Airport Shuttle,Concierge', 0);
  ins.run('Jade Garden Boutique Hotel', 'Chaoyang District · 10 min to Tiananmen Square',
    'A contemporary boutique property blending Ming dynasty aesthetics with sleek modern design. Features a rooftop bar with panoramic city views and a spa offering traditional Chinese treatments.',
    'Rooftop Bar,Spa,Fitness Center,24h Room Service', 1);
  console.log('  ✓ Hotels created');
}

/* Tours */
const tourCount = db.prepare(`SELECT COUNT(*) as c FROM tours`).get().c;
if (tourCount === 0) {
  const ins = db.prepare(`INSERT INTO tours (title, label, description, duration, tour_type, price, sort_order) VALUES (?,?,?,?,?,?,?)`);
  ins.run('Great Wall at Mutianyu', 'Best Seller', 'Visit the best-restored section of the Great Wall. Includes round-trip cable car and optional toboggan ride down.', 'Full day', 'Private or Group', '$89', 0);
  ins.run('Forbidden City & Tiananmen', 'Cultural', 'Walk through the world\'s largest palace complex with our expert historian guide.', 'Half day', 'Private or Group', '$59', 1);
  ins.run('Temple of Heaven & Hutongs', 'Local Life', 'Discover where Beijingers practice tai chi. Explore hutong alleyways by rickshaw with a local family visit.', 'Half day', 'Private Only', '$49', 2);
  ins.run('Summer Palace & Lama Temple', 'Scenic', 'A peaceful half-day exploring the imperial summer retreat then Beijing\'s most revered Tibetan Buddhist temple.', 'Half day', 'Private or Group', '$55', 3);
  console.log('  ✓ Tours created');
}

/* Journeys */
const journeyCount = db.prepare(`SELECT COUNT(*) as c FROM journeys`).get().c;
if (journeyCount === 0) {
  const ins = db.prepare(`INSERT INTO journeys (region, title, description, sort_order) VALUES (?,?,?,?)`);
  ins.run('Inner Mongolia', 'Grasslands & Gobi Desert', 'Ride horseback across the endless steppe, sleep in a traditional Mongolian yurt, and witness the Gobi Desert sunset. A 4-day cultural immersion.', 0);
  ins.run('Tibet', 'Lhasa & Everest Base Camp', 'Journey to the roof of the world. Visit the Potala Palace, Jokhang Temple, and travel across the Tibetan plateau to the base of Mount Everest.', 1);
  console.log('  ✓ Journeys created');
}

/* Testimonials */
const testimonialCount = db.prepare(`SELECT COUNT(*) as c FROM testimonials`).get().c;
if (testimonialCount === 0) {
  const ins = db.prepare(`INSERT INTO testimonials (name, origin, avatar_initials, rating, text, sort_order) VALUES (?,?,?,?,?,?)`);
  ins.run('Sarah Mitchell', 'United Kingdom', 'SM', 5, 'The Mutianyu Great Wall tour was flawlessly organized. Our guide Lily was knowledgeable and funny, and the toboggan ride down was an unexpected highlight. The Dragon Courtyard Hotel was stunning.', 0);
  ins.run('Michael & Patricia Lowe', 'Australia', 'ML', 5, 'Our family of five did the private Forbidden City tour and it was absolutely worth the upgrade. Our 10-year-old was captivated by the stories of emperors.', 1);
  ins.run('David Kim', 'Singapore', 'DK', 5, 'I travel to Beijing for business twice a year and always stay at the Jade Garden. The staff remembers my name, my preferred room, and my tea order. Flawless execution.', 2);
  console.log('  ✓ Testimonials created');
}

/* Gallery */
const galleryCount = db.prepare(`SELECT COUNT(*) as c FROM gallery`).get().c;
if (galleryCount === 0) {
  const ins = db.prepare(`INSERT INTO gallery (filename, alt_text, sort_order) VALUES (?,?,?)`);
  ins.run('gallery-1.jpg', 'Forbidden City', 0);
  ins.run('gallery-2.jpg', 'Great Wall', 1);
  ins.run('gallery-3.jpg', 'Beijing Hutong', 2);
  ins.run('gallery-4.jpg', 'Temple of Heaven', 3);
  console.log('  ✓ Gallery items created');
}

/* Settings */
const siteName = db.prepare(`SELECT value FROM settings WHERE key = 'site_name'`).get();
if (!siteName) {
  const ins = db.prepare(`INSERT INTO settings (key, value) VALUES (?,?)`);
  ins.run('site_name', process.env.SITE_NAME || 'Happy Dragon Tours');
  ins.run('site_url', process.env.SITE_URL || 'https://happydragontours.com');
  ins.run('contact_email', process.env.CONTACT_EMAIL || 'bookings@happydragontours.com');
  ins.run('contact_phone', process.env.CONTACT_PHONE || '+86 10 8888 8888');
  ins.run('contact_phone2', process.env.CONTACT_PHONE2 || '+86 139 1234 5678');
  ins.run('contact_address', process.env.CONTACT_ADDRESS || 'No. 18 Donghuamen Street, Dongcheng District, Beijing, China');
  ins.run('contact_hours', process.env.CONTACT_HOURS || 'Mon–Sat: 9:00 AM – 8:00 PM (CST)');
  console.log('  ✓ Settings created');
}

console.log('\nDatabase seeded successfully!');
console.log('Run: npm start\nto start the application.\n');
// process.exit(0) - removed for server startup;
