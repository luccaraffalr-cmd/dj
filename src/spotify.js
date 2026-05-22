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

export function getAuthUrl() {
  const state = Math.random().toString(36).substring(7)
  localStorage.setItem('spotify_auth_state', state)
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export function getTokenFromUrl() {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  return params.get('access_token')
}

export function saveToken(token) {
  const expiry = Date.now() + 3600 * 1000
  localStorage.setItem('spotify_token', token)
  localStorage.setItem('spotify_token_expiry', expiry)
}

export function getToken() {
  const token = localStorage.getItem('spotify_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (!token || !expiry) return null
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('spotify_token_expiry')
    return null
  }
  return token
}

export function clearToken() {
  localStorage.removeItem('spotify_token')
  localStorage.removeItem('spotify_token_expiry')
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

export async function getRecommendations(token, seedArtists, seedTracks, params = {}) {
  const queryParams = new URLSearchParams({
    seed_artists: seedArtists.slice(0, 3).join(','),
    seed_tracks: seedTracks.slice(0, 2).join(','),
    limit: 10,
    market: 'AR',
    ...params,
  })
  const data = await spotifyFetch(`/recommendations?${queryParams}`, token)
  return data.tracks
}

export async function getArtistId(token, artistName) {
  const params = new URLSearchParams({ q: artistName, type: 'artist', limit: 1 })
  const data = await spotifyFetch(`/search?${params}`, token)
  return data.artists.items[0]?.id
}

export async function getDevices(token) {
  const data = await spotifyFetch('/me/player/devices', token)
  return data.devices || []
}

export async function playSong(token, trackUri, deviceId) {
  await spotifyFetch(`/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`, token, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
  })
}

export async function addToQueue(token, trackUri, deviceId) {
  const params = new URLSearchParams({ uri: trackUri })
  if (deviceId) params.append('device_id', deviceId)
  await spotifyFetch(`/me/player/queue?${params}`, token, { method: 'POST' })
}

export async function skipToNext(token) {
  await spotifyFetch('/me/player/next', token, { method: 'POST' })
}

export async function getCurrentTrack(token) {
  return spotifyFetch('/me/player/currently-playing', token)
}

export async function getArtistTopTracks(token, artistId) {
  const data = await spotifyFetch(`/artists/${artistId}/top-tracks?market=AR`, token)
  return data.tracks || []
}
