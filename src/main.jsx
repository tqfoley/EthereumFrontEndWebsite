import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const AppSelector = () => {
  const apps = [
    { name: 'Uniswap', path: 'uniswap.html', description: 'View Uniswap Pools and Create' },
    { name: 'SendOnBase', path: 'sendonbase.html', description: 'Send on Base network' }
  ]

  return (
    <div className="app-selector">
      <h1>Choose App</h1>
      <div className="apps-grid">
        {apps.map((app, index) => (
          <div key={index} className="app-card">
            <h2>{app.name}</h2>
            <p>{app.description}</p>
            <a href={app.path} className="app-link">
              Launch App
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppSelector />
  </React.StrictMode>
)
