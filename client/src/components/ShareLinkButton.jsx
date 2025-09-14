import React from 'react'
export default function ShareLinkButton() {
  async function share() {
    const data = { title: 'Who Is First?', url: window.location.href }
    try {
      if (navigator.share) await navigator.share(data)
      else await navigator.clipboard.writeText(data.url)
      alert('Link copied!')
    } catch {}
  }
  return <button className="button ghost" onClick={share}>Share</button>
}
