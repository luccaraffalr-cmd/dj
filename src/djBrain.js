// Pool completo extraído de las playlists del usuario
export const ARTIST_POOL = [
  '44 Kid', '6ix9ine', 'ABRA', 'ADSO', 'AFTER', 'AKRIILA', 'AYWA', 'Adán Cruz',
  'Aissa', 'Ak4:20', 'Akapellah', 'Alan Gomez', 'Alejo', 'Alex Rose', 'Alexis y Fido',
  'Almighty', 'Alvaro Diaz', 'Amenazzy', 'Anitta', 'Anuel AA', 'Arcangel', 'Arcángel',
  'Aventura', 'Baby Rasta', 'Baby Rasta y Gringo', 'Bad Bunny', 'Bad Gyal', 'Becky G',
  'Benny Benni', 'Beéle', 'Bhavi', 'Bizarrap', 'Blessd', 'Bomba Estéreo', 'Boza',
  'Bryant Myers', 'Brytiago', 'C. Tangana', 'Callejero Fino', 'Camilo', 'Casper Magico',
  'Cauty', 'Cazzu', 'Chencho Corleone', 'ChocQuibTown', 'Chucky73', 'Cosculluela',
  'Cris MJ', 'Cruz Cafuné', 'DJ Luian', 'DJ Nelson', 'Daddy Yankee', 'Dalex', 'Dalmata',
  'Danny Ocean', 'Darell', 'Darkiel', 'De La Ghetto', 'Dei V', 'Dillom', 'Don Omar',
  'Don Patricio', 'DrefQuila', 'Duki', 'Dysbit', 'Dímelo Flow', 'ELENA ROSE', 'Easykid',
  'Eddy Lover', 'El Alfa', 'Eladio Carrion', 'Emilia', 'Farruko', 'Feid', 'Felp 22',
  'FloyyMenor', 'Fuego', 'Gigolo Y La Exce', 'Haze', 'Héctor "El Father"', 'J Alvarez',
  'J Balvin', 'JHAYCO', 'Jarol Miranda', 'Jay Wheeler', 'Jere Klein', 'Jon Z', 'Jory Boy',
  'Joyce Santana', 'Justin Quiles', 'KAROL G', 'KEVVO', 'KHEA', 'Kali Uchis', 'Ken-Y',
  'Kendo Kaponi', 'Kidd Keo', 'L-Gante', 'LIT killah', 'LOUTA', 'La Pantera',
  'Lary Over', 'Lenny Tavárez', 'Lennox', 'Lunay', 'Luny Tunes', 'Lyanno', 'Maluma',
  'Manuel Turizo', 'Marc Seguí', 'Marcianeke', 'Maria Becerra', 'Miky Woodz', 'Milo j',
  'Mora', 'Morad', 'Myke Towers', 'NATTI NATASHA', 'NATHY PELUSO', 'Neo Pistea',
  'Nicki Nicole', 'Nicky Jam', 'Nio Garcia', 'Noriel', 'Omar Courtz', 'Omar Montes',
  'Ozuna', 'Pablo Chill-E', 'Pailita', 'Paloma Mami', 'Paulo Londra', 'Peso Pluma',
  'Plan B', 'Pol Granch', 'Polimá Westcoast', 'Prince Royce', 'Quevedo', 'R.K.M & Ken-Y',
  'ROSALÍA', 'Rafa Pabón', 'RaiNao', 'Randy', 'Rauw Alejandro', 'Recycled J', 'Reik',
  'Rels B', 'Rochy RD', 'Romeo Santos', 'Rusherking', 'Rvssian', 'Ryan Castro', 'SAIKO',
  'SINAKA', 'Sebastian Yatra', 'Sech', 'Shakira', 'Sky Rompiendo', 'Snow Tha Product',
  'Standly', 'Tainy', 'Taiu', 'Tego Calderón', 'Tempo', 'TINI', 'Tiago PZK',
  'Tito "El Bambino"', 'Tony Dize', 'Trebol Clan', 'Trueno', 'Villano Antillano', 'WOS',
  'Wisin', 'Wisin & Yandel', 'Wolfine', 'YSY A', 'Yan Block', 'Yandel', 'Yomo',
  'Young Miko', 'Zion', 'Zion & Lennox', 'iZaak', 'Ñejo', 'Ñengo Flow',
]

// Artistas que el modelo tiende a sobrerepresentar — hay que limitarlos activamente
const OVEREXPOSED_ARTISTS = ['Bad Bunny', 'Feid', 'J Balvin', 'Maluma', 'Ozuna', 'KAROL G']

// Cuántas veces puede aparecer un artista overexposed por "turno de exploración"
const OVEREXPOSED_LIMIT = 2

