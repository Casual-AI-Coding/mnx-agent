import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import HistoryPanel from './HistoryPanel'

export default function AppLayout() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} />
      <Sidebar />
      <main className="ml-[260px] mt-[60px] h-[calc(100vh-60px)] bg-grid overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  )
}