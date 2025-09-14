import React from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Letter as LetterIcon } from './icons.jsx'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function LetterSelectionScreen() {
  const { chooseLetter, round } = useGame()
  return (
    <div className="card">
      <h1><LetterIcon /> Round {round}: Pick a Letter</h1>
      <p className="small">Choose a starting letter for this round.</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap: '8px'}}>
        {LETTERS.map(l => (
          <button className="button secondary" key={l} onClick={()=>chooseLetter(l)}>{l}</button>
        ))}
      </div>
    </div>
  )
}
