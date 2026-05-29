import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { LocationPicker } from '../../components/LocationPicker'

function defaultStart(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

function defaultEnd(): string {
  const d = new Date()
  d.setHours(d.getHours() + 3)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export default function NovoEvento() {
  const { member } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [startsAt, setStartsAt] = useState(defaultStart())
  const [endsAt, setEndsAt] = useState(defaultEnd())
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radius, setRadius] = useState(150)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (latitude === null || longitude === null) {
      setFormError('Captura a localização do local antes de salvar.')
      return
    }
    setBusy(true)
    const { data, error } = await supabase
      .from('events')
      .insert({
        name,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        latitude,
        longitude,
        radius_meters: radius,
        created_by: member?.id,
      })
      .select()
      .single()
    setBusy(false)
    if (error) {
      setFormError(error.message)
      return
    }
    navigate(`/director/eventos/${data.id}`)
  }

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="mb-6">
        <button
          onClick={() => navigate('/director')}
          className="text-sm text-stone-500 mb-2"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">Novo ensaio</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Nome
          </label>
          <input
            type="text"
            placeholder="Ex: Ensaio 4 — Praça da Liberdade"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Início
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Fim
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Localização
          </label>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            radius={radius}
            onChange={({ latitude: lat, longitude: lng }) => {
              setLatitude(lat)
              setLongitude(lng)
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Raio (metros)
          </label>
          <input
            type="number"
            min={20}
            max={1000}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            required
            className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
          />
          <p className="text-xs text-stone-500 mt-1">
            Distância máxima do local pra contar presença. 150m cobre uma quadra/praça.
          </p>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700 disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Criar ensaio'}
        </button>
      </form>
    </div>
  )
}
