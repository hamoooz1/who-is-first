import express from 'express'
import http from 'http'
import cors from 'cors'
import morgan from 'morgan'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      'https://who-is-first-mauve.vercel.app/',  
      /\.vercel\.app$/                        // allow preview deployments too
    ],
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
})


/* ================================
   DATASETS (built-in + extras)
   ================================ */
const dataDir = path.join(__dirname, 'data')
const extraDir = path.join(dataDir, 'extra')
const ALL_TOPICS = ['name','country','city','animal','food','sport']

// In-memory master sets (lowercased)
let DATA = {}  // { topic: Set<string> }

function ensureDirs() {
  if (!fs.existsSync(extraDir)) fs.mkdirSync(extraDir, { recursive: true })
}

// Parse helpers
function fromJSON(filePath) {
  try {
    const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (Array.isArray(arr)) return arr
  } catch {}
  return []
}
function fromTXT(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  } catch {}
  return []
}
function fromCSV(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return raw.split(/\r?\n/).map(line => line.split(',')[0]?.trim()).filter(Boolean)
  } catch {}
  return []
}

function loadTopic(topic) {
  // base list: data/<topic>.json
  const basePath = path.join(dataDir, `${topic}.json`)
  let items = []
  if (fs.existsSync(basePath)) items.push(...fromJSON(basePath))

  // merge any extras from data/extra/<topic>.(txt|json|csv)
  const candidates = [
    path.join(extraDir, `${topic}.txt`),
    path.join(extraDir, `${topic}.json`),
    path.join(extraDir, `${topic}.csv`)
  ]
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue
    if (p.endsWith('.txt')) items.push(...fromTXT(p))
    else if (p.endsWith('.json')) items.push(...fromJSON(p))
    else if (p.endsWith('.csv')) items.push(...fromCSV(p))
  }

  // normalize
  const S = new Set()
  for (const v of items) {
    if (!v) continue
    const norm = String(v).trim()
    if (!norm) continue
    S.add(norm.toLowerCase())
  }
  return S
}

function loadAllDatasets() {
  ensureDirs()
  const map = {}
  for (const t of ALL_TOPICS) {
    map[t] = loadTopic(t)
  }
  DATA = map
  console.log('[datasets] loaded:',
    Object.fromEntries(ALL_TOPICS.map(t => [t, DATA[t].size])))
}

// initial load
loadAllDatasets()

// Admin: see counts
app.get('/admin/datasets', (_req, res) => {
  res.json(Object.fromEntries(ALL_TOPICS.map(t => [t, DATA[t]?.size || 0])))
})

// Admin: hot reload after you add files
app.post('/admin/reload-datasets', (_req, res) => {
  loadAllDatasets()
  res.json({ ok: true, sizes: Object.fromEntries(ALL_TOPICS.map(t => [t, DATA[t]?.size || 0])) })
})

/* ======= Helpers & Game Logic (uses DATA) ======= */
function makePIN () {
  return (Math.floor(Math.random() * 900000) + 100000).toString()
}
function validate (category, letter, value) {
  const cat = (category||'').toLowerCase()
  const v = (value||'').trim().toLowerCase()
  const L = (letter||'').toLowerCase()
  if (!v || v[0] !== L) return false
  if (!DATA[cat]) return false
  return DATA[cat].has(v)
}
function chooseNewLetter(game) {
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const remaining = all.filter(l => !game.usedLetters.has(l))
  const letter = (remaining.length ? remaining : all)[Math.floor(Math.random() * (remaining.length ? remaining.length : all.length))]
  game.usedLetters.add(letter)
  return letter
}

// ===== Game store =====
const games = new Map()
// game: { pin, hostSocketId, players, categories, letter, nextLetter,
//         round, totalRounds, roundSeconds, phase, prepEndsTs, deadlineTs,
//         postEndsTs, started, usedLetters }

