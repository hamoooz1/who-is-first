import React from 'react'
import { useGame } from '../context/GameContext.jsx'

export default function RoundResultsScreen() {
  const { players, round, nextRound } = useGame()
  return (
    <div className="card">
      <h1>Round {round} Results</h1>
      <div className="list">
        {players.map(p => (
          <div key={p.id} className="list-item">
            <div>{p.name}</div>
            <div><b>{p.score}</b> pts</div>
          </div>
        ))}
      </div>
      <div className="spacer"></div>
      <div className="row" style={{justifyContent:'flex-end'}}>
        <button className="button" onClick={nextRound}>Next</button>
      </div>
    </div>
  )
}
