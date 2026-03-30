import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import TextGeneration from '@/pages/TextGeneration'
import VoiceSync from '@/pages/VoiceSync'
import VoiceAsync from '@/pages/VoiceAsync'
import ImageGeneration from '@/pages/ImageGeneration'
import MusicGeneration from '@/pages/MusicGeneration'
import VideoGeneration from '@/pages/VideoGeneration'
import VideoAgent from '@/pages/VideoAgent'
import VoiceManagement from '@/pages/VoiceManagement'
import FileManagement from '@/pages/FileManagement'
import TokenMonitor from '@/pages/TokenMonitor'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/text" replace />} />
          <Route path="text" element={<TextGeneration />} />
          <Route path="voice" element={<VoiceSync />} />
          <Route path="voice-async" element={<VoiceAsync />} />
          <Route path="image" element={<ImageGeneration />} />
          <Route path="music" element={<MusicGeneration />} />
          <Route path="video" element={<VideoGeneration />} />
          <Route path="video-agent" element={<VideoAgent />} />
          <Route path="voice-mgmt" element={<VoiceManagement />} />
          <Route path="files" element={<FileManagement />} />
          <Route path="token" element={<TokenMonitor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App