import React from 'react'
import ReactDOM from 'react-dom/client'
import './estilos.css'
import './styles/theme.css'
import './styles/animations.css'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'

// Punto de entrada principal
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
