import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [role, setRole] = useState(() => (location.hash === '#host' ? 'host' : (location.hash === '#join' ? 'player' : 'none')))
  const [stage, setStage] = useState(role === 'player' ? 'join' : 'lobby') // host:lobby; player:join|play

  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [letter, setLetter] = useState(null)
  const [nextLetter, setNextLetter] = useState(null)
  const [categories, setCategories] = useState([])
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [roundSeconds, setRoundSeconds] = useState(60)
  const [started, setStarted] = useState(false);

  const [phase, setPhase] = useState('prep') // 'prep' | 'round' | 'post' | 'finished'
  const [prepEndsTs, setPrepEndsTs] = useState(null)
  const [deadlineTs, setDeadlineTs] = useState(null)
  const [postEndsTs, setPostEndsTs] = useState(null)

  const [answers, setAnswers] = useState({})
  const [now, setNow] = useState(Date.now())
  const [finalLeaderboard, setFinalLeaderboard] = useState(null)

  const socketRef = useRef(null)

  useEffect(() => {
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5174'

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    })
    socketRef.current = s

    s.on('state', (data) => {
      setPin(data.pin)
      setCategories(data.categories || [])
      setPlayers(data.players || [])
      setLetter(data.letter || null)
      setNextLetter(data.nextLetter || null)
      setRound(data.round || 1)
      setTotalRounds(data.totalRounds || 5)
      setRoundSeconds(data.roundSeconds || 60)
      setPhase(data.phase || 'prep')
      setPrepEndsTs(data.prepEndsTs || null)
      setDeadlineTs(data.deadlineTs || null)
      setPostEndsTs(data.postEndsTs || null)
      setStarted(Boolean(data.started))
    })

    s.on('round_preparing', ({ letter, prepEndsTs }) => {
      setLetter(letter); setPrepEndsTs(prepEndsTs); setPhase('prep'); setAnswers({})
    })
    s.on('round_started', ({ letter, deadlineTs }) => {
      setLetter(letter); setDeadlineTs(deadlineTs); setPhase('round')
    })
    s.on('answer_validated', ({ category, valid }) => {
      setAnswers(prev => ({ ...prev, [category]: { ...(prev[category] || {}), valid } }))
    })
    s.on('round_over', ({ leaderboard, nextLetter, postEndsTs }) => {
      setPhase('post'); setPostEndsTs(postEndsTs); setNextLetter(nextLetter)
    })
    s.on('game_finished', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard || [])
      setPhase('finished')
    })
    s.on('game_over', ({ reason }) => { alert('Game ended: ' + reason); location.reload() })

    return () => s.close()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onHash = () => {
      const h = location.hash
      if (h === '#host') { setRole('host'); setStage('lobby') }
      else if (h === '#join') { setRole('player'); setStage('join') }
      else { setRole('none'); setStage('lobby') }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const value = useMemo(() => ({
    role, setRole,
    started, setStarted,
    stage, setStage,
    pin, setPin,
    name, setName,
    letter, nextLetter, categories,
    players, round, totalRounds, roundSeconds,
    phase, prepEndsTs, deadlineTs, postEndsTs,
    now,
    answers, setAnswers,
    finalLeaderboard, setFinalLeaderboard,
    socket: socketRef.current
  }), [started, role, stage, pin, name, letter, nextLetter, categories, players, round, totalRounds, roundSeconds, phase, prepEndsTs, deadlineTs, postEndsTs, now, answers, finalLeaderboard])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
