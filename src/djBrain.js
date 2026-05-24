// Pool completo extraído de las playlists del usuario
export const ARTIST_POOL = [
 '6ix9ine','Alan Gomez', 'Alejo', 'Alex Rose', 'Alexis y Fido',
  'Almighty', 'Alvaro Diaz','Anuel AA', 'Arcángel' 'Baby Rasta y Gringo', 'Bad Bunny', 'Bad Gyal', 'Becky G',
  'Benny Benni', 'Beéle', 'Bhavi', 'Bizarrap', 'Blessd',
  'Bryant Myers', 'Brytiago', 'C. Tangana', 'Callejero Fino', 'Casper Magico',
 'Chencho Corleone', 'Chucky73', 'Cosculluela',
  'Cris MJ', 'Cruz Cafuné', 'DJ Luian', 'DJ Nelson', 'Daddy Yankee', 'Dalex',
  'Danny Ocean', 'Darell', 'Darkiel', 'De La Ghetto', 'Dei V', 'Don Omar',
  'DrefQuila', 'Duki', 'Dysbit', 'Dímelo Flow', 'ELENA ROSE', 'Easykid',
  'Eddy Lover', 'El Alfa', 'Eladio Carrion', 'Emilia', 'Farruko', 'Feid',
  'FloyyMenor', 'Haze', 'Héctor "El Father"', 'J Alvarez',
  'J Balvin', 'JHAYCO', 'Jay Wheeler', 'Jere Klein', 'Jory Boy',
  'Justin Quiles', 'KAROL G', 'KHEA', 'Ken-Y',
  'Kendo Kaponi', 'L-Gante', 'LIT killah', 
  'Lary Over', 'Lenny Tavárez', 'Lennox', 'Lunay', 'Luny Tunes', 'Lyanno', 'Maluma',
  'Manuel Turizo', 'Marc Seguí', 'Marcianeke', 'Maria Becerra', 'Miky Woodz', 'Milo j',
  'Mora', 'Myke Towers', 'NATTI NATASHA', 'NATHY PELUSO', 'Neo Pistea',
  'Nicki Nicole', 'Nicky Jam', 'Nio Garcia', 'Noriel', 'Omar Courtz', 'Omar Montes',
  'Ozuna', 'Pablo Chill-E', 'Pailita', 'Paloma Mami', 'Paulo Londra', 'Peso Pluma',
  'Plan B', 'Polimá Westcoast', 'Prince Royce', 'Quevedo', 'R.K.M & Ken-Y',
  'ROSALÍA', 'Randy', 'Rauw Alejandro',
  'Rels B', 'Romeo Santos', 'Rusherking', 'Rvssian', 'Ryan Castro', 'SAIKO',
  'SINAKA', 'Sebastian Yatra', 'Sech', 'Shakira', 'Sky Rompiendo',
  'Standly', 'Tainy', 'Taiu', 'Tego Calderón', 'TINI', 'Tiago PZK',
  'Tito "El Bambino"', 'Tony Dize', 'Trueno', 'Villano Antillano', 'WOS',
  'Wisin', 'Wisin & Yandel', 'YSY A', 'Yan Block', 'Yandel', 'Yomo',
  'Young Miko', 'Zion', 'Zion & Lennox', 'iZaak', 'Ñejo', 'Ñengo Flow',
]

// Artistas que el modelo tiende a sobrerepresentar
const OVEREXPOSED_ARTISTS = ['Bad Bunny', 'Feid', 'J Balvin', 'Maluma', 'Ozuna', 'KAROL G']
const OVEREXPOSED_LIMIT = 2

