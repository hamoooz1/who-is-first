import React from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Trophy } from './icons.jsx'

export default function LeaderboardScreen() {
  const { players } = useGame()
  const sorted = [...players].sort((a,b)=>b.score-a.score)

  return (
    <div className="card">
      <h1><Trophy /> Final Leaderboard</h1>
      <div className="list">
        {sorted.map((p, idx) => (
          <div key={p.id} className="list-item">
            <div>#{idx+1} {p.name}</div>
            <div><b>{p.score}</b> pts</div>
          </div>
        ))}
      </div>
      <p className="small center">Refresh to play again.</p>
    </div>
  )
}
