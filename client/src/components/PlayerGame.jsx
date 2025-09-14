import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext.jsx'

const CATEGORY_LABELS = {
  name: 'Name',
  country: 'Country',
  city: 'City',
  animal: 'Animal',
  food: 'Food',
  sport: 'Sport'
}

export default function PlayerGame() {
  const {
    socket, pin,
    letter, nextLetter, categories,
    phase, prepEndsTs, deadlineTs, postEndsTs,
    now, players, round, totalRounds,
    answers, setAnswers
  } = useGame()

  const [local, setLocal] = useState({})

  const timeLeft = useMemo(() => {
    if (phase === 'prep' && prepEndsTs) return Math.max(0, Math.ceil((prepEndsTs - now)/1000))
    if (phase === 'round' && deadlineTs) return Math.max(0, Math.ceil((deadlineTs - now)/1000))
    if (phase === 'post' && postEndsTs) return Math.max(0, Math.ceil((postEndsTs - now)/1000))
    return null
  }, [phase, prepEndsTs, deadlineTs, postEndsTs, now])

  useEffect(() => {
    if (phase === 'prep') setLocal({})
  }, [phase, letter])

  function onChange(category, value) {
    setLocal(prev => ({ ...prev, [category]: value }))
    socket.emit('answer_update', { pin, category, value })
  }

  return (
    <div className="card">
      <div className="row">
        <div className="badge">Round: {round}/{totalRounds}</div>
        {timeLeft !== null && <div className="badge">Time: <span className="timer" style={{marginLeft:6}}>{timeLeft}s</span></div>}
        <div className="badge">Phase: {phase}</div>
      </div>
      <div className="spacer"></div>

      {phase === 'prep' && (
        <div style={{display:'grid', placeItems:'center', height: 240}}>
          <div style={{fontSize: 64, fontWeight: 800}}>{letter || '—'}</div>
          <div className="small">Get ready…</div>
        </div>
      )}

      {phase === 'round' && (
        <>
          <h1>Letter: {letter || '—'}</h1>
          <p className="small">Answer each with a word starting with <b>{letter}</b>. You’ll see a checkmark when valid.</p>
          <div className="spacer"></div>
          <div className="col">
            {(categories||[]).map(cat => {
              const a = answers[cat] || {}
              const cls = a.valid === true ? 'valid' : (a.valid === false ? 'invalid' : '')
              return (
                <div className="row" key={cat}>
                  <label style={{width:140}} className="small">{CATEGORY_LABELS[cat] || cat}</label>
                  <input
                    className={`input ${cls}`}
                    placeholder={`${CATEGORY_LABELS[cat]||cat} starting with ${letter}`}
                    value={local[cat]||''}
                    onChange={e=>onChange(cat, e.target.value)}
                  />
                  <div style={{width:28, textAlign:'center'}}>{a.valid === true ? '✅' : (a.valid === false ? '❌' : '')}</div>
                </div>
              )
            })}
          </div>
          <div className="spacer"></div>
          <p className="hint">Round ends when someone finishes everything correctly or when the timer runs out.</p>
        </>
      )}

      {phase === 'post' && (
        <>
          <h2>Round Over</h2>
          <div className="list">
            {[...players].sort((a,b)=>b.score-a.score).map((p, idx) => (
              <div key={p.name} className="list-item">
                <div>#{idx+1} {p.name}</div>
                <div><b>{p.score}</b> pts</div>
              </div>
            ))}
          </div>
          <div className="spacer"></div>
          <div className="badge">Next Letter: <b style={{marginLeft:6}}>{nextLetter || '—'}</b></div>
          <p className="hint">Next round starts automatically…</p>
        </>
      )}
    </div>
  )
}