function buildArtistPoolPrompt(suggestedArtistsTonight) {
  const suggested = new Set(suggestedArtistsTonight)
  const unseen = ARTIST_POOL.filter(a => !suggested.has(a))
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
  suggestedArtistsTonight = [],
}) {
  const hour = currentHour ?? new Date().getHours()

  const timeContext =
    hour >= 23 || hour < 1 ? 'inicio de fiesta — piso llenándose, subir temperatura gradualmente' :
    hour >= 1 && hour < 3  ? 'pico de la fiesta — piso lleno, mantener energía máxima sin parar' :
    hour >= 3 && hour < 5  ? 'cierre — gente cansada pero eufórica, mezclar bangers con algo más melódico' :
    hour >= 20             ? 'pre-fiesta — calentar el ambiente, todavía no es el momento de los bangers pesados' :
                             'fuera de horario de fiesta'

  const artistPoolSection = buildArtistPoolPrompt(suggestedArtistsTonight)

  const prompt = `Sos el cerebro de una app de DJ para una fiesta de reggaetón. Tu trabajo es elegir la próxima canción que va a sonar en la pista.

CONTEXTO DE LA FIESTA:
- 150 personas, 21-26 años, Moreno, Buenos Aires, Argentina
- Hora: ${hour}hs — ${timeContext}
- Modo: ${publicMode
    ? 'PÚBLICO — la gente tiene que conocer la letra. Solo hits masivos, nada underground.'
    : 'PERSONAL — gusto del dueño. Podés arriesgar con temas más específicos del pool.'}

QUÉ FUNCIONA EN ESTA PISTA (ejemplos de temas que SÍ van):
Rakata (Wisin & Yandel), Dale Don Dale (Don Omar), No Me Conoce Remix (JHAYCO/Bad Bunny),
El Efecto (Rauw Alejandro), Es un Secreto (Plan B), Party (Bad Bunny/Rauw),
Candy (Plan B), Brickell (Feid/Yandel), Fanatica Sensual (Plan B), Me Estás Tentando (Wisin & Yandel).
Características comunes: beat duro, ritmo que empuja, letra que la gente canta, tempo 95-130 BPM.

QUÉ NO VA EN ESTA PISTA (aunque sean populares):
EoO (Bad Bunny) — demasiado lento y atmosférico para pista.
Ojitos Lindos (Bad Bunny) — ritmo roto, no se puede perrear.
Un Verano Sin Ti (Bad Bunny) — ambient, baja energía.
444 / 111 (Yan Block) — trap lento, piso se vacía.
Una Vez (Bad Bunny/Mora) — melódico puro, no tiene groove de pista.
Regla general: si la canción no te dan ganas de bailar en los primeros 10 segundos, no va.

DISTRIBUCIÓN DE ÉPOCAS:
- Clásico reggaetón (antes de 2015): 15% — Don Omar, Wisin & Yandel, Plan B, Tego, Daddy Yankee
- Urbano transición (2015–2020): 25% — Ozuna, Anuel AA, Nicky Jam, KAROL G, Farruko
- Actual (2020–hoy): 60% — Feid, JHAYCO, Mora, Myke Towers, trap argentino/chileno, Bad Bunny actual

${artistPoolSection}

FEEDBACK DEL USUARIO ESTA NOCHE:
- Le gustaron — aprendé qué estilo está funcionando: ${likedSongs.slice(-15).map(s => s.name).join(', ') || 'ninguno aún'}
- NUNCA MÁS — no sugerir bajo ningún concepto: ${dislikedForever.map(s => s.name).join(', ') || 'ninguno'}
- Salteados esta noche — no repetir hoy: ${skippedNow.slice(-10).map(s => s.name).join(', ') || 'ninguno'}
- Últimas reproducidas — no repetir: ${lastPlayed.slice(-5).map(s => s.name).join(', ') || 'ninguno'}
- Señal del piso ahora: ${recentFeedback || 'sin datos aún'}

REGLAS:
1. Sugerí exactamente 3 canciones.
2. Cada canción tiene que tener beat bailabledonde la gente arranque a moverse sola. Si dudás si va en pista, no la pongas.
3. Nunca sugieras canciones de "NUNCA MÁS", "salteados" o "últimas reproducidas".
4. Las canciones tienen que existir realmente — no inventes títulos ni versiones.
5. Explorá el pool completo, no solo los artistas más famosos.
6. Respetá la distribución de épocas entre las 3 canciones.
7. Si el usuario tuvo likes seguidos de un estilo, seguí en esa dirección. Si hubo skips, cambiá.

Respondé SOLO con JSON válido, sin texto extra, sin markdown:
{
  "songs": [
    {"artist": "nombre exacto", "title": "nombre exacto de la canción", "year": 2021, "energy": "alta|media", "era": "clasico|transicion|actual", "reason": "por qué esta canción ahora (máx 8 palabras)"},
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
      temperature: 0.9,
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
