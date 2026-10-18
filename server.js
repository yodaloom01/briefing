// Press Room — multiplayer briefing-room game server
// Express (static + speech archive API) + Socket.IO (positions, podium, WebRTC voice signaling)
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
// On Railway, attach a Volume and set RECORDINGS_DIR=/data/recordings so speeches survive redeploys.
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(__dirname, 'recordings');
const MAX_SPEECH_SECONDS = Number(process.env.MAX_SPEECH_SECONDS || 300);
const MAX_ARCHIVE = Number(process.env.MAX_ARCHIVE || 200); // oldest get deleted past this
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/three', express.static(path.join(__dirname, 'node_modules/three')));

// ---------- Speech archive ----------
const metaPath = (id) => path.join(RECORDINGS_DIR, id + '.json');
function listSpeeches() {
  return fs.readdirSync(RECORDINGS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(RECORDINGS_DIR, f), 'utf8')); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
}
function pruneArchive() {
  const all = listSpeeches();
  for (const s of all.slice(MAX_ARCHIVE)) {
    try { fs.unlinkSync(path.join(RECORDINGS_DIR, s.file)); } catch {}
    try { fs.unlinkSync(metaPath(s.id)); } catch {}
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: RECORDINGS_DIR,
    filename: (req, file, cb) => {
      const id = crypto.randomBytes(8).toString('hex');
      req.speechId = id;
      const ext = /mp4/.test(file.mimetype) ? '.mp4' : '.webm';
      cb(null, id + ext);
    },
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^(video|audio)\//.test(file.mimetype)),
});

app.get('/api/speeches', (req, res) => res.json(listSpeeches()));

app.post('/api/speeches', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const name = String(req.body.name || 'Anonymous').slice(0, 32);
  const duration = Math.min(Number(req.body.duration) || 0, MAX_SPEECH_SECONDS + 10);
  const meta = {
    id: req.speechId,
    file: req.file.filename,
    mime: req.file.mimetype,
    name,
    duration,
    size: req.file.size,
    createdAt: Date.now(),
  };
  fs.writeFileSync(metaPath(meta.id), JSON.stringify(meta));
  pruneArchive();
  io.emit('speeches:update', listSpeeches());
  res.json(meta);
});

function findSpeech(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')); } catch { return null; }
}
app.get('/api/speeches/:id/stream', (req, res) => {
  const s = findSpeech(req.params.id);
  if (!s) return res.sendStatus(404);
  res.type(s.mime.split(';')[0]);
  res.sendFile(path.join(RECORDINGS_DIR, s.file));
});
app.get('/api/speeches/:id/download', (req, res) => {
  const s = findSpeech(req.params.id);
  if (!s) return res.sendStatus(404);
  const safe = s.name.replace(/[^a-z0-9_-]+/gi, '_') || 'speech';
  const date = new Date(s.createdAt).toISOString().slice(0, 10);
  res.download(path.join(RECORDINGS_DIR, s.file), `speech_${safe}_${date}${path.extname(s.file)}`);
});

// ---------- Realtime ----------
const players = {}; // id -> { id, name, tie, skin, p:[x,y,z], r, seat }
let speakerId = null;
let speakerSince = 0;

function setSpeaker(id) {
  speakerId = id;
  speakerSince = id ? Date.now() : 0;
  io.emit('podium:speaker', { id: speakerId, since: speakerSince, max: MAX_SPEECH_SECONDS });
}

io.on('connection', (socket) => {
  socket.on('join', (info = {}) => {
    const p = {
      id: socket.id,
      name: String(info.name || 'Reporter').slice(0, 20),
      tie: /^#[0-9a-f]{6}$/i.test(info.tie) ? info.tie : '#b3202a',
      skin: /^#[0-9a-f]{6}$/i.test(info.skin) ? info.skin : '#e0b48f',
      suit: /^#[0-9a-f]{6}$/i.test(info.suit) ? info.suit : '#1d2433',
      p: [0, 0, 9], r: Math.PI, seat: -1,
    };
    players[socket.id] = p;
    // tell newcomer who is here (they will start WebRTC offers to each)
    socket.emit('welcome', {
      id: socket.id,
      players,
      speaker: { id: speakerId, since: speakerSince, max: MAX_SPEECH_SECONDS },
      speeches: listSpeeches(),
    });
    socket.broadcast.emit('player:join', p);
  });

  socket.on('state', (s) => {
    const p = players[socket.id];
    if (!p || !s || !Array.isArray(s.p)) return;
    p.p = s.p.slice(0, 3).map((n) => Number(n) || 0);
    p.r = Number(s.r) || 0;
    p.seat = Number.isInteger(s.seat) ? s.seat : -1;
  });

  socket.on('podium:request', () => {
    if (!players[socket.id]) return;
    if (!speakerId) setSpeaker(socket.id);
  });
  socket.on('podium:release', () => {
    if (speakerId === socket.id) setSpeaker(null);
  });

  socket.on('react', (type) => {
    if (players[socket.id] && ['clap'].includes(type)) io.emit('react', { id: socket.id, type });
  });

  // WebRTC signaling relay (voice chat mesh)
  socket.on('signal', ({ to, data } = {}) => {
    if (to && players[to]) io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    if (speakerId === socket.id) setSpeaker(null);
    io.emit('player:leave', socket.id);
  });
});

// Broadcast positions 15x/sec; auto-release podium after max time
setInterval(() => {
  io.volatile.emit('players', players);
  if (speakerId && Date.now() - speakerSince > (MAX_SPEECH_SECONDS + 5) * 1000) setSpeaker(null);
}, 66);

server.listen(PORT, () => console.log(`Press Room running on http://localhost:${PORT}`));
