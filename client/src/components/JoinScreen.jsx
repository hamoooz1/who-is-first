import React, { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'

export default function JoinScreen() {
  const { socket, setStage, setPin, setName } = useGame()
  const [pinInput, setPinInput] = useState('')
  const [nameInput, setNameInput] = useState('')

  function join() {
    socket.emit('join_game', { pin: pinInput.trim(), name: nameInput.trim() || 'Player' }, (resp) => {
      if (resp?.ok) {
        setPin(pinInput.trim()); setName(nameInput.trim()); setStage('play')
      } else {
        alert(resp?.reason || 'Join failed')
      }
    })
  }

  return (
    <div className="card">
      <h1>Join a Game</h1>
      <div className="col">
        <input className="input" placeholder="PIN" value={pinInput} onChange={e=>setPinInput(e.target.value)} />
        <input className="input" placeholder="Your name" value={nameInput} onChange={e=>setNameInput(e.target.value)} />
        <button className="button" onClick={join}>Join</button>
      </div>
    </div>
  )
}
