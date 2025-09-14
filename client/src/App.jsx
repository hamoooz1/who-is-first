import React from 'react'
import { GameProvider, useGame } from './context/GameContext.jsx'
import HostLobby from './components/HostLobby.jsx'
import JoinScreen from './components/JoinScreen.jsx'
import PlayerGame from './components/PlayerGame.jsx'
import FinalResults from './components/FinalResults.jsx'

function Router() {
  const { role, stage, phase } = useGame()

  // Final results screen for everyone
  if (phase === 'finished') return <FinalResults />

  // Host should play too — once the game starts (prep/round/post), show PlayerGame
  if (role === 'host') {
    if (phase === 'prep' || phase === 'round' || phase === 'post') return <PlayerGame />
    return <HostLobby />
  }

  if (role === 'player') {
    if (stage === 'join') return <JoinScreen />
    return <PlayerGame />
  }

  return <div className="card">
    <h1>Who Is First? — Realtime</h1>
    <p className="small">Choose how you want to participate.</p>
    <div className="row">
      <button className="button" onClick={()=>window.location.hash='#host'}>Host a Game</button>
      <button className="button secondary" onClick={()=>window.location.hash='#join'}>Join a Game</button>
    </div>
  </div>
}

export default function App() {
  return <div className="container"><GameProvider><Router /></GameProvider></div>
}
