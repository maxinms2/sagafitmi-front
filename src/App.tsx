import './App.css'
import { useState } from 'react'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Login from './pages/Login'

type Page = 'home' | 'login'

function App() {
  const [page, setPage] = useState<Page>('home')

  return (
    <>
      <NavBar onNavigate={(p: Page) => setPage(p)} />
      {page === 'home' && <Home />}
      {page === 'login' && <Login onBack={() => setPage('home')} />}
    </>
  )
}

export default App
