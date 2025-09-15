import React, { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext.jsx'

const ALL_TOPICS = [
  { id: 'name', label: 'Name' },
  { id: 'country', label: 'Country' },
  { id: 'city', label: 'City' },
  { id: 'animal', label: 'Animal' },
  { id: 'food', label: 'Food' },
  { id: 'sport', label: 'Sport' },
]

export default function HostLobby() {
  const { socket, pin, players, letter, phase, prepEndsTs, deadlineTs, postEndsTs, round, totalRounds, roundSeconds, now } = useGame()
  const [created, setCreated] = useState(false)
  const [hostName, setHostName] = useState('')
  const [roundsInput, setRoundsInput] = useState(5)
  const [secondsInput, setSecondsInput] = useState(60)
  const [topics, setTopics] = useState(ALL_TOPICS.map(t => t.id))

  function toggleTopic(id) {
    setTopics(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  function createGame() {
    if (topics.length === 0) { alert('Select at least one topic'); return }
    socket.emit('create_game', {
      hostName: hostName || 'Host',
      totalRounds: Number(roundsInput) || 5,
      roundSeconds: Number(secondsInput) || 60,
      categories: topics
    }, (resp) => {
      if (resp?.ok) setCreated(true)
      else alert('Failed to create game')
    })
  }

  function startGame() {
    // DO NOT set stage/role here; router will switch when server sets `started: true`
    socket.emit('start_game', { pin })
  }

  const timeLeft = useMemo(() => {
    if (phase === 'prep' && prepEndsTs) return Math.max(0, Math.ceil((prepEndsTs - now)/1000))
    if (phase === 'round' && deadlineTs) return Math.max(0, Math.ceil((deadlineTs - now)/1000))
    if (phase === 'post' && postEndsTs) return Math.max(0, Math.ceil((postEndsTs - now)/1000))
    return null
  }, [phase, prepEndsTs, deadlineTs, postEndsTs, now])

  return (
    <div className="card">
      <h1>Host Dashboard</h1>
      {!created ? (
        <div className="col" style={{maxWidth: 520}}>
          <label className="small">Your name</label>
          <input className="input" placeholder="Host name" value={hostName} onChange={e=>setHostName(e.target.value)} />
          <label className="small">Number of rounds</label>
          <input className="input" type="number" min="1" value={roundsInput} onChange={e=>setRoundsInput(e.target.value)} />
          <label className="small">Seconds per round</label>
          <input className="input" type="number" min="5" value={secondsInput} onChange={e=>setSecondsInput(e.target.value)} />
          <label className="small">Topics</label>
          <div className="list">
            {ALL_TOPICS.map(t => (
              <label key={t.id} className="list-item" style={{cursor:'pointer'}}>
                <div>{t.label}</div>
                <input type="checkbox" checked={topics.includes(t.id)} onChange={()=>toggleTopic(t.id)} />
              </label>
            ))}
          </div>
          <div className="spacer"></div>
          <button className="button" onClick={createGame}>Create Game</button>
        </div>
      ) : (
        <>
          <p className="small">Share this PIN with players:</p>
          <div className="row">
            <div className="badge" style={{fontSize:18, fontWeight:'bold'}}>{pin || '------'}</div>
            <button className="button" onClick={()=>navigator.clipboard.writeText(pin||'')}>Copy</button>
          </div>
          <hr className="sep" />
          <div className="row">
            <div className="badge">Round: {round} / {totalRounds}</div>
            {letter && <div className="badge">Letter: <b style={{marginLeft:6}}>{letter}</b></div>}
            {timeLeft !== null && <div className="badge">Time: <span className="timer" style={{marginLeft:6}}>{timeLeft}s</span></div>}
            <div className="badge">Phase: {phase}</div>
          </div>
          <hr className="sep" />
          <h2>Players</h2>
          <div className="list">
            {players.map(p => <div key={p.name} className="list-item"><div>{p.name}</div><div>{p.completed ? '✅' : '⏳'}</div><div>{p.score} pts</div></div>)}
          </div>
          <hr className="sep" />
          {phase === 'prep' && !letter && (
            <button className="button success" onClick={startGame}>Start Game</button>
          )}
          {phase === 'prep' && letter && <div className="small">Preparing round…</div>}
        </>
      )}
    </div>
  )
}