function publicState(game) {
  return {
    pin: game.pin,
    round: game.round,
    totalRounds: game.totalRounds,
    letter: game.letter,
    nextLetter: game.nextLetter || null,
    categories: game.categories,
    started: game.started,
    phase: game.phase,
    prepEndsTs: game.prepEndsTs || null,
    deadlineTs: game.deadlineTs || null,
    postEndsTs: game.postEndsTs || null,
    roundSeconds: game.roundSeconds,
    players: [...game.players.values()].map(p => ({
      name: p.name, completed: p.completed, score: p.score
    }))
  }
}

function broadcastState(pin) {
  const game = games.get(pin)
  if (!game) return
  io.to(pin).emit('state', publicState(game))
}

function schedulePrepEnd(game, pin) {
  // after 5s, move to ROUND and start global timer
  const delay = Math.max(0, (game.prepEndsTs || Date.now()) - Date.now() + 50)
  setTimeout(() => {
    const g = games.get(pin); if (!g || g.phase !== 'prep') return
    // Clear answers at start of the round to avoid carryover
    for (const p of g.players.values()) {
      p.completed = false
      p.answers = {}
    }
    g.phase = 'round'
    g.deadlineTs = Date.now() + g.roundSeconds * 1000
    io.to(pin).emit('round_started', { letter: g.letter, deadlineTs: g.deadlineTs })
    broadcastState(pin)
    scheduleRoundTimeout(g, pin)
  }, delay)
}

function scheduleRoundTimeout(game, pin) {
  const delay = Math.max(0, (game.deadlineTs || Date.now()) - Date.now() + 50)
  setTimeout(() => {
    const g = games.get(pin); if (!g || g.phase !== 'round') return
    endRoundAndMaybeAdvance(g, pin) // time’s up ⇒ end round
  }, delay)
}

function schedulePostEnd(game, pin) {
  const delay = Math.max(0, (game.postEndsTs || Date.now()) - Date.now() + 50)
  setTimeout(() => {
    const g = games.get(pin); if (!g || g.phase !== 'post') return
    if (g.round >= g.totalRounds) {
      g.phase = 'finished'
      io.to(pin).emit('game_finished', {
        leaderboard: computeLeaderboard(g)
      })
      broadcastState(pin)
      return
    }
    g.round += 1
    startPrepForNextLetter(g, pin)
  }, delay)
}

function computeLeaderboard(game) {
  const arr = [...game.players.values()].map(p => ({ name: p.name, score: p.score }))
  arr.sort((a,b)=>b.score - a.score)
  return arr
}

function startPrepForNextLetter(game, pin) {
  game.nextLetter = chooseNewLetter(game)
  game.phase = 'prep'
  game.letter = game.nextLetter
  game.nextLetter = null
  game.prepEndsTs = Date.now() + 5000
  game.deadlineTs = null
  game.postEndsTs = null
  broadcastState(pin)
  io.to(pin).emit('round_preparing', { letter: game.letter, prepEndsTs: game.prepEndsTs })
  schedulePrepEnd(game, pin)
}

function endRoundAndMaybeAdvance(game, pin) {
  // Score: +10 per valid answer
  for (const p of game.players.values()) {
    let gained = 0
    for (const c of game.categories) {
      if (p.answers?.[c]?.valid === true) gained += 10
    }
    p.score += gained
    p.completed = true
  }
  // Post phase: leaderboard + next letter preview for 5s
  game.nextLetter = chooseNewLetter(game)
  game.phase = 'post'
  game.postEndsTs = Date.now() + 5000
  game.prepEndsTs = null
  game.deadlineTs = null

  io.to(pin).emit('round_over', {
    leaderboard: computeLeaderboard(game),
    nextLetter: game.nextLetter,
    postEndsTs: game.postEndsTs
  })
  broadcastState(pin)

  schedulePostEnd(game, pin)
}

