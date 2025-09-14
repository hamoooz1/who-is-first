import React, { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Plus, Trash, Users } from './icons.jsx'

export default function LobbyScreen() {
  const { players, addPlayer, removePlayer, start, difficulty, setDifficulty, gameMode, setGameMode } = useGame()
  const [newName, setNewName] = useState('')

  return (
    <div className="card">
      <h1>Who Is First? <span className="badge"><Users /> {players.length} players</span></h1>
      <p className="small">Add players, choose options, and start the game.</p>

      <div className="row">
        <input className="input" placeholder="Add player name" value={newName} onChange={e=>setNewName(e.target.value)} />
        <button className="button" onClick={() => { addPlayer(newName.trim()); setNewName('') }}><Plus /> Add</button>
      </div>

      <div className="spacer"></div>

      <div className="list">
        {players.map(p => (
          <div className="list-item" key={p.id}>
            <div>{p.name}</div>
            <button className="button danger" onClick={()=>removePlayer(p.id)}><Trash /> Remove</button>
          </div>
        ))}
      </div>

      <hr className="sep" />

      <div className="row">
        <div className="col" style={{flex: 1}}>
          <label className="small">Difficulty</label>
          <select className="select" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="col" style={{flex: 1}}>
          <label className="small">Mode</label>
          <select className="select" value={gameMode} onChange={e=>setGameMode(e.target.value)}>
            <option value="classic">Classic</option>
            <option value="timed">Timed</option>
          </select>
        </div>
      </div>

      <div className="spacer"></div>
      <div className="row" style={{justifyContent:'flex-end'}}>
        <button className="button success" onClick={start}>Start Game</button>
      </div>
    </div>
  )
}
