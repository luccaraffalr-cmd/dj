const MY_ARTISTS = [
  'Bad Bunny', 'Jhayco', 'Feid', 'Myke Towers', 'Quevedo',
  'Rauw Alejandro', 'Don Omar', 'Wisin y Yandel', 'Daddy Yankee',
  'Plan B', 'Ñengo Flow', 'Zion y Lennox', 'Héctor el Father',
  'Arcangel', 'Ozuna', 'Nicky Jam', 'J Alvarez', 'Tego Calderón',
  'J Balvin', 'Tito el Bambino', 'Tony Dize', 'De La Ghetto',
  'Cosculluela'
]

export { MY_ARTISTS }

export async function askDJ({ likedSongs, dislikedForever, skippedNow, currentHour, publicMode, lastPlayed, recentFeedback }) {
  const hour = currentHour || new Date().getHours()
  const timeContext = hour >= 0 && hour < 3 ? 'inicio de fiesta (medianoche)' :
    hour >= 3 && hour < 5 ? 'pico de la fiesta (madrugada)' :
    hour >= 5 ? 'cierre de fiesta (amanecer)' : 'pre-fiesta'

  const prompt = `Sos un DJ experto en reggaeton para una fiesta de +150 personas en Argentina.

CONTEXTO:
- Hora: ${hour}hs - ${timeContext}
- Modo: ${publicMode ? 'PÚBLICO (elegí temas que conozca TODO el mundo, los más populares y conocidos)' : 'PERSONAL (gusto del dueño de la playlist, puede ser más underground o específico)'}

ARTISTAS FAVORITOS DEL DUEÑO:
${MY_ARTISTS.join(', ')}

HISTORIAL DE ESTA NOCHE:
- Le gustaron: ${likedSongs.slice(-10).map(s => s.name).join(', ') || 'ninguno aún'}
- Excluidos para siempre: ${dislikedForever.map(s => s.name).join(', ') || 'ninguno'}
- Saltados por ahora: ${skippedNow.slice(-5).map(s => s.name).join(', ') || 'ninguno'}
- Últimos reproducidos: ${lastPlayed.slice(-5).map(s => s.name).join(', ') || 'ninguno'}
- Feedback reciente: ${recentFeedback || 'ninguno'}

INSTRUCCIONES:
1. Sugerí exactamente 3 canciones de reggaeton puro (no trap, no pop, no dembow suave)
2. Priorizá las más bailables y con buen beat para pista
3. ${publicMode ? 'Elegí SOLO hits conocidos masivamente (2000-2024), que todos conozcan la letra' : 'Podés mezclar clásicos con temas menos conocidos del gusto del dueño'}
4. NO repitas canciones de los últimos reproducidos
5. NO sugerís canciones excluidas para siempre

Respondé SOLO con JSON válido, sin texto extra, sin markdown:
{
  "songs": [
    {"artist": "nombre artista", "title": "nombre canción", "year": 2020, "energy": "alta/media", "reason": "por qué esta canción ahora (máx 8 palabras)"},
    {"artist": "...", "title": "...", "year": 2019, "energy": "alta", "reason": "..."},
    {"artist": "...", "title": "...", "year": 2018, "energy": "alta", "reason": "..."}
  ],
  "vibe": "descripción del momento de la pista en 5 palabras"
}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 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'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { songs: [], vibe: 'error cargando' }
  }
}
