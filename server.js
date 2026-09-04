const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.raw({ type: ['audio/*', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed'], limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS headers for Vercel, preview deployments, and local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-room-token, x-filename');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health check endpoints for Cloud hosts (Render, Koyeb, Railway)
app.get(['/healthz', '/ping', '/health'], (req, res) => res.status(200).json({ ok: true, status: 'live' }));
app.head(['/healthz', '/ping', '/health', '/'], (req, res) => res.status(200).end());

// In-memory room and take storage
const rooms = new Map();
const takesStorage = new Map(); // key: `${roomCode}:${lineIndex}` -> { buffer, contentType, version }

// In-memory rate limiting map for DDoS/spam protection
const rateLimitMap = new Map();

function createRateLimiter(maxRequests, windowMs, message) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;

    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimitMap.set(key, record);

    if (record.count > maxRequests) {
      return res.status(429).json({ error: message || 'คำขอล้นกรอบเวลา กรุณารอครู่หนึ่ง (Too many requests)' });
    }

    next();
  };
}

// Clean up expired rate limiter keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) {
      rateLimitMap.delete(k);
    }
  }
}, 300000);

const roomCreateLimiter = createRateLimiter(200, 60000, 'สร้างห้องถี่เกินไป กรุณารอ 1 นาที (Room creation rate limit exceeded)');
const takeUploadLimiter = createRateLimiter(120, 60000, 'ส่งไฟล์เสียงถี่เกินไป กรุณารอครู่หนึ่ง (Take upload rate limit exceeded)');

// Room cache persistence for serverless/restart durability
const CACHE_DIR = path.join(require('os').tmpdir(), 'cv_rooms');
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {}

const ROOMS_CACHE_FILE = path.join(CACHE_DIR, 'rooms_state.json');

let isSavingCache = false;
let pendingSaveCache = false;

async function saveRoomsToCache() {
  if (isSavingCache) {
    pendingSaveCache = true;
    return;
  }
  isSavingCache = true;
  try {
    const list = [];
    for (const [code, r] of rooms.entries()) {
      if (r.players && r.players.length > 0) {
        list.push({
          ...r,
          tokens: Array.from(r.tokens.entries())
        });
      }
    }
    await fs.promises.writeFile(ROOMS_CACHE_FILE, JSON.stringify(list));
  } catch (e) {
  } finally {
    isSavingCache = false;
    if (pendingSaveCache) {
      pendingSaveCache = false;
      saveRoomsToCache();
    }
  }
}

function loadRoomsFromCache() {
  try {
    if (fs.existsSync(ROOMS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROOMS_CACHE_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.players && item.players.length > 0) {
            const room = {
              ...item,
              tokens: new Map(item.tokens || [])
            };
            rooms.set(room.code, room);
          }
        }
      }
    }
  } catch (e) {}
}
loadRoomsFromCache();

// Periodic cleanup interval: Purge inactive players, empty rooms, and expired/orphaned audio takes
setInterval(() => {
  let changed = false;
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (!room.players || room.players.length === 0 || (now - (room.createdAt || now)) > 86400000) {
      rooms.delete(code);
      changed = true;
      continue;
    }

    // Filter out players who haven't pinged in the last 60 seconds (closed tab / disconnected)
    const activePlayers = room.players.filter(p => {
      if (!p.lastSeen) return true; // Give grace period for newly joined players
      return (now - p.lastSeen) <= 60000;
    });

    if (activePlayers.length !== room.players.length) {
      room.players = activePlayers;
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        if (!room.players.some(p => p.isHost)) {
          room.players[0].isHost = true;
        }
      }
      changed = true;
    }
  }

  // Memory Auto-Pruning: Purge old audio takes (> 24 hours) or orphaned takes from deleted rooms
  for (const [key, takeData] of takesStorage.entries()) {
    const roomCode = key.split(':')[0];
    const isRoomActive = rooms.has(roomCode);
    const isExpired = takeData.createdAt && (now - takeData.createdAt > 86400000);
    if (!isRoomActive || isExpired) {
      takesStorage.delete(key);
    }
  }

  if (changed) {
    saveRoomsToCache();
  }
}, 5000);

// Web Voice Packs Directory
const PACKS_DIR = path.join(__dirname, 'packs');
try {
  if (!fs.existsSync(PACKS_DIR)) {
    fs.mkdirSync(PACKS_DIR, { recursive: true });
  }
} catch (e) {}

