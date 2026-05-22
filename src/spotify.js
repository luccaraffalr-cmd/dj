const CLIENT_ID = '1120fae87bf643d39dc18993d193ab29'
const REDIRECT_URI = window.location.origin + '/callback'
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ')

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function getAuthUrl() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = Math.random().toString(36).substring(7)
  localStorage.setItem('spotify_code_verifier', verifier)
  localStorage.setItem('spotify_auth_state', state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code) {
  const verifier = localStorage.getItem('spotify_code_verifier')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (data.access_token) {
    saveToken(data.access_token, data.refresh_token, data.expires_in)
    return data.access_token
  }
  throw new Error(data.error_description || 'Token exchange failed')
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token')
  if (!refreshToken) return null
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (data.access_token) {
    saveToken(data.access_token, data.refresh_token || refreshToken, data.expires_in)
    return data.access_token
  }
  return null
}

export function saveToken(token, refreshToken, expiresIn = 3600) {
  const expiry = Date.now() + expiresIn * 1000
  localStorage.setItem('spotify_token', token)
  localStorage.setItem('spotify_token_expiry', expiry)
  if (refreshToken) localStorage.setItem('spotify_refresh_token', refreshToken)
}

export function getToken() {
  const token = localStorage.getItem('spotify_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (!token || !expiry) return null
  if (Date.now() > parseInt(expiry) - 60000) return null
  return token
}

export function clearToken() {
  localStorage.removeItem('spotify_token')
  localStorage.removeItem('spotify_token_expiry')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_code_verifier')
}

async function spotifyFetch(endpoint, token, options = {}) {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) return spotifyFetch(endpoint, newToken, options)
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Spotify error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getMe(token) {
  return spotifyFetch('/me', token)
}

export async function searchTracks(token, query, limit = 5) {
  const params = new URLSearchParams({ q: query, type: 'track', limit, market: 'AR' })
  const data = await spotifyFetch(`/search?${params}`, token)
  return data.tracks.items
}

export async function getDevices(token) {
  const data = await spotifyFetch('/me/player/devices', token)
  return data?.devices || []
}

export async function addToQueue(token, trackUri, deviceId) {
  const params = new URLSearchParams({ uri: trackUri })
  if (deviceId) params.append('device_id', deviceId)
  await spotifyFetch(`/me/player/queue?${params}`, token, { method: 'POST' })
}

export async function getCurrentTrack(token) {
  return spotifyFetch('/me/player/currently-playing', token)
}