function buildArtistPoolPrompt(suggestedArtistsTonight) {
  const suggested = new Set(suggestedArtistsTonight)
  
  // Artistas que todavía no sonaron esta noche — priorizarlos
  const unseen = ARTIST_POOL.filter(a => !suggested.has(a))
  
  // Contar cuántos overexposed ya sonaron
  const overexposedCount = OVEREXPOSED_ARTISTS.filter(a => suggested.has(a)).length

  const poolNote = unseen.length > 0
    ? `Artistas del pool que AÚN NO sonaron esta noche (priorizá estos): ${unseen.slice(0, 40).join(', ')}${unseen.length > 40 ? ` ... y ${unseen.length - 40} más` : ''}`
    : `Ya sonaron artistas de todo el pool. Podés repetir artistas con menos de 2 apariciones.`

  const overexposedNote = overexposedCount >= OVEREXPOSED_LIMIT
    ? `ATENCIÓN: ${OVEREXPOSED_ARTISTS.join(', ')} ya tuvieron su cupo esta ronda. Explorá otros artistas del pool.`
    : `Artistas de alto perfil (${OVEREXPOSED_ARTISTS.join(', ')}): máximo ${OVEREXPOSED_LIMIT} en total entre las 3 sugerencias de este turno.`

  return `${poolNote}\n${overexposedNote}`
}

export async function askDJ({
  likedSongs,
  dislikedForever,
  skippedNow,
  currentHour,
  publicMode,
  lastPlayed,
  recentFeedback,
  suggestedArtistsTonight = [],  // nuevo: todos los artistas sugeridos esta noche
}) {
  const hour = currentHour ?? new Date().getHours()

  const timeContext =
    hour >= 23 || hour < 1 ? 'inicio de fiesta (medianoche, piso llenándose)' :
    hour >= 1 && hour < 3   ? 'pico de la fiesta (madrugada, piso lleno)' :
    hour >= 3 && hour < 5   ? 'cierre de la fiesta (amanecer, últimas energías)' :
    hour >= 20              ? 'pre-fiesta (calentando motores)' :
                              'fuera de horario de fiesta'

  const artistPoolSection = buildArtistPoolPrompt(suggestedArtistsTonight)

  const prompt = `Sos un DJ experto en reggaetón para una fiesta de +150 personas (21-26 años) en Moreno, Buenos Aires, Argentina.

CONTEXTO ACTUAL:
- Hora: ${hour}hs — ${timeContext}
- Modo: ${publicMode
    ? 'PÚBLICO: elegí hits masivos que TODO el mundo conozca (2000-2024). Si la gente no sabe la letra, no sirve.'
    : 'PERSONAL: gusto del dueño. Podés mezclar hits con temas más específicos o underground del pool.'}

DISTRIBUCIÓN DE ÉPOCAS PARA ESTE SET:
- Clásico (antes de 2015): 15% — Don Omar, Wisin & Yandel, Plan B, Tego, Daddy Yankee
- Transición (2015–2020): 25% — Ozuna, Anuel AA, Nicky Jam, KAROL G, Farruko
- Actual (2020–hoy): 60% — Bad Bunny, Feid, JHAYCO, Mora, trap argentino, chileno

${artistPoolSection}

FEEDBACK ACUMULADO:
- Le gustaron (aprendé el estilo): ${likedSongs.slice(-15).map(s => s.name).join(', ') || 'ninguno aún'}
- Excluidos para siempre (NUNCA sugerir): ${dislikedForever.map(s => s.name).join(', ') || 'ninguno'}
- Salteados esta noche (no repetir hoy): ${skippedNow.slice(-10).map(s => s.name).join(', ') || 'ninguno'}
- Últimas 5 canciones reproducidas (no repetir): ${lastPlayed.slice(-5).map(s => s.name).join(', ') || 'ninguno'}
- Señal reciente del piso: ${recentFeedback || 'sin datos aún'}

REGLAS OBLIGATORIAS:
1. Sugerí exactamente 3 canciones.
2. Nunca repitas una canción que esté en "excluidos", "salteados" o "últimas reproducidas".
3. Explorá el pool completo. No te limites a los artistas más conocidos — el pool fue armado por el usuario y todos tienen igual valor.
4. Respetá la distribución de épocas aproximadamente entre las 3 canciones.
5. Priorizá artistas del pool que AÚN NO hayan sonado esta noche.
6. Energía mínima: media-alta. Nada lento ni romántico puro para una pista activa.
7. Las canciones tienen que existir realmente. No inventes títulos.

Respondé SOLO con JSON válido, sin texto extra, sin markdown:
{
  "songs": [
    {"artist": "nombre exacto del artista", "title": "nombre exacto de la canción", "year": 2021, "energy": "alta|media", "era": "clasico|transicion|actual", "reason": "por qué esta canción ahora (máx 8 palabras)"},
    {"artist": "...", "title": "...", "year": 2019, "energy": "alta", "era": "transicion", "reason": "..."},
    {"artist": "...", "title": "...", "year": 2023, "energy": "alta", "era": "actual", "reason": "..."}
  ],
  "vibe": "descripción del momento de la pista en 5 palabras"
}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.9,       // más variedad en las sugerencias
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