// ===== Socket handlers =====
io.on('connection', (socket) => {
  // Host creates a game (host is first player)
  // payload: { hostName, totalRounds, roundSeconds, categories:string[] }
  socket.on('create_game', ({ hostName, totalRounds, roundSeconds, categories } = {}, cb) => {
    const pin = makePIN()
    // topics validation
    let chosen = Array.isArray(categories) && categories.length
      ? categories.map(c => String(c).toLowerCase()).filter(c => ALL_TOPICS.includes(c))
      : ALL_TOPICS.slice(0) // default: all
    if (chosen.length === 0) chosen = ALL_TOPICS.slice(0)

    const game = {
      pin,
      hostSocketId: socket.id,
      players: new Map(),
      categories: chosen,
      letter: null,
      nextLetter: null,
      round: 1,
      totalRounds: Number(totalRounds) > 0 ? Number(totalRounds) : 5,
      roundSeconds: Number(roundSeconds) > 5 ? Number(roundSeconds) : 60,
      phase: 'prep',
      prepEndsTs: null,
      deadlineTs: null,
      postEndsTs: null,
      started: false,
      usedLetters: new Set()
    }
    games.set(pin, game)
    socket.join(pin)
    // Add host as first player
    const hostDisplayName = String(hostName || 'Host')
    game.players.set(socket.id, { name: hostDisplayName, completed:false, score: 0, answers: {} })
    cb && cb({ ok:true, pin })
    broadcastState(pin)
  })

  // Player joins with PIN and name
  socket.on('join_game', ({ pin, name }, cb) => {
    const game = games.get(pin)
    if (!game) { cb && cb({ ok:false, reason:'Game not found' }); return }
    socket.join(pin)
    game.players.set(socket.id, { name: String(name||'Player'), completed:false, score:0, answers:{} })
    cb && cb({ ok:true, pin })
    broadcastState(pin)
  })

  // Host starts: transition to 5s prep for first letter
  socket.on('start_game', ({ pin }, cb) => {
    const game = games.get(pin)
    if (!game) { cb && cb({ ok:false }); return }
    if (!game.started) game.started = true
    startPrepForNextLetter(game, pin)
    cb && cb({ ok:true })
  })

  // Player updates a field
  socket.on('answer_update', ({ pin, category, value }, cb) => {
    const game = games.get(pin)
    if (!game || game.phase !== 'round') return
    const player = game.players.get(socket.id)
    if (!player) return
    const valid = validate(category, game.letter, value)
    player.answers[category] = { value, valid }
    socket.emit('answer_validated', { category, valid })
    // FIRST finisher ends round immediately
    const allValid = game.categories.every(c => player.answers[c]?.valid === true)
    if (allValid) {
      player.completed = true
      io.to(game.pin).emit('player_completed', { name: player.name })
      endRoundAndMaybeAdvance(game, pin)
    }
    cb && cb({ ok:true, valid })
  })

  // Restart game (host only)
  socket.on('restart_game', ({ pin }, cb) => {
    const game = games.get(pin)
    if (!game) { cb && cb({ ok:false, reason:'Game not found' }); return }
    if (socket.id !== game.hostSocketId) { cb && cb({ ok:false, reason:'Only host can restart' }); return }
    for (const p of game.players.values()) {
      p.score = 0
      p.completed = false
      p.answers = {}
    }
    game.usedLetters = new Set()
    game.round = 1
    game.phase = 'prep'
    game.started = true
    game.letter = null
    game.nextLetter = null
    game.prepEndsTs = null
    game.deadlineTs = null
    game.postEndsTs = null
    broadcastState(pin)
    startPrepForNextLetter(game, pin)
    cb && cb({ ok:true })
  })

  socket.on('disconnect', () => {
    for (const [pin, game] of games.entries()) {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id)
        broadcastState(pin)
      }
      if (game.hostSocketId === socket.id) {
        io.to(pin).emit('game_over', { reason: 'Host disconnected' })
        io.in(pin).socketsLeave(pin)
        games.delete(pin)
      }
    }
  })
})

const PORT = process.env.PORT || 5174
server.listen(PORT, () => {
  console.log('Realtime server on http://localhost:' + PORT)
})
