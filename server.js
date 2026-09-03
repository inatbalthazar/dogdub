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

// Health check endpoint for Cloud hosts (Render, Koyeb, Railway)
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

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

const roomCreateLimiter = createRateLimiter(15, 60000, 'สร้างห้องถี่เกินไป กรุณารอ 1 นาที (Room creation rate limit exceeded)');
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
    id: 'guardians_meet_avengers',
    filename: 'guardians_meet_avengers.zip',
    title: 'Guardians Meet Avengers',
    author: 'Choicer Voicer',
    description: 'When the Guardians of the Galaxy encounter the unconscious Thor floating in deep space.',
    linesCount: 5,
    characters: ['STAR-LORD', 'DRAX', 'GAMORA', 'THOR'],
    size: 359136,
    sizeFormatted: '351 KB',
    updatedAt: 1788373105791,
    url: '/packs/guardians_meet_avengers.zip'
  },
  {
    id: 'pulp_fiction_royale',
    filename: 'pulp_fiction_royale.zip',
    title: 'Pulp Fiction: Royale with Cheese',
    author: 'Choicer Voicer',
    description: 'Vincent and Jules discuss the little differences between America and Europe.',
    linesCount: 5,
    characters: ['VINCENT', 'JULES'],
    size: 364158,
    sizeFormatted: '356 KB',
    updatedAt: 1788373159977,
    url: '/packs/pulp_fiction_royale.zip'
  },
  {
    id: 'star_wars_father',
    filename: 'star_wars_father.zip',
    title: 'Star Wars: I Am Your Father',
    author: 'Choicer Voicer',
    description: 'The legendary confrontation between Darth Vader and Luke Skywalker on Cloud City.',
    linesCount: 3,
    characters: ['DARTH VADER', 'LUKE'],
    size: 270446,
    sizeFormatted: '264 KB',
    updatedAt: 1788373105836,
    url: '/packs/star_wars_father.zip'
  },
  {
    id: 'matrix_red_pill',
    filename: 'matrix_red_pill.zip',
    title: 'The Matrix: Red or Blue Pill',
    author: 'Choicer Voicer',
    description: 'Morpheus offers Neo the choice between blissful illusion and harsh reality.',
    linesCount: 3,
    characters: ['MORPHEUS'],
    size: 357510,
    sizeFormatted: '349 KB',
    updatedAt: 1788373160025,
    url: '/packs/matrix_red_pill.zip'
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
    url: `/packs/${encodeURIComponent(filename)}`
  };
}

// 0. Web Voice Packs APIs
app.get('/api/packs', (req, res) => {
  try {
    let packs = [];
    if (fs.existsSync(PACKS_DIR)) {
      const files = fs.readdirSync(PACKS_DIR)
        .filter(f => f.toLowerCase().endsWith('.zip') && !f.startsWith('.'));
      packs = files.map(file => parsePackMetadata(path.join(PACKS_DIR, file)));
    }
    if (!packs || packs.length === 0) {
      packs = DEFAULT_PACKS;
    }
    // Sort: guardians_meet_avengers first or alphabetical
    packs.sort((a, b) => {
      if (a.filename === 'guardians_meet_avengers.zip') return -1;
      if (b.filename === 'guardians_meet_avengers.zip') return 1;
      return a.title.localeCompare(b.title);
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
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Default SPA fallback
app.get('*', (req, res) => {
  if (ASSET_EXT_REGEX.test(req.path)) {
    return res.status(404).send('Not Found');
  }
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
