import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { replaceState, setOnChange } from './lib/store'
import { initXlsx, scheduleXlsx } from './lib/excel'
import { loadInitial, scheduleSave } from './lib/storage'
import { normalize } from './lib/utils'
import './styles.css'

loadInitial().then((state) => {
  replaceState(normalize(state), false)
  setOnChange((s) => {
    scheduleSave(s)
    scheduleXlsx(s) // keeps the connected Excel file up to date
  })
  void initXlsx()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
