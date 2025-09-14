import React from 'react'
import { useGame } from '../context/GameContext.jsx'

export default function GameScreen() {
  const { players, categories, currentLetter, submitAnswer, endRound, answers } = useGame()

  return (
    <div className="card">
      <h1>Round Letter: {currentLetter}</h1>
      <p className="small">Enter answers that start with the letter <b>{currentLetter}</b>.</p>
      <div className="spacer"></div>
      {players.map(p => (
        <div key={p.id} className="card" style={{marginBottom:12}}>
          <h2>{p.name}</h2>
          <div className="col">
            {categories.map(cat => (
              <div className="row" key={cat}>
                <label style={{width:140}} className="small">{cat}</label>
                <input
                  className="input"
                  placeholder={`${cat} starting with ${currentLetter}`}
                  value={(answers[p.id]?.[cat]||'')}
                  onChange={e=>submitAnswer(p.id, cat, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="row" style={{justifyContent:'flex-end'}}>
        <button className="button success" onClick={endRound}>End Round</button>
      </div>
    </div>
  )
}
