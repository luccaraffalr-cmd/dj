import { useState, useEffect, useCallback, useRef } from 'react'
import { getAuthUrl, exchangeCodeForToken, getToken, clearToken, refreshAccessToken, getMe, searchTracks, getDevices, addToQueue } from './spotify.js'
import { askDJ } from './djBrain.js'

const STORAGE_KEY = 'dj_memory'
function loadMemory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} } }
function saveMemory(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

function TrackCard({ track, onLike, onSkip, onBan, isLoading }) {
  if (isLoading) return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, minHeight: 160 }} className="loading-shimmer" />
  )
  if (!track) return null
  return (
    <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        {track.albumArt
          ? <img src={track.albumArt} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--surface2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎵</div>
        }
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>{track.artist}</div>
          {track.reason && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent2)', fontFamily: 'var(--font-mono)', background: 'rgba(191,90,242,0.1)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
              {track.reason}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { fn: onLike, emoji: '✅', label: 'me gusta', bg: 'rgba(48,209,88,0.12)', border: 'rgba(48,209,88,0.25)', color: 'var(--green)' },
          { fn: onSkip, emoji: '⏭', label: 'saltear', bg: 'rgba(255,214,10,0.1)', border: 'rgba(255,214,10,0.2)', color: 'var(--yellow)' },
          { fn: onBan, emoji: '🚫', label: 'nunca más', bg: 'rgba(255,45,85,0.1)', border: 'rgba(255,45,85,0.2)', color: 'var(--accent)' },
        ].map(b => (
          <button key={b.label} onClick={() => b.fn(track)} style={{ padding: '12px 0', borderRadius: 10, fontSize: 20, background: b.bg, border: `1px solid ${b.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span>{b.emoji}</span>
            <span style={{ fontSize: 10, color: b.color, fontFamily: 'var(--font-mono)' }}>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publicMode, setPublicMode] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [currentSuggestion, setCurrentSuggestion] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [vibe, setVibe] = useState('')
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [memory, setMemory] = useState(loadMemory)
  const [status, setStatus] = useState('')
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const suggQueueRef = useRef([])

  const mem = { liked: memory.liked || [], banned: memory.banned || [], skipped: memory.skipped || [], lastPlayed: memory.lastPlayed || [] }

  function updateMemory(updates) {
    const next = { ...memory, ...updates }
    setMemory(next)
    saveMemory(next)
  }

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        window.history.replaceState({}, '', '/')
        try {
          const t = await exchangeCodeForToken(code)
          setToken(t)
          setLoading(false)
          return
        } catch (e) {
          console.error(e)
        }
      }
      let t = getToken()
      if (!t) {
        const newT = await refreshAccessToken()
        if (newT) t = newT
      }
      if (t) setToken(t)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!token) return
    getMe(token).catch(() => { clearToken(); setToken(null) })
    fetchDevices()
    loadSuggestions(false, token)
  }, [token])

  async function fetchDevices() {
    if (!token) return
    try {
      const devs = await getDevices(token)
      setDevices(devs)
      const active = devs.find(d => d.is_active) || devs[0]
      if (active) setSelectedDevice(active.id)
      if (devs.length === 0) setStatus('Abrí Spotify en tu celu y dale play a algo primero')
    } catch {}
  }

  async function findTrackOnSpotify(song) {
    try {
      const results = await searchTracks(token, `${song.artist} ${song.title}`, 3)
      if (results.length > 0) {
        const t = results[0]
        return { ...song, uri: t.uri, albumArt: t.album.images[1]?.url || t.album.images[0]?.url }
      }
    } catch {}
    return song
  }

  const loadSuggestions = useCallback(async (isPublic, tkn) => {
    const t = tkn || token
    if (!t) return
    setLoadingAI(true)
    setStatus('El DJ está pensando...')
    try {
      const result = await askDJ({
        likedSongs: mem.liked, dislikedForever: mem.banned,
        skippedNow: mem.skipped, lastPlayed: mem.lastPlayed,
        publicMode: isPublic ?? publicMode, currentHour: new Date().getHours(),
        recentFeedback: mem.liked.slice(-3).map(s => s.title).join(', '),
      })
      setVibe(result.vibe || '')
      const withSpotify = await Promise.all(result.songs.map(findTrackOnSpotify))
      suggQueueRef.current = withSpotify
      setSuggestions(withSpotify)
      setCurrentSuggestion(withSpotify[0] || null)
      setStatus('')
    } catch { setStatus('Error conectando con la IA') }
    setLoadingAI(false)
  }, [token, publicMode, memory])

  function nextSuggestion() {
    const queue = suggQueueRef.current
    const idx = queue.findIndex(s => s.title === currentSuggestion?.title)
    if (idx < queue.length - 1) setCurrentSuggestion(queue[idx + 1])
    else loadSuggestions(publicMode)
  }

  async function handleLike(track) {
    updateMemory({
      liked: [...mem.liked, { name: `${track.artist} - ${track.title}`, title: track.title, artist: track.artist }],
      lastPlayed: [...mem.lastPlayed.slice(-19), { name: `${track.artist} - ${track.title}`, title: track.title }]
    })
    if (track.uri) {
      try {
        await addToQueue(token, track.uri, selectedDevice)
        setQueuedCount(c => c + 1)
        setStatus(`✓ "${track.title}" agregada a la cola`)
        setTimeout(() => setStatus(''), 2500)
      } catch {
        setStatus('Abrí Spotify y dale play a algo primero')
        setTimeout(() => setStatus(''), 3000)
      }
    }
    nextSuggestion()
  }

  function handleSkip(track) {
    updateMemory({ skipped: [...mem.skipped, { name: `${track.artist} - ${track.title}`, title: track.title }] })
    nextSuggestion()
  }

  function handleBan(track) {
    updateMemory({ banned: [...mem.banned, { name: `${track.artist} - ${track.title}`, title: track.title }] })
    nextSuggestion()
  }

  function togglePublicMode() {
    const next = !publicMode
    setPublicMode(next)
    loadSuggestions(next)
  }

  async function handleLogin() {
    const url = await getAuthUrl()
    window.location.href = url
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at top, #1a0a2e 0%, var(--bg) 60%)' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎛️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
          DJ <span style={{ color: 'var(--accent)' }}>IA</span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, fontFamily: 'var(--font-mono)' }}>reggaeton • fiesta • 100% tuyo</p>
      </div>
      <button onClick={handleLogin} style={{ background: '#1db954', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, padding: '16px 40px', borderRadius: 100, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 0 40px rgba(29,185,84,0.3)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Conectar con Spotify
      </button>
      <p style={{ marginTop: 24, color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', maxWidth: 280 }}>
        Necesitás tener Spotify abierto en tu celu para reproducir música
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 32px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>DJ <span style={{ color: 'var(--accent)' }}>IA</span></span>
          {queuedCount > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{queuedCount} en cola</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={togglePublicMode} style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', background: publicMode ? 'rgba(255,45,85,0.2)' : 'var(--surface2)', border: `1px solid ${publicMode ? 'var(--accent)' : 'var(--border)'}`, color: publicMode ? 'var(--accent)' : 'var(--text2)' }}>
            {publicMode ? '👥 público' : '👤 personal'}
          </button>
          <button onClick={() => setShowDeviceModal(true)} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📱</button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {vibe && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', animation: 'pulse 2s infinite' }} />
            {vibe}
          </div>
        )}
        {status && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
            {status}
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>siguiente sugerencia</div>
          <TrackCard track={currentSuggestion} isLoading={loadingAI && !currentSuggestion} onLike={handleLike} onSkip={handleSkip} onBan={handleBan} />
        </div>

        {suggestions.length > 1 && !loadingAI && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>en espera</div>
            {suggestions.filter(s => s.title !== currentSuggestion?.title).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 10, marginBottom: 6, border: '1px solid var(--border)', opacity: 0.6 }}>
                {s.albumArt && <img src={s.albumArt} alt="" style={{ width: 36, height: 36, borderRadius: 6 }} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => loadSuggestions(publicMode)} disabled={loadingAI} style={{ width: '100%', marginTop: 16, padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loadingAI ? 0.5 : 1 }}>
          {loadingAI ? '⏳ pensando...' : '🔄 pedir nuevas sugerencias'}
        </button>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[{ label: 'les gustó', count: mem.liked.length, color: 'var(--green)' }, { label: 'saltadas', count: mem.skipped.length, color: 'var(--yellow)' }, { label: 'baneadas', count: mem.banned.length, color: 'var(--accent)' }].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {showDeviceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={() => setShowDeviceModal(false)}>
          <div style={{ background: 'var(--surface)', width: '100%', borderRadius: '20px 20px 0 0', padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Dispositivo Spotify</h3>
            {devices.length === 0
              ? <div style={{ color: 'var(--text2)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>No hay dispositivos activos. Abrí Spotify y dale play a cualquier canción primero.</div>
              : devices.map(d => (
                <button key={d.id} onClick={() => { setSelectedDevice(d.id); setShowDeviceModal(false) }} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 8, background: selectedDevice === d.id ? 'rgba(29,185,84,0.15)' : 'var(--surface2)', border: `1px solid ${selectedDevice === d.id ? 'var(--green)' : 'var(--border)'}`, color: 'var(--text)', textAlign: 'left', fontSize: 14 }}>
                  📱 {d.name} {d.is_active && <span style={{ color: 'var(--green)', fontSize: 11 }}>• activo</span>}
                </button>
              ))
            }
            <button onClick={fetchDevices} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              🔄 actualizar dispositivos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
