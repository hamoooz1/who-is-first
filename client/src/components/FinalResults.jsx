import React from 'react'
import { useGame } from '../context/GameContext.jsx'

export default function FinalResults() {
  const { finalLeaderboard, socket, pin } = useGame()

  function restart() {
    socket.emit('restart_game', { pin }, (resp) => {
      if (!resp?.ok) alert(resp?.reason || 'Failed to restart')
      // Server will push us back into prep/round flow automatically
    })
  }

  const board = (finalLeaderboard || []).slice().sort((a,b)=>b.score-a.score)

  return (
    <div className="card">
      <h1>Game Finished</h1>
      <div className="list">
        {board.map((p, idx) => (
          <div key={p.name} className="list-item">
            <div>#{idx+1} {p.name}</div>
            <div><b>{p.score}</b> pts</div>
          </div>
        ))}
      </div>
      <div className="spacer"></div>
      <button className="button success" onClick={restart}>Restart Game</button>
    </div>
  )
}