// Built-in Voice Packs metadata fallback for serverless & static hosting
const DEFAULT_PACKS = [
  {
    "id": "-__09bf5",
    "filename": "-__09bf5.zip",
    "title": "Custom Voice Clip #1",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Custom Voice Clip #1",
    "linesCount": 60,
    "characters": [],
    "size": 49126895,
    "sizeFormatted": "46.9 MB",
    "url": "/packs/-__09bf5.zip",
    "category": "Movie",
    "cover": "/pack-covers/-__09bf5.jpg"
  },
  {
    "id": "-__75374",
    "filename": "-__75374.zip",
    "title": "Custom Voice Clip #2",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Custom Voice Clip #2",
    "linesCount": 43,
    "characters": [],
    "size": 27857379,
    "sizeFormatted": "26.6 MB",
    "url": "/packs/-__75374.zip",
    "category": "Movie",
    "cover": "/pack-covers/-__75374.jpg"
  },
  {
    "id": "300_-_this_is_sparta_",
    "filename": "300_-_this_is_sparta_.zip",
    "title": "300: This is Sparta!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: 300: This is Sparta!",
    "linesCount": 13,
    "characters": [],
    "size": 297625319,
    "sizeFormatted": "283.8 MB",
    "url": "/packs/300_-_this_is_sparta_.zip",
    "category": "Movie",
    "cover": "/pack-covers/300_-_this_is_sparta_.png"
  },
  {
    "id": "annoying_orange_4a4e0",
    "filename": "annoying_orange_4a4e0.zip",
    "title": "Annoying Orange: Hey Apple!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Annoying Orange: Hey Apple!",
    "linesCount": 30,
    "characters": [],
    "size": 13952441,
    "sizeFormatted": "13.3 MB",
    "url": "/packs/annoying_orange_4a4e0.zip",
    "category": "Movie",
    "cover": "/pack-covers/annoying_orange_4a4e0.png"
  },
  {
    "id": "Are you the Strongest",
    "filename": "Are you the Strongest.zip",
    "title": "Jujutsu Kaisen: Are You The Strongest?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Are You The Strongest?",
    "linesCount": 16,
    "characters": [],
    "size": 25449640,
    "sizeFormatted": "24.3 MB",
    "url": "/packs/Are%20you%20the%20Strongest.zip",
    "category": "Anime",
    "cover": "/pack-covers/Are you the Strongest.png"
  },
  {
    "id": "attack_on_titan_-_you_traitor",
    "filename": "attack_on_titan_-_you_traitor.zip",
    "title": "Attack on Titan: You Traitor!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: You Traitor!",
    "linesCount": 27,
    "characters": [],
    "size": 188012205,
    "sizeFormatted": "179.3 MB",
    "url": "/packs/attack_on_titan_-_you_traitor.zip",
    "category": "Anime",
    "cover": "/pack-covers/attack_on_titan_-_you_traitor.png"
  },
  {
    "id": "avengers_arguing",
    "filename": "avengers_arguing.zip",
    "title": "Avengers: Arguing Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers: Arguing Scene",
    "linesCount": 21,
    "characters": [],
    "size": 208966886,
    "sizeFormatted": "199.3 MB",
    "url": "/packs/avengers_arguing.zip",
    "category": "Marvel",
    "cover": "/pack-covers/avengers_arguing.png"
  },
  {
    "id": "backrooms_-_dinner_scene_e80f0",
    "filename": "backrooms_-_dinner_scene_e80f0.zip",
    "title": "The Backrooms: Dinner Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Backrooms: Dinner Scene",
    "linesCount": 18,
    "characters": [],
    "size": 39495110,
    "sizeFormatted": "37.7 MB",
    "url": "/packs/backrooms_-_dinner_scene_e80f0.zip",
    "category": "Horror",
    "cover": "/pack-covers/backrooms_-_dinner_scene_e80f0.png"
  },
  {
    "id": "batman_interrogates_the_joker_-_the_dark_knight_96d29",
    "filename": "batman_interrogates_the_joker_-_the_dark_knight_96d29.zip",
    "title": "The Dark Knight: Batman Interrogates Joker",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Dark Knight: Batman Interrogates Joker",
    "linesCount": 1,
    "characters": [],
    "size": 74649260,
    "sizeFormatted": "71.2 MB",
    "url": "/packs/batman_interrogates_the_joker_-_the_dark_knight_96d29.zip",
    "category": "DC",
    "cover": "/pack-covers/batman_interrogates_the_joker_-_the_dark_knight_96d29.jpg"
  },
  {
    "id": "beyond_the_spiderverse_trailer_0d846",
    "filename": "beyond_the_spiderverse_trailer_0d846.zip",
    "title": "Spider-Man: Across the Spider-Verse",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man: Across the Spider-Verse",
    "linesCount": 54,
    "characters": [],
    "size": 108981486,
    "sizeFormatted": "103.9 MB",
    "url": "/packs/beyond_the_spiderverse_trailer_0d846.zip",
    "category": "Marvel",
    "cover": "/pack-covers/beyond_the_spiderverse_trailer_0d846.png"
  },
  {
    "id": "Dexter - Cargo Scene",
    "filename": "Dexter - Cargo Scene.zip",
    "title": "Dexter: Surprise Motherfucker!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Dexter: Surprise Motherfucker!",
    "linesCount": 21,
    "characters": [],
    "size": 38113883,
    "sizeFormatted": "36.3 MB",
    "url": "/packs/Dexter%20-%20Cargo%20Scene.zip",
    "category": "TV Series",
    "cover": "/pack-covers/Dexter - Cargo Scene.png"
  },
  {
    "id": "don_t_let_me_leave_murph",
    "filename": "don_t_let_me_leave_murph.zip",
    "title": "Interstellar: Don't Let Me Leave Murph!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Interstellar: Don't Let Me Leave Murph!",
    "linesCount": 20,
    "characters": [],
    "size": 37885013,
    "sizeFormatted": "36.1 MB",
    "url": "/packs/don_t_let_me_leave_murph.zip",
    "category": "Movie",
    "cover": "/pack-covers/don_t_let_me_leave_murph.jpg"
  },
  {
    "id": "Elsa Flees From Arendelle",
    "filename": "Elsa Flees From Arendelle.zip",
    "title": "Frozen: Elsa Flees From Arendelle",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Frozen: Elsa Flees From Arendelle",
    "linesCount": 63,
    "characters": [],
    "size": 138054924,
    "sizeFormatted": "131.7 MB",
    "url": "/packs/Elsa%20Flees%20From%20Arendelle.zip",
    "category": "Animation",
    "cover": "/pack-covers/Elsa Flees From Arendelle.png"
  },
  {
    "id": "engame",
    "filename": "engame.zip",
    "title": "Avengers: Endgame Final Battle",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers: Endgame Final Battle",
    "linesCount": 26,
    "characters": [],
    "size": 171845399,
    "sizeFormatted": "163.9 MB",
    "url": "/packs/engame.zip",
    "category": "Marvel",
    "cover": "/pack-covers/engame.png"
  },
  {
    "id": "eren_manipulates",
    "filename": "eren_manipulates.zip",
    "title": "Attack on Titan: Eren Manipulates Grisha",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: Eren Manipulates Grisha",
    "linesCount": 19,
    "characters": [],
    "size": 72909518,
    "sizeFormatted": "69.5 MB",
    "url": "/packs/eren_manipulates.zip",
    "category": "Anime",
    "cover": "/pack-covers/eren_manipulates.png"
  },
  {
    "id": "erwin_s_plan_aot_3_",
    "filename": "erwin_s_plan_aot_3_.zip",
    "title": "Attack on Titan: Erwin's Charge",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: Erwin's Charge",
    "linesCount": 55,
    "characters": [],
    "size": 72463513,
    "sizeFormatted": "69.1 MB",
    "url": "/packs/erwin_s_plan_aot_3_.zip",
    "category": "Anime",
    "cover": "/pack-covers/erwin_s_plan_aot_3_.jpg"
  },
  {
    "id": "evil_dead_rise_bande_annonce_vf_",
    "filename": "evil_dead_rise_bande_annonce_vf_.zip",
    "title": "Evil Dead Rise: Official Trailer",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Evil Dead Rise: Official Trailer",
    "linesCount": 37,
    "characters": [],
    "size": 40066671,
    "sizeFormatted": "38.2 MB",
    "url": "/packs/evil_dead_rise_bande_annonce_vf_.zip",
    "category": "Horror",
    "cover": "/pack-covers/evil_dead_rise_bande_annonce_vf_.jpg"
  },
  {
    "id": "forrest_gump_-_life_is_like_a_box_of_chocolates",
    "filename": "forrest_gump_-_life_is_like_a_box_of_chocolates.zip",
    "title": "Forrest Gump: Box of Chocolates",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Forrest Gump: Box of Chocolates",
    "linesCount": 12,
    "characters": [],
    "size": 53627602,
    "sizeFormatted": "51.1 MB",
    "url": "/packs/forrest_gump_-_life_is_like_a_box_of_chocolates.zip",
    "category": "Movie",
    "cover": "/pack-covers/forrest_gump_-_life_is_like_a_box_of_chocolates.jpg"
  },
  {
    "id": "GIVE ME THE BALL",
    "filename": "GIVE ME THE BALL.zip",
    "title": "Kuroko no Basket: Give Me The Ball!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kuroko no Basket: Give Me The Ball!",
    "linesCount": 25,
    "characters": [],
    "size": 246633065,
    "sizeFormatted": "235.2 MB",
    "url": "/packs/GIVE%20ME%20THE%20BALL.zip",
    "category": "Anime",
    "cover": "/pack-covers/GIVE ME THE BALL.png"
  },
  {
    "id": "GOTG Vol 2 - Now I Know That Sounds Bad",
    "filename": "GOTG Vol 2 - Now I Know That Sounds Bad.zip",
    "title": "Guardians of the Galaxy Vol 2: Sounds Bad",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians of the Galaxy Vol 2: Sounds Bad",
    "linesCount": 24,
    "characters": [],
    "size": 236342447,
    "sizeFormatted": "225.4 MB",
    "url": "/packs/GOTG%20Vol%202%20-%20Now%20I%20Know%20That%20Sounds%20Bad.zip",
    "category": "Marvel",
    "cover": "/pack-covers/GOTG Vol 2 - Now I Know That Sounds Bad.png"
  },
  {
    "id": "Guardians meet avengers",
    "filename": "Guardians meet avengers.zip",
    "title": "Guardians meet avengers",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians meet avengers",
    "linesCount": 43,
    "characters": [],
    "size": 79137929,
    "sizeFormatted": "75.5 MB",
    "url": "/packs/Guardians%20meet%20avengers.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Guardians meet avengers.png"
  },
  {
    "id": "guardians_meet_avengers",
    "filename": "guardians_meet_avengers.zip",
    "title": "Guardians Meet Avengers",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians Meet Avengers",
    "linesCount": 43,
    "characters": [],
    "size": 79059303,
    "sizeFormatted": "75.4 MB",
    "url": "/packs/guardians_meet_avengers.zip",
    "category": "Marvel",
    "cover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop"
  },
  {
    "id": "guardians_of_the_galaxy_vol_3_i_",
    "filename": "guardians_of_the_galaxy_vol_3_i_.zip",
    "title": "Guardians of the Galaxy Vol 3: Final Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians of the Galaxy Vol 3: Final Scene",
    "linesCount": 29,
    "characters": [],
    "size": 24195306,
    "sizeFormatted": "23.1 MB",
    "url": "/packs/guardians_of_the_galaxy_vol_3_i_.zip",
    "category": "Marvel",
    "cover": "/pack-covers/guardians_of_the_galaxy_vol_3_i_.jpg"
  },
  {
    "id": "harrypotterduel",
    "filename": "harrypotterduel.zip",
    "title": "Harry Potter: Duelling Club",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Duelling Club",
    "linesCount": 28,
    "characters": [],
    "size": 179428633,
    "sizeFormatted": "171.1 MB",
    "url": "/packs/harrypotterduel.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harrypotterduel.png"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_1",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_1.zip",
    "title": "Harry Potter 4: Harry vs Voldemort Part 1",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter 4: Harry vs Voldemort Part 1",
    "linesCount": 43,
    "characters": [],
    "size": 67414873,
    "sizeFormatted": "64.3 MB",
    "url": "/packs/harry_potter_4_-_harry_vs_voldemort_pt_1.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_4_-_harry_vs_voldemort_pt_1.png"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_2",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_2.zip",
    "title": "Harry Potter 4: Harry vs Voldemort Part 2",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter 4: Harry vs Voldemort Part 2",
    "linesCount": 35,
    "characters": [],
    "size": 121083320,
    "sizeFormatted": "115.5 MB",
    "url": "/packs/harry_potter_4_-_harry_vs_voldemort_pt_2.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_4_-_harry_vs_voldemort_pt_2.png"
  },
  {
    "id": "harry_potter_train_scene",
    "filename": "harry_potter_train_scene.zip",
    "title": "Harry Potter: Hogwarts Express Train",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Hogwarts Express Train",
    "linesCount": 16,
    "characters": [],
    "size": 20293488,
    "sizeFormatted": "19.4 MB",
    "url": "/packs/harry_potter_train_scene.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_train_scene.jpg"
  },
  {
    "id": "homelander_vs_butcher",
    "filename": "homelander_vs_butcher.zip",
    "title": "The Boys: Homelander vs Butcher",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Boys: Homelander vs Butcher",
    "linesCount": 7,
    "characters": [],
    "size": 18008127,
    "sizeFormatted": "17.2 MB",
    "url": "/packs/homelander_vs_butcher.zip",
    "category": "TV Series",
    "cover": "/pack-covers/homelander_vs_butcher.jpg"
  },
  {
    "id": "i-m-tired-boss-the-green-mile-1999-nominee",
    "filename": "i-m-tired-boss-the-green-mile-1999-nominee.zip",
    "title": "The Green Mile: I'm Tired Boss",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Green Mile: I'm Tired Boss",
    "linesCount": 43,
    "characters": [],
    "size": 23288565,
    "sizeFormatted": "22.2 MB",
    "url": "/packs/i-m-tired-boss-the-green-mile-1999-nominee.zip",
    "category": "Movie",
    "cover": "/pack-covers/i-m-tired-boss-the-green-mile-1999-nominee.jpg"
  },
  {
    "id": "ichigo_vs_byakuya_choicervoicer_54255",
    "filename": "ichigo_vs_byakuya_choicervoicer_54255.zip",
    "title": "Bleach: Ichigo vs Byakuya Bankai",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Bleach: Ichigo vs Byakuya Bankai",
    "linesCount": 19,
    "characters": [],
    "size": 61226559,
    "sizeFormatted": "58.4 MB",
    "url": "/packs/ichigo_vs_byakuya_choicervoicer_54255.zip",
    "category": "Anime",
    "cover": "/pack-covers/ichigo_vs_byakuya_choicervoicer_54255.png"
  },
  {
    "id": "incredibles_-_im_thirsty",
    "filename": "incredibles_-_im_thirsty.zip",
    "title": "The Incredibles: Where is My Super Suit?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Incredibles: Where is My Super Suit?",
    "linesCount": 27,
    "characters": [],
    "size": 67458892,
    "sizeFormatted": "64.3 MB",
    "url": "/packs/incredibles_-_im_thirsty.zip",
    "category": "Animation",
    "cover": "/pack-covers/incredibles_-_im_thirsty.png"
  },
  {
    "id": "invincible_-_are_you_sure",
    "filename": "invincible_-_are_you_sure.zip",
    "title": "Invincible: Think Mark!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Invincible: Think Mark!",
    "linesCount": 11,
    "characters": [],
    "size": 11566301,
    "sizeFormatted": "11.0 MB",
    "url": "/packs/invincible_-_are_you_sure.zip",
    "category": "Movie",
    "cover": "/pack-covers/invincible_-_are_you_sure.png"
  },
  {
    "id": "it-2017-pennywise-meets-georgie",
    "filename": "it-2017-pennywise-meets-georgie.zip",
    "title": "IT (2017): Pennywise Meets Georgie",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: IT (2017): Pennywise Meets Georgie",
    "linesCount": 34,
    "characters": [],
    "size": 39662490,
    "sizeFormatted": "37.8 MB",
    "url": "/packs/it-2017-pennywise-meets-georgie.zip",
    "category": "Horror",
    "cover": "/pack-covers/it-2017-pennywise-meets-georgie.jpg"
  },
  {
    "id": "i_robot_-_can_you_4c11c",
    "filename": "i_robot_-_can_you_4c11c.zip",
    "title": "I, Robot: Can a Robot Write a Symphony?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: I, Robot: Can a Robot Write a Symphony?",
    "linesCount": 4,
    "characters": [],
    "size": 3868945,
    "sizeFormatted": "3.7 MB",
    "url": "/packs/i_robot_-_can_you_4c11c.zip",
    "category": "Movie",
    "cover": "/pack-covers/i_robot_-_can_you_4c11c.png"
  },
  {
    "id": "jotaro_vs_dio",
    "filename": "jotaro_vs_dio.zip",
    "title": "JoJo's Bizarre Adventure: Jotaro vs DIO",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: JoJo's Bizarre Adventure: Jotaro vs DIO",
    "linesCount": 25,
    "characters": [],
    "size": 105616788,
    "sizeFormatted": "100.7 MB",
    "url": "/packs/jotaro_vs_dio.zip",
    "category": "Anime",
    "cover": "/pack-covers/jotaro_vs_dio.png"
  },
  {
    "id": "kung_fu_panda_-_oogway_ascends",
    "filename": "kung_fu_panda_-_oogway_ascends.zip",
    "title": "Kung Fu Panda: Master Oogway Ascends",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kung Fu Panda: Master Oogway Ascends",
    "linesCount": 58,
    "characters": [],
    "size": 87842233,
    "sizeFormatted": "83.8 MB",
    "url": "/packs/kung_fu_panda_-_oogway_ascends.zip",
    "category": "Animation",
    "cover": "/pack-covers/kung_fu_panda_-_oogway_ascends.png"
  },
  {
    "id": "kung_fu_panda_-_shifu_vs_tai_lung",
    "filename": "kung_fu_panda_-_shifu_vs_tai_lung.zip",
    "title": "Kung Fu Panda: Shifu vs Tai Lung",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kung Fu Panda: Shifu vs Tai Lung",
    "linesCount": 90,
    "characters": [],
    "size": 132790504,
    "sizeFormatted": "126.6 MB",
    "url": "/packs/kung_fu_panda_-_shifu_vs_tai_lung.zip",
    "category": "Animation",
    "cover": "/pack-covers/kung_fu_panda_-_shifu_vs_tai_lung.png"
  },
  {
    "id": "light_yagami_perfect_victory",
    "filename": "light_yagami_perfect_victory.zip",
    "title": "light yagami perfect victory",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: light yagami perfect victory",
    "linesCount": 14,
    "characters": [],
    "size": 37504302,
    "sizeFormatted": "35.8 MB",
    "url": "/packs/light_yagami_perfect_victory.zip",
    "category": "Movie",
    "cover": "/pack-covers/light_yagami_perfect_victory.png"
  },
  {
    "id": "Loki in Germany Avengers 2012",
    "filename": "Loki in Germany Avengers 2012.zip",
    "title": "Avengers (2012): Loki in Germany",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers (2012): Loki in Germany",
    "linesCount": 42,
    "characters": [],
    "size": 56946847,
    "sizeFormatted": "54.3 MB",
    "url": "/packs/Loki%20in%20Germany%20Avengers%202012.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Loki in Germany Avengers 2012.png"
  },
  {
    "id": "minions_-_banana_song_barbara_ann_",
    "filename": "minions_-_banana_song_barbara_ann_.zip",
    "title": "Minions: Banana Song",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Minions: Banana Song",
    "linesCount": 5,
    "characters": [],
    "size": 47717035,
    "sizeFormatted": "45.5 MB",
    "url": "/packs/minions_-_banana_song_barbara_ann_.zip",
    "category": "Animation",
    "cover": "/pack-covers/minions_-_banana_song_barbara_ann_.png"
  },
  {
    "id": "monsters_inc_-_waternoose_scandal_scene_6a3b5",
    "filename": "monsters_inc_-_waternoose_scandal_scene_6a3b5.zip",
    "title": "Monsters, Inc.: Waternoose Scandal",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Monsters, Inc.: Waternoose Scandal",
    "linesCount": 36,
    "characters": [],
    "size": 100160645,
    "sizeFormatted": "95.5 MB",
    "url": "/packs/monsters_inc_-_waternoose_scandal_scene_6a3b5.zip",
    "category": "Animation",
    "cover": "/pack-covers/monsters_inc_-_waternoose_scandal_scene_6a3b5.png"
  },
  {
    "id": "no_way_home",
    "filename": "no_way_home.zip",
    "title": "Spider-Man: No Way Home",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man: No Way Home",
    "linesCount": 70,
    "characters": [],
    "size": 81895474,
    "sizeFormatted": "78.1 MB",
    "url": "/packs/no_way_home.zip",
    "category": "Marvel",
    "cover": "/pack-covers/no_way_home.png"
  },
  {
    "id": "obsession_-_diner_scene_040e7",
    "filename": "obsession_-_diner_scene_040e7.zip",
    "title": "Whiplash: Diner Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Whiplash: Diner Scene",
    "linesCount": 22,
    "characters": [],
    "size": 20416681,
    "sizeFormatted": "19.5 MB",
    "url": "/packs/obsession_-_diner_scene_040e7.zip",
    "category": "Movie",
    "cover": "/pack-covers/obsession_-_diner_scene_040e7.png"
  },
  {
    "id": "pulp_fiction_-_say_what_again",
    "filename": "pulp_fiction_-_say_what_again.zip",
    "title": "Pulp Fiction: Say What Again!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Pulp Fiction: Say What Again!",
    "linesCount": 38,
    "characters": [],
    "size": 36923034,
    "sizeFormatted": "35.2 MB",
    "url": "/packs/pulp_fiction_-_say_what_again.zip",
    "category": "Movie",
    "cover": "/pack-covers/pulp_fiction_-_say_what_again.png"
  },
  {
    "id": "Spider-Man 2 - Could You Pay Me In Advance",
    "filename": "Spider-Man 2 - Could You Pay Me In Advance.zip",
    "title": "Spider-Man 2: Pay Me In Advance",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man 2: Pay Me In Advance",
    "linesCount": 15,
    "characters": [],
    "size": 46832703,
    "sizeFormatted": "44.7 MB",
    "url": "/packs/Spider-Man%202%20-%20Could%20You%20Pay%20Me%20In%20Advance.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Spider-Man 2 - Could You Pay Me In Advance.png"
  },
  {
    "id": "spider-man_3_rent_scene_modpack",
    "filename": "spider-man_3_rent_scene_modpack.zip",
    "title": "Spider-Man 3: Give Me Rent!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man 3: Give Me Rent!",
    "linesCount": 4,
    "characters": [],
    "size": 43404519,
    "sizeFormatted": "41.4 MB",
    "url": "/packs/spider-man_3_rent_scene_modpack.zip",
    "category": "Marvel",
    "cover": "/pack-covers/spider-man_3_rent_scene_modpack.png"
  },
  {
    "id": "star_wars-i_am_your_father",
    "filename": "star_wars-i_am_your_father.zip",
    "title": "Star Wars: I Am Your Father",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Star Wars: I Am Your Father",
    "linesCount": 19,
    "characters": [],
    "size": 43457409,
    "sizeFormatted": "41.4 MB",
    "url": "/packs/star_wars-i_am_your_father.zip",
    "category": "Movie",
    "cover": "/pack-covers/star_wars-i_am_your_father.png"
  },
  {
    "id": "star_wars_-_you_turned_her_against_me_20ba1",
    "filename": "star_wars_-_you_turned_her_against_me_20ba1.zip",
    "title": "Star Wars: You Turned Her Against Me!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Star Wars: You Turned Her Against Me!",
    "linesCount": 17,
    "characters": [],
    "size": 50355311,
    "sizeFormatted": "48.0 MB",
    "url": "/packs/star_wars_-_you_turned_her_against_me_20ba1.zip",
    "category": "Movie",
    "cover": "/pack-covers/star_wars_-_you_turned_her_against_me_20ba1.png"
  },
  {
    "id": "sukuna_awakens_in_shibuya_for_windows_zip_",
    "filename": "sukuna_awakens_in_shibuya_for_windows_zip_.zip",
    "title": "Jujutsu Kaisen: Sukuna Awakens in Shibuya",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Sukuna Awakens in Shibuya",
    "linesCount": 8,
    "characters": [],
    "size": 28070969,
    "sizeFormatted": "26.8 MB",
    "url": "/packs/sukuna_awakens_in_shibuya_for_windows_zip_.zip",
    "category": "Anime",
    "cover": "/pack-covers/sukuna_awakens_in_shibuya_for_windows_zip_.png"
  },
  {
    "id": "the_good_doctor_-_i_am_a_surgeon",
    "filename": "the_good_doctor_-_i_am_a_surgeon.zip",
    "title": "The Good Doctor: I Am A Surgeon!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Good Doctor: I Am A Surgeon!",
    "linesCount": 24,
    "characters": [],
    "size": 62961885,
    "sizeFormatted": "60.0 MB",
    "url": "/packs/the_good_doctor_-_i_am_a_surgeon.zip",
    "category": "TV Series",
    "cover": "/pack-covers/the_good_doctor_-_i_am_a_surgeon.png"
  },
  {
    "id": "Toji vs Gojo",
    "filename": "Toji vs Gojo.zip",
    "title": "Jujutsu Kaisen: Toji vs Gojo",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Toji vs Gojo",
    "linesCount": 30,
    "characters": [],
    "size": 27091222,
    "sizeFormatted": "25.8 MB",
    "url": "/packs/Toji%20vs%20Gojo.zip",
    "category": "Anime",
    "cover": "/pack-covers/Toji vs Gojo.png"
  },
  {
    "id": "twilight_-_i_know_what_you_are_d9110",
    "filename": "twilight_-_i_know_what_you_are_d9110.zip",
    "title": "Twilight: I Know What You Are",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Twilight: I Know What You Are",
    "linesCount": 21,
    "characters": [],
    "size": 104816547,
    "sizeFormatted": "100.0 MB",
    "url": "/packs/twilight_-_i_know_what_you_are_d9110.zip",
    "category": "Movie",
    "cover": "/pack-covers/twilight_-_i_know_what_you_are_d9110.png"
  },
  {
    "id": "what_is_your_name_5718b",
    "filename": "what_is_your_name_5718b.zip",
    "title": "Your Name (Kimi no Na wa)",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Your Name (Kimi no Na wa)",
    "linesCount": 22,
    "characters": [],
    "size": 47312596,
    "sizeFormatted": "45.1 MB",
    "url": "/packs/what_is_your_name_5718b.zip",
    "category": "Anime",
    "cover": "/pack-covers/what_is_your_name_5718b.png"
  },
  {
    "id": "white_chicks_-_a_thousand_miles",
    "filename": "white_chicks_-_a_thousand_miles.zip",
    "title": "White Chicks: A Thousand Miles",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: White Chicks: A Thousand Miles",
    "linesCount": 15,
    "characters": [],
    "size": 31793098,
    "sizeFormatted": "30.3 MB",
    "url": "/packs/white_chicks_-_a_thousand_miles.zip",
    "category": "Movie",
    "cover": "/pack-covers/white_chicks_-_a_thousand_miles.png"
  },
  {
    "id": "will_byers_coming_out",
    "filename": "will_byers_coming_out.zip",
    "title": "Stranger Things: Will Byers Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Stranger Things: Will Byers Scene",
    "linesCount": 30,
    "characters": [],
    "size": 108735142,
    "sizeFormatted": "103.7 MB",
    "url": "/packs/will_byers_coming_out.zip",
    "category": "TV Series",
    "cover": "/pack-covers/will_byers_coming_out.jpg"
  },
  {
    "id": "you_are_a_toy",
    "filename": "you_are_a_toy.zip",
    "title": "Toy Story: You Are A Toy!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Toy Story: You Are A Toy!",
    "linesCount": 10,
    "characters": [],
    "size": 15835095,
    "sizeFormatted": "15.1 MB",
    "url": "/packs/you_are_a_toy.zip",
    "category": "Animation",
    "cover": "/pack-covers/you_are_a_toy.png"
  },
  {
    "id": "you_shall_not_pass_lotr_scene",
    "filename": "you_shall_not_pass_lotr_scene.zip",
    "title": "Lord of the Rings: You Shall Not Pass!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Lord of the Rings: You Shall Not Pass!",
    "linesCount": 17,
    "characters": [],
    "size": 48920992,
    "sizeFormatted": "46.7 MB",
    "url": "/packs/you_shall_not_pass_lotr_scene.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/you_shall_not_pass_lotr_scene.jpg"
  },
  {
    "id": "ytdowncom_youtube_dementor_on_bo",
    "filename": "ytdowncom_youtube_dementor_on_bo.zip",
    "title": "Harry Potter: Dementor on the Train",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Dementor on the Train",
    "linesCount": 23,
    "characters": [],
    "size": 101232070,
    "sizeFormatted": "96.5 MB",
    "url": "/packs/ytdowncom_youtube_dementor_on_bo.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/ytdowncom_youtube_dementor_on_bo.jpg"
  },
  {
    "id": "yu_and_mi_-_rush_hour",
    "filename": "yu_and_mi_-_rush_hour.zip",
    "title": "Rush Hour 3: Yu and Mi Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Rush Hour 3: Yu and Mi Scene",
    "linesCount": 24,
    "characters": [],
    "size": 37954983,
    "sizeFormatted": "36.2 MB",
    "url": "/packs/yu_and_mi_-_rush_hour.zip",
    "category": "Movie",
    "cover": "/pack-covers/yu_and_mi_-_rush_hour.png"
  }
];

