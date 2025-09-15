import React from 'react'
import { GameProvider, useGame } from './context/GameContext.jsx'
import HostLobby from './components/HostLobby.jsx'
import JoinScreen from './components/JoinScreen.jsx'
import PlayerGame from './components/PlayerGame.jsx'
import FinalResults from './components/FinalResults.jsx'

function Router() {
  const { role, stage, phase, started, pin } = useGame()

  if (phase === 'finished') return <FinalResults />

  if (role === 'host') {
    // Stay in HostLobby until game is actually started by host
    if (!pin || !started) return <HostLobby />
    return <PlayerGame />
  }

  if (role === 'player') {
    if (stage === 'join') return <JoinScreen />
    return <PlayerGame />
  }

  return (
    <div className="card">
      <h1>Who Is First? — Realtime</h1>
      <p className="small">Choose how you want to participate.</p>
      <div className="row">
        <button className="button" onClick={()=>window.location.hash='#host'}>Host a Game</button>
        <button className="button secondary" onClick={()=>window.location.hash='#join'}>Join a Game</button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="container">
      <GameProvider><Router /></GameProvider>
    </div>
  )
}
