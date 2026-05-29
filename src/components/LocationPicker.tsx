import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { getCurrentPosition, type GeoError } from '../lib/geo'

// Fix Leaflet's default icon path (Vite doesn't bundle the PNGs by default).
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const BH_CENTER: [number, number] = [-19.9227, -43.9381]
const INITIAL_ZOOM = 12
const PICKED_ZOOM = 16

type Props = {
  latitude: number | null
  longitude: number | null
  radius: number
  onChange: (coords: { latitude: number; longitude: number }) => void
}

type SearchResult = {
  display_name: string
  lat: string
  lon: string
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    if (zoom !== undefined) map.setView([lat, lng], zoom)
    else map.panTo([lat, lng])
  }, [lat, lng, zoom, map])
  return null
}

export function LocationPicker({ latitude, longitude, radius, onChange }: Props) {
  const hasPin = latitude !== null && longitude !== null
  const initialCenter: [number, number] = hasPin ? [latitude, longitude] : BH_CENTER

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [recenterZoom, setRecenterZoom] = useState<number | undefined>(undefined)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void runSearch(query)
    }, 500)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  async function runSearch(q: string) {
    setSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=br`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = (await res.json()) as SearchResult[]
      setResults(data)
      setShowResults(true)
    } catch (e) {
      console.error('nominatim error', e)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function pickFromMap(lat: number, lng: number) {
    onChange({ latitude: lat, longitude: lng })
    setRecenterZoom(undefined) // pan only, keep current zoom
  }

  function pickFromSearch(r: SearchResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    onChange({ latitude: lat, longitude: lng })
    setQuery(r.display_name.split(',').slice(0, 2).join(','))
    setShowResults(false)
    setRecenterZoom(PICKED_ZOOM)
  }

  async function pickFromGPS() {
    setGpsError(null)
    setGpsBusy(true)
    try {
      const pos = await getCurrentPosition()
      onChange({ latitude: pos.latitude, longitude: pos.longitude })
      setRecenterZoom(PICKED_ZOOM)
    } catch (err) {
      setGpsError((err as GeoError).message)
    } finally {
      setGpsBusy(false)
    }
  }

  function handleMarkerDrag(e: L.LeafletEvent) {
    const marker = e.target as L.Marker
    const { lat, lng } = marker.getLatLng()
    onChange({ latitude: lat, longitude: lng })
    setRecenterZoom(undefined)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar endereço ou local…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-stone-400">buscando…</span>
        )}
        {showResults && results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickFromSearch(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {showResults && results.length === 0 && !searching && query.trim().length >= 3 && (
          <div className="absolute z-[1000] mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg px-3 py-2 text-sm text-stone-500">
            Nenhum resultado.
          </div>
        )}
      </div>

      <div className="h-[300px] rounded-md overflow-hidden border border-stone-300">
        <MapContainer
          center={initialCenter}
          zoom={hasPin ? PICKED_ZOOM : INITIAL_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pickFromMap} />
          {hasPin && (
            <>
              <Marker
                position={[latitude, longitude]}
                draggable
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
              <Circle
                center={[latitude, longitude]}
                radius={radius}
                pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.15 }}
              />
              <Recenter lat={latitude} lng={longitude} zoom={recenterZoom} />
            </>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={pickFromGPS}
          disabled={gpsBusy}
          className="w-full py-2 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-sm font-medium disabled:opacity-50"
        >
          {gpsBusy ? 'Capturando…' : '📍 Usar minha localização atual'}
        </button>
        {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}
        {hasPin && (
          <p className="text-xs text-stone-500">
            Pin em {latitude.toFixed(6)}, {longitude.toFixed(6)} · clique no mapa ou arraste o pin para ajustar
          </p>
        )}
        {!hasPin && (
          <p className="text-xs text-stone-500">
            Busque um endereço, clique no mapa ou use sua localização atual.
          </p>
        )}
      </div>
    </div>
  )
}