let fflateModule = null;
try {
  fflateModule = require(path.resolve(__dirname, 'vendor/fflate/index.js'));
} catch (e) {
  console.warn('fflate not available in server for metadata parsing:', e.message);
}

function parsePackMetadata(zipPath) {
  const baseName = path.basename(zipPath, '.zip');
  const filename = path.basename(zipPath);
  const stat = fs.statSync(zipPath);

  let title = baseName.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  let author = 'Choicer Voicer';
  let description = '';
  let linesCount = 0;
  const characters = new Set();

  if (fflateModule) {
    try {
      const buf = fs.readFileSync(zipPath);
      const unzipped = fflateModule.unzipSync(new Uint8Array(buf));
      for (const entryName in unzipped) {
        const lower = entryName.toLowerCase();
        if (lower.includes('_pack_info.txt') || lower.includes('_pack_info.ini') || lower.endsWith('pack.ini') || lower.endsWith('pack_info.txt')) {
          const text = fflateModule.strFromU8(unzipped[entryName]);
          for (const line of text.split('\n')) {
            const [k, ...v] = line.split('=');
            if (k && v.length) {
              const key = k.trim().toLowerCase();
              const val = v.join('=').trim().replace(/^["']|["']$/g, '');
              if (key === 'title') title = val;
              if (key === 'author' || key === 'authors' || key === 'credits') author = val;
              if (key === 'description' || key === 'desc') description = val;
            }
          }
        } else if ((lower.endsWith('.txt') || lower.endsWith('.ini')) && !lower.startsWith('.') && !lower.includes('__macosx')) {
          linesCount++;
          const text = fflateModule.strFromU8(unzipped[entryName]);
          for (const line of text.split('\n')) {
            const [k, ...v] = line.split('=');
            if (k && v.length) {
              const key = k.trim().toLowerCase();
              const val = v.join('=').trim().replace(/^["']|["']$/g, '');
              if (key === 'speaker' || key === 'character' || key === 'dub_characters') {
                const speaker = val.replace(/[\[\]"']/g, '').trim();
                if (speaker) characters.add(speaker);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error reading zip metadata for', filename, err.stack || err.message);
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  console.log(`[PackMeta] ${filename} -> lines: ${linesCount}, speakers: ${[...characters].join(', ')}`);

  return {
    id: baseName,
    filename: filename,
    title: title,
    author: author,
    description: description,
    linesCount: linesCount,
    characters: [...characters],
    size: stat.size,
    sizeFormatted: formatBytes(stat.size),
    updatedAt: stat.mtimeMs,
    url: process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${encodeURIComponent(filename)}`
      : `/packs/${encodeURIComponent(filename)}`
  };
}


// Stream proxy endpoint for downloading voice packs from Cloudflare R2 safely without CORS blocks
app.get('/packs/:filename', async (req, res) => {
  const rawFilename = req.params.filename || '';
  let decodedFilename = rawFilename;
  try {
    decodedFilename = decodeURIComponent(rawFilename);
  } catch (e) {}

  const r2BaseUrl = (process.env.R2_PUBLIC_URL || 'https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev').replace(/\/$/, '');

  const candidates = Array.from(new Set([
    rawFilename,
    decodedFilename,
    decodedFilename.replace(/_/g, ' '),
    decodedFilename.replace(/ /g, '_'),
  ]));

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Content-Type', 'application/zip');
  res.header('Cache-Control', 'public, max-age=86400');

  for (const candidate of candidates) {
    const r2Url = `${r2BaseUrl}/${encodeURIComponent(candidate)}`;
    const success = await new Promise((resolve) => {
      const clientReq = require('https').get(r2Url, (r2Res) => {
        if (r2Res.statusCode === 200) {
          if (r2Res.headers['content-length']) {
            res.header('Content-Length', r2Res.headers['content-length']);
          }
          r2Res.pipe(res);
          resolve(true);
        } else {
          r2Res.resume();
          resolve(false);
        }
      });
      clientReq.on('error', () => resolve(false));
    });

    if (success) return;
  }

  // Fallback to local packs folder
  for (const candidate of candidates) {
    const localPath = path.join(PACKS_DIR, candidate);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    const publicLocalPath = path.join(__dirname, 'public', 'packs', candidate);
    if (fs.existsSync(publicLocalPath)) {
      return res.sendFile(publicLocalPath);
    }
  }

  res.status(404).json({ error: 'Pack zip file not found' });
});

// 0. Web Voice Packs APIs
app.get('/api/packs', (req, res) => {
  try {
    const packMap = new Map();

    // 1. First add all 59 Cloudflare R2 default packs
    if (Array.isArray(DEFAULT_PACKS)) {
      for (const p of DEFAULT_PACKS) {
        if (p && (p.id || p.filename)) {
          packMap.set(p.id || p.filename, p);
        }
      }
    }

    // 2. Merge local files in PACKS_DIR if any exist
    if (fs.existsSync(PACKS_DIR)) {
      const files = fs.readdirSync(PACKS_DIR)
        .filter(f => f.toLowerCase().endsWith('.zip') && !f.startsWith('.'));
      for (const file of files) {
        const meta = parsePackMetadata(path.join(PACKS_DIR, file));
        if (meta && meta.id) {
          const existing = packMap.get(meta.id) || {};
          packMap.set(meta.id, {
            ...meta,
            title: existing.title || meta.title,
            category: existing.category || 'Movie',
            cover: existing.cover || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'
          });
        }
      }
    }

    const packs = Array.from(packMap.values());

    // Sort: guardians_meet_avengers first or alphabetical
    packs.sort((a, b) => {
      if (a.filename === 'guardians_meet_avengers.zip') return -1;
      if (b.filename === 'guardians_meet_avengers.zip') return 1;
      return (a.title || '').localeCompare(b.title || '');
    });

    res.json({ ok: true, packs });
  } catch (err) {
    res.json({ ok: true, packs: DEFAULT_PACKS });
  }
});

app.post('/api/packs/upload', (req, res) => {
  try {
    const rawName = req.headers['x-filename'] || req.query.filename || `pack_${Date.now()}.zip`;
    const cleanName = path.basename(decodeURIComponent(rawName)).replace(/[^a-zA-Z0-9_\.-]/g, '_');
    if (!cleanName.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({ ok: false, error: 'File must have a .zip extension' });
    }
    const targetFile = path.join(PACKS_DIR, cleanName);
    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    if (!data || data.length === 0) {
      return res.status(400).json({ ok: false, error: 'Empty file received' });
    }
    fs.writeFileSync(targetFile, data);
    const meta = parsePackMetadata(targetFile);
    console.log(`Uploaded pack saved to ${targetFile} (${meta.sizeFormatted})`);
    res.json({ ok: true, pack: meta });
  } catch (err) {
    console.error('Upload pack failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Progressive Scene Pack Unpacker & Streaming Helpers
const UNPACKED_DIR = path.join(CACHE_DIR, 'unpacked_packs');
try {
  if (!fs.existsSync(UNPACKED_DIR)) {
    fs.mkdirSync(UNPACKED_DIR, { recursive: true });
  }
} catch (e) {}

async function getOrUnpackPack(rawPackId) {
  const packId = path.basename(decodeURIComponent(rawPackId)).replace(/\.zip$/i, '');
  const targetDir = path.join(UNPACKED_DIR, packId);
  const infoJsonPath = path.join(targetDir, 'info.json');

  if (fs.existsSync(infoJsonPath)) {
    try {
      const info = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
      return { targetDir, info };
    } catch (e) {}
  }

  let zipPath = null;
  const possibleZipNames = [
    `${packId}.zip`,
    `${encodeURIComponent(packId)}.zip`,
    `${packId}`
  ];

  const possibleSearchDirs = [
    PACKS_DIR,
    path.join(__dirname, 'public', 'packs'),
    path.join(__dirname, 'dist', 'packs')
  ];

  for (const searchDir of possibleSearchDirs) {
    if (fs.existsSync(searchDir)) {
      for (const name of possibleZipNames) {
        const p = path.join(searchDir, name);
        if (fs.existsSync(p)) {
          zipPath = p;
          break;
        }
      }
    }
    if (zipPath) break;
  }

  let zipBuf = null;
  if (zipPath) {
    zipBuf = fs.readFileSync(zipPath);
  } else {
    const r2BaseUrl = (process.env.R2_PUBLIC_URL || 'https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev').replace(/\/$/, '');
    const foundDefault = DEFAULT_PACKS.find(p => p.id === packId || p.filename === `${packId}.zip` || p.filename === packId);
    const filename = foundDefault?.filename || `${packId}.zip`;

    const candidateUrls = [
      `${r2BaseUrl}/packs/${encodeURIComponent(filename)}`,
      `${r2BaseUrl}/packs/${filename}`,
      foundDefault?.url && foundDefault.url.startsWith('http') ? foundDefault.url : null
    ].filter(Boolean);

    for (const downloadUrl of candidateUrls) {
      try {
        console.log(`Downloading zip for unpacking from R2: ${downloadUrl}`);
        const r = await fetch(downloadUrl);
        if (r.ok) {
          const arr = await r.arrayBuffer();
          if (arr && arr.byteLength > 100) {
            zipBuf = Buffer.from(arr);
            break;
          }
        }
      } catch (e) {
        console.warn(`Failed downloading pack zip from R2 URL ${downloadUrl}:`, e.message);
      }
    }
  }

  if (!zipBuf || !fflateModule) {
    throw new Error(`Pack zip unavailable for unpacking: ${packId}`);
  }

  const unzipped = fflateModule.unzipSync(new Uint8Array(zipBuf));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const linesDir = path.join(targetDir, 'lines');
  if (!fs.existsSync(linesDir)) {
    fs.mkdirSync(linesDir, { recursive: true });
  }

  let title = packId;
  let author = 'Choicer Voicer';
  let description = '';
  let packVideoExt = null;
  let isOgvVideo = false;
  let hasBackingTrack = false;
  const linesMap = new Map();
  const characters = new Set();

  for (const entryName in unzipped) {
    const fileName = entryName.split('/').pop();
    const lower = fileName.toLowerCase();
    if (!fileName || lower.startsWith('.')) continue;

    if (lower === 'dub_video.ogv' || lower === 'video.ogv' || lower.endsWith('_video.ogv')) {
      fs.writeFileSync(path.join(targetDir, 'video.ogv'), Buffer.from(unzipped[entryName]));
      packVideoExt = 'ogv';
      isOgvVideo = true;
    } else if (lower === 'dub_video.mp4' || lower === 'video.mp4' || lower.endsWith('_video.mp4')) {
      fs.writeFileSync(path.join(targetDir, 'video.mp4'), Buffer.from(unzipped[entryName]));
      packVideoExt = 'mp4';
      isOgvVideo = false;
    } else if (lower === 'dub_video.webm' || lower === 'video.webm') {
      fs.writeFileSync(path.join(targetDir, 'video.webm'), Buffer.from(unzipped[entryName]));
      packVideoExt = 'webm';
      isOgvVideo = false;
    }

    if (lower.includes('backing') && (lower.endsWith('.ogg') || lower.endsWith('.mp3') || lower.endsWith('.wav'))) {
      const ext = lower.split('.').pop();
      fs.writeFileSync(path.join(targetDir, `backing.${ext}`), Buffer.from(unzipped[entryName]));
      hasBackingTrack = true;
    }
  }

  for (const entryName in unzipped) {
    const fileName = entryName.split('/').pop();
    const lower = fileName.toLowerCase();
    if (!fileName || lower.startsWith('.')) continue;

    if (lower.endsWith('_pack_info.txt') || lower.endsWith('_pack_info.ini') || lower.endsWith('pack.ini') || lower.endsWith('pack_info.txt')) {
      const text = fflateModule.strFromU8(unzipped[entryName]);
      for (const line of text.split('\n')) {
        const [k, ...v] = line.split('=');
        if (k && v.length) {
          const key = k.trim().toLowerCase();
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (key === 'title') title = val;
          if (key === 'author' || key === 'authors' || key === 'credits') author = val;
          if (key === 'description') description = val;
        }
      }
      continue;
    }

    const match = fileName.match(/^(\d+)_?([^.]+)?\.(txt|ini|mp3|ogg|wav|png|jpg|webp)$/i);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const namePart = match[2] ? match[2].trim() : 'VOICE';
      const ext = match[3].toLowerCase();

      if (!linesMap.has(lineNum)) {
        linesMap.set(lineNum, {
          id: lineNum,
          speaker: namePart.toUpperCase(),
          text: '',
          audioExt: null,
          timestamp: 0,
        });
      }

      const item = linesMap.get(lineNum);
      if (ext === 'txt' || ext === 'ini') {
        const text = fflateModule.strFromU8(unzipped[entryName]).trim();
        let captionText = '';
        for (const line of text.split('\n')) {
          const [k, ...v] = line.split('=');
          if (k && v.length) {
            const key = k.trim().toLowerCase();
            const val = v.join('=').trim().replace(/^["']|["']$/g, '');
            if (key === 'caption' || key === 'dialog' || key === 'text') {
              captionText = val;
            } else if (key === 'dub_characters' || key === 'character' || key === 'speaker') {
              const cleanSpeaker = val.replace(/[\[\]"']/g, '').trim();
              if (cleanSpeaker) {
                item.speaker = cleanSpeaker.toUpperCase();
                characters.add(item.speaker);
              }
            } else if (key === 'dub_timestamps' || key === 'timestamp' || key === 'time') {
              const parsedTime = parseFloat(val.replace(/[\[\]"']/g, '').trim());
              if (!isNaN(parsedTime)) item.timestamp = parsedTime;
            }
          }
        }
        item.text = captionText || text;
      } else if (['mp3', 'ogg', 'wav'].includes(ext)) {
        fs.writeFileSync(path.join(linesDir, `${lineNum}.${ext}`), Buffer.from(unzipped[entryName]));
        item.audioExt = ext;
      }
    }
  }

  const sortedLines = Array.from(linesMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, item]) => item);

  const info = {
    id: packId,
    title,
    author,
    description,
    linesCount: sortedLines.length,
    characters: Array.from(characters),
    packVideoExt,
    isOgvVideo,
    hasBackingTrack,
    lines: sortedLines,
  };

  fs.writeFileSync(infoJsonPath, JSON.stringify(info, null, 2));
  return { targetDir, info };
}

// Progressive Scene Pack API Endpoints
app.get('/api/packs/:id/progressive/info', async (req, res) => {
  try {
    const { info } = await getOrUnpackPack(req.params.id);
    res.json({ ok: true, info });
  } catch (err) {
    console.warn(`Progressive info failed for ${req.params.id}:`, err.message);
    res.status(404).json({ ok: false, error: err.message });
  }
});

app.get('/api/packs/:id/progressive/line/:index', async (req, res) => {
  try {
    const { targetDir, info } = await getOrUnpackPack(req.params.id);
    const lineIdx = parseInt(req.params.index, 10);
    const lineItem = info.lines && info.lines[lineIdx];
    const ext = lineItem?.audioExt || 'ogg';

    const linePath = path.join(targetDir, 'lines', `${lineIdx}.${ext}`);
    if (fs.existsSync(linePath)) {
      const mime = ext === 'ogg' ? 'audio/ogg' : ext === 'wav' ? 'audio/wav' : 'audio/mp3';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(linePath);
    }
    res.status(404).json({ error: 'Line audio not found' });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/packs/:id/progressive/video', async (req, res) => {
  try {
    const { targetDir, info } = await getOrUnpackPack(req.params.id);
    const ext = info.packVideoExt || 'mp4';
    const videoPath = path.join(targetDir, `video.${ext}`);

    if (fs.existsSync(videoPath)) {
      const mime = ext === 'ogv' ? 'video/ogg' : ext === 'webm' ? 'video/webm' : 'video/mp4';
      res.setHeader('Content-Type', mime);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(videoPath);
    }
    res.status(404).json({ error: 'Video file not found' });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Explicit static serving for /packs & /vendor
app.use('/packs', express.static(PACKS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.use('/pack-covers', express.static(path.join(__dirname, 'public', 'pack-covers'), { maxAge: '30d' }));
app.use('/pack-covers', express.static(path.join(__dirname, 'dist', 'pack-covers'), { maxAge: '30d' }));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));
app.use('/voice-effects.js', express.static(path.join(__dirname, 'voice-effects.js')));
app.use('/recording-audio-export.js', express.static(path.join(__dirname, 'recording-audio-export.js')));

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// API Health Check / Status
app.all(['/api', '/api/'], (req, res) => {
  res.json({ ok: true, name: 'Choicer Voicer API', status: 'online' });
});

// 1. App Context
app.get('/api/context', (req, res) => {
  res.json({ ok: true, region: 'us' });
});

// 2. Feedback Endpoint
app.post('/api/feedback', (req, res) => {
  console.log('Feedback received:', req.body);
  res.json({ ok: true, message: 'Feedback received' });
});

// 3. Google Auth / Session mock for Studio Multiplayer
app.get('/api/studio/auth/google', (req, res) => {
  // If redirecting, redirect back to home
  res.redirect('/?authenticated=1');
});

app.get('/api/rooms/session', (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: 'local_player',
      name: 'Player',
      email: 'player@choicervoicer.local'
    }
  });
});

// 4. Lobby: List all active rooms (Auto-deletes empty 0-player rooms)
app.get('/api/rooms', (req, res) => {
  const list = [];
  for (const [code, room] of rooms.entries()) {
    // If room has no players left, delete it immediately!
    if (!room.players || room.players.length === 0) {
      rooms.delete(code);
      continue;
    }

    // Deduplicate players list by id/name to clean up any duplicate joins
    const uniqueMap = new Map();
    for (const p of room.players) {
      if (p && (p.id || p.name)) {
        uniqueMap.set(p.id || p.name, p);
      }
    }
    room.players = Array.from(uniqueMap.values());
    if (room.players.length === 0) {
      rooms.delete(code);
      continue;
    }

    const roomTitle = room.name || `ห้องพากย์ ${room.code}`;
    const isPrivate = Boolean(room.password);

    list.push({
      code: room.code,
      roomCode: room.code,
      name: roomTitle,
      roomName: roomTitle,
      packTitle: room.pack?.title || 'Voice Pack',
      packId: room.pack?.id || '',
      lineCount: room.pack?.lineCount || 0,
      playersCount: room.players.length,
      players: room.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
      hasPassword: isPrivate,
      isPrivate: isPrivate,
      status: room.status,
      currentTurnPlayerId: room.currentTurnPlayerId,
      createdAt: room.createdAt || Date.now()
    });
  }
  saveRoomsToCache();
  // Sort newest first
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ ok: true, rooms: list });
});

// 5. Create room (Enforces 1 person = 1 room maximum)
app.post('/api/rooms', roomCreateLimiter, (req, res) => {
  const { name, playerName, roomName, packHash, packId, packTitle, lineCount, password } = req.body || {};
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const existingHostToken = req.headers['x-room-token'] || req.body?.token;

  // Purge any previous room opened by this specific host token so 1 user only has 1 room!
  for (const [existingCode, existingRoom] of rooms.entries()) {
    const isOwner = existingHostToken && existingRoom.tokens && existingRoom.tokens.has(existingHostToken);
    if (isOwner) {
      console.log(`Enforcing 1 room per host token: Deleting previous room ${existingCode}`);
      rooms.delete(existingCode);
    }
  }

  let code = generateCode();
  while (rooms.has(code)) {
    code = generateCode();
  }

  const hostId = 'p_' + crypto.randomBytes(4).toString('hex');
  const hostToken = 'tok_' + crypto.randomBytes(16).toString('hex');

  const hostPlayer = {
    id: hostId,
    name: (playerName || name || 'Host').trim() || 'Host',
    isHost: true,
    ready: true,
    finished: false,
    roleIndex: 0,
    lastSeen: Date.now()
  };

  const cleanRoomName = (roomName || name || 'ห้องพากษ์ ' + code).trim();
  const room = {
    code,
    name: cleanRoomName,
    hostIp: clientIp,
    password: password ? String(password).trim() : '',
    status: 'recording', // Rooms start directly in active dubbing mode without waiting
    pack: {
      id: packId || '',
      fingerprint: packHash || '',
      title: packTitle || 'Voice Pack',
      lineCount: Number(lineCount) || 1
    },
    tokens: new Map([[hostToken, hostId]]),
    players: [hostPlayer],
    turnOrder: [hostId],
    currentTurnPlayerId: hostId,
    currentLineIndex: 0,
    lastTurnPass: null,
    roles: [],
    takes: [],
    allFinished: false,
    openRoleIndexes: [],
    createdAt: Date.now()
  };

  rooms.set(code, room);
  saveRoomsToCache();

  const roomState = getClientRoomState(room, hostId);
  res.json({
    ok: true,
    token: hostToken,
    state: roomState,
    room: roomState
  });
});

function getClientRoomState(room, playerId) {
  const you = room.players.find(p => p.id === playerId) || {
    id: playerId || 'guest',
    name: 'Player',
    isHost: false,
    ready: false,
    finished: false
  };

  const turnOrder = room.turnOrder && room.turnOrder.length > 0
    ? room.turnOrder
    : room.players.map(p => p.id);

  const currentTurnPlayerId = room.currentTurnPlayerId || turnOrder[0] || (room.players[0]?.id || null);

  return {
    code: room.code,
    name: room.name,
    hasPassword: Boolean(room.password),
    status: room.status,
    pack: room.pack,
    currentTurnPlayerId,
    currentLineIndex: typeof room.currentLineIndex === 'number' ? room.currentLineIndex : 0,
    turnOrder,
    lastTurnPass: room.lastTurnPass || null,
    players: room.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      ready: p.ready,
      finished: p.finished,
      roleIndex: p.roleIndex,
      turnNumber: turnOrder.indexOf(p.id) >= 0 ? turnOrder.indexOf(p.id) + 1 : idx + 1,
      isCurrentTurn: p.id === currentTurnPlayerId
    })),
    roles: room.roles,
    takes: room.takes,
    allFinished: room.allFinished,
    openRoleIndexes: room.openRoleIndexes,
    you
  };
}

function resolvePlayer(room, req) {
  const token = req.headers['x-room-token'] || req.body?.token || req.query?.token;
  let playerId = token ? room.tokens.get(token) : null;
  let player = playerId ? room.players.find(p => p.id === playerId) : null;

  const reqName = req.body?.playerName || req.body?.name || req.query?.playerName;
  if (!player && reqName) {
    const cleanName = String(reqName).trim();
    player = room.players.find(p => p.name === cleanName || (p.name && cleanName.includes(p.name)));
  }

  if (!player && room.players.length > 0) {
    player = room.players.find(p => p.id === room.currentTurnPlayerId) || room.players[0];
  }

  if (player) {
    player.lastSeen = Date.now();
    if (token && !room.tokens.has(token)) {
      room.tokens.set(token, player.id);
    }
  }
  return player;
}

// 6. Get room state
app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = resolvePlayer(room, req);
  const playerId = player ? player.id : (req.query.playerId || null);
  const state = getClientRoomState(room, playerId);
  res.json({ state });
});

// 7. Actions on room
app.post('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const { action, name, playerName, password, playerId, targetPlayerId, finished } = req.body || {};

  if (action === 'join') {
    if (room.password && room.password !== String(password || '').trim()) {
      return res.status(403).json({ error: 'รหัสผ่านห้องไม่ถูกต้อง (Incorrect room password)' });
    }

    const joinName = (playerName || name || 'Player ' + (room.players.length + 1)).trim();
    const existingToken = req.headers['x-room-token'] || req.body?.token;

    let player = null;
    let token = existingToken;

    if (existingToken && room.tokens.has(existingToken)) {
      const existingId = room.tokens.get(existingToken);
      player = room.players.find(p => p.id === existingId);
    }

    if (!player) {
      player = room.players.find(p => p.name === joinName);
    }

    if (player) {
      // Re-use existing player entry to prevent duplicate entries
      player.name = joinName;
      if (!token) {
        token = Array.from(room.tokens.entries()).find(([t, pid]) => pid === player.id)?.[0] || ('tok_' + crypto.randomBytes(16).toString('hex'));
        room.tokens.set(token, player.id);
      }
    } else {
      // Add new unique player entry
      const newPlayerId = 'p_' + crypto.randomBytes(4).toString('hex');
      token = 'tok_' + crypto.randomBytes(16).toString('hex');
      player = {
        id: newPlayerId,
        name: joinName,
        isHost: false,
        ready: true,
        finished: false,
        roleIndex: room.players.length
      };
      room.players.push(player);
      room.tokens.set(token, newPlayerId);
    }

    if (!room.turnOrder) {
      room.turnOrder = room.players.map(p => p.id);
    } else if (!room.turnOrder.includes(player.id)) {
      room.turnOrder.push(player.id);
    }
    if (!room.currentTurnPlayerId) {
      room.currentTurnPlayerId = room.turnOrder[0];
    }

    saveRoomsToCache();
    return res.json({
      token,
      state: getClientRoomState(room, player.id)
    });
  }

  const player = resolvePlayer(room, req);

  // Pass dubbing turn to another player
  if (action === 'pass-turn') {
    const target = room.players.find(p => p.id === targetPlayerId);
    if (!target) {
      return res.status(400).json({ error: 'ไม่พบผู้เล่นที่ต้องการส่งคิวพากษ์ให้' });
    }

    room.currentTurnPlayerId = target.id;
    room.lastTurnPass = {
      fromId: player ? player.id : 'system',
      fromName: player ? player.name : 'Player',
      toId: target.id,
      toName: target.name,
      timestamp: Date.now()
    };

    saveRoomsToCache();
    return res.json({ ok: true, state: getClientRoomState(room, player ? player.id : null) });
  }

  // Advance turn to next in cyclic sequence
  if (action === 'next-turn') {
    if (!room.turnOrder || room.turnOrder.length === 0) {
      room.turnOrder = room.players.map(p => p.id);
    }
    const currIdx = room.turnOrder.indexOf(room.currentTurnPlayerId);
    const nextIdx = (currIdx >= 0) ? (currIdx + 1) % room.turnOrder.length : 0;
    room.currentTurnPlayerId = room.turnOrder[nextIdx];

    // Increment or set scene line index so ALL players in room shift to the next clip!
    if (typeof room.currentLineIndex !== 'number') room.currentLineIndex = 0;

    if (typeof req.body?.lineIndex === 'number') {
      room.currentLineIndex = Math.max(0, req.body.lineIndex);
    } else {
      room.currentLineIndex += 1;
    }

    const nextPlayer = room.players.find(p => p.id === room.currentTurnPlayerId);
    room.lastTurnPass = {
      fromId: player ? player.id : 'system',
      fromName: player ? player.name : 'Player',
      toId: room.currentTurnPlayerId,
      toName: nextPlayer ? nextPlayer.name : 'Next Player',
      timestamp: Date.now()
    };

    saveRoomsToCache();
    return res.json({ ok: true, state: getClientRoomState(room, player ? player.id : null) });
  }

  if (action === 'leave') {
    room.players = room.players.filter(p => p.id !== player.id);
    for (const [t, pid] of room.tokens.entries()) {
      if (pid === player.id) room.tokens.delete(t);
    }
    if (room.turnOrder) {
      room.turnOrder = room.turnOrder.filter(id => id !== player.id);
    }
    if (room.currentTurnPlayerId === player.id) {
      room.currentTurnPlayerId = room.turnOrder?.[0] || (room.players[0]?.id || null);
    }
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }
    if (room.players.length === 0) {
      rooms.delete(code);
    }
    saveRoomsToCache();
    return res.json({ ok: true, state: getClientRoomState(room, null) });
  }

  if (action === 'kick') {
    if (!player.isHost) {
      return res.status(403).json({ error: 'มีเพียงหัวหน้าห้อง (Host) เท่านั้นที่สามารถเตะผู้เล่นออกได้' });
    }
    const targetId = targetPlayerId || req.body.targetId || req.body.playerId;
    if (!targetId) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลผู้เล่นที่ต้องการเตะออก' });
    }
    room.players = room.players.filter(p => p.id !== targetId);
    for (const [t, pid] of room.tokens.entries()) {
      if (pid === targetId) room.tokens.delete(t);
    }
    if (room.turnOrder) {
      room.turnOrder = room.turnOrder.filter(id => id !== targetId);
    }
    if (room.currentTurnPlayerId === targetId) {
      room.currentTurnPlayerId = room.turnOrder?.[0] || (room.players[0]?.id || null);
    }
    saveRoomsToCache();
    return res.json({ ok: true, state: getClientRoomState(room, player.id) });
  }

  if (action === 'set-finished') {
    player.finished = Boolean(finished);
    room.allFinished = room.players.length > 0 && room.players.every(p => p.finished);
    if (room.allFinished) {
      room.status = 'finished';
    }
    return res.json({ state: getClientRoomState(room, player.id) });
  }

  // Default return current state
  res.json({ state: getClientRoomState(room, player.id) });
});

// 8. Upload take audio
app.put('/api/rooms/:code/takes/:lineIndex', takeUploadLimiter, (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const lineIndex = parseInt(req.params.lineIndex, 10);
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = resolvePlayer(room, req);
  if (!player) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `${code}:${lineIndex}`;
  const existing = takesStorage.get(key);
  const version = (existing?.version || 0) + 1;

  takesStorage.set(key, {
    buffer: req.body,
    contentType: req.headers['content-type'] || 'audio/webm',
    version,
    createdAt: Date.now()
  });

  const takeObj = {
    lineIndex,
    version,
    playerId: player.id,
    playerName: player.name
  };

  const existingIdx = room.takes.findIndex(t => t.lineIndex === lineIndex);
  if (existingIdx >= 0) {
    room.takes[existingIdx] = takeObj;
  } else {
    room.takes.push(takeObj);
    room.takes.sort((a, b) => a.lineIndex - b.lineIndex);
  }

  saveRoomsToCache();
  res.json({ ok: true, take: takeObj, state: getClientRoomState(room, player.id) });
});

// 9. Download take audio
app.get('/api/rooms/:code/takes/:lineIndex', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const lineIndex = parseInt(req.params.lineIndex, 10);
  const key = `${code}:${lineIndex}`;

  const take = takesStorage.get(key);
  if (!take || !take.buffer) {
    return res.status(404).send('Take audio not found');
  }

  res.setHeader('Content-Type', take.contentType);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(take.buffer);
});

// Production static build serving from dist directory
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Static assets from root
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: false
}));

// Asset proxy/fallback for static extensions to prevent returning HTML on missing assets
const ASSET_EXT_REGEX = /\.(js|mjs|css|wasm|png|jpg|jpeg|webp|gif|svg|ico|woff2|woff|ttf|eot|mp3|wav|ogg|ogv|mp4|webm|json|map|xml|zip)$/i;

app.get(ASSET_EXT_REGEX, async (req, res) => {
  const reqPath = req.path;
  
  // 1. Check dist/ directory first
  const distFile = path.join(__dirname, 'dist', reqPath);
  if (fs.existsSync(distFile) && fs.statSync(distFile).isFile()) {
    return res.sendFile(distFile);
  }

  // 2. Check root directory
  const localFile = path.join(__dirname, reqPath);
  if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    return res.sendFile(localFile);
  }

  // Attempt to fetch from upstream if not found locally
  try {
    const upstreamUrl = `https://thechoicervoicer.app${req.originalUrl}`;
    const upstreamRes = await fetch(upstreamUrl);
    if (upstreamRes.ok) {
      const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
      // If upstream returned an HTML fallback page for a static asset, reject it
      if (!contentType.includes('text/html')) {
        const buf = Buffer.from(await upstreamRes.arrayBuffer());
        fs.mkdirSync(path.dirname(localFile), { recursive: true });
        fs.writeFileSync(localFile, buf);
        res.setHeader('Content-Type', contentType);
        return res.send(buf);
      }
    }
  } catch (err) {
    console.warn(`Upstream fetch failed for ${req.originalUrl}:`, err.message);
  }

  res.status(404).send('Not Found');
});

// HTML Page Routes
app.get('/pack-maker*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pack-maker', 'index.html'));
});

app.get('/how-to-play*', (req, res) => {
  res.sendFile(path.join(__dirname, 'how-to-play', 'index.html'));
});

app.get('/tutorials*', (req, res) => {
  res.sendFile(path.join(__dirname, 'tutorials', 'index.html'));
});

app.get('/about*', (req, res) => {
  res.sendFile(path.join(__dirname, 'about', 'index.html'));
});

app.get('/terms*', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms', 'index.html'));
});

// Production static build serving
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

// Default SPA fallback
app.get('*', (req, res) => {
  if (ASSET_EXT_REGEX.test(req.path)) {
    return res.status(404).send('Not Found');
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Choicer Voicer server running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
