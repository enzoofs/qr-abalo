import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentPosition, type GeoError } from '../lib/geo'

type CheckinResponse = {
  ok: boolean
  error?: string
  attendance_id?: string
  event_name?: string
  distance_meters?: number
}

type Status =
  | { kind: 'locating' }
  | { kind: 'submitting' }
  | { kind: 'success'; result: CheckinResponse }
  | { kind: 'error'; message: string; subline?: string }

const ERROR_LABELS: Record<string, { title: string; sub?: string }> = {
  not_whitelisted: {
    title: 'Conta não cadastrada',
    sub: 'Seu e-mail não está vinculado a um membro.',
  },
  invalid_qr: {
    title: 'QR inválido',
    sub: 'Esse QR não corresponde a nenhum ensaio.',
  },
  too_early: {
    title: 'Ainda é cedo',
    sub: 'Esse ensaio ainda não começou.',
  },
  too_late: {
    title: 'Ensaio encerrado',
    sub: 'A janela de check-in já fechou.',
  },
  too_far: {
    title: 'Fora do local',
    sub: 'Aproxima do ponto de encontro do ensaio.',
  },
  already_checked_in: {
    title: 'Você já marcou presença',
    sub: 'Nesse ensaio sua presença já está registrada.',
  },
}

export default function Checkin() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>({ kind: 'locating' })
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    if (!token) {
      setStatus({ kind: 'error', message: 'QR inválido' })
      return
    }
    runCheckin(token)
  }, [token])

  async function runCheckin(qrToken: string) {
    setStatus({ kind: 'locating' })
    let coords
    try {
      coords = await getCurrentPosition()
    } catch (err) {
      const geo = err as GeoError
      setStatus({ kind: 'error', message: geo.message })
      return
    }

    setStatus({ kind: 'submitting' })

    const { data, error } = await supabase.rpc('check_in', {
      p_qr_token: qrToken,
      p_latitude: coords.latitude,
      p_longitude: coords.longitude,
    })

    if (error) {
      setStatus({ kind: 'error', message: error.message })
      return
    }

    const res = data as CheckinResponse
    if (res.ok) {
      setStatus({ kind: 'success', result: res })
    } else {
      const label = ERROR_LABELS[res.error ?? ''] ?? { title: 'Não foi possível marcar presença' }
      const sub =
        res.error === 'too_far' && res.distance_meters
          ? `Você está a ${res.distance_meters}m do local.`
          : label.sub
      setStatus({ kind: 'error', message: label.title, subline: sub })
    }
  }

  function retry() {
    ranRef.current = false
    if (token) runCheckin(token)
  }

  return (
    <div className="min-h-full p-6 flex flex-col justify-center max-w-md mx-auto">
      {status.kind === 'locating' && (
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">📍</div>
          <p className="font-medium">Obtendo sua localização…</p>
          <p className="text-sm text-stone-500 mt-1">Aguarde uns segundos.</p>
        </div>
      )}

      {status.kind === 'submitting' && (
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">⏳</div>
          <p className="font-medium">Registrando presença…</p>
        </div>
      )}

      {status.kind === 'success' && (
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Presença registrada!</h1>
          {status.result.event_name && (
            <p className="text-stone-600">{status.result.event_name}</p>
          )}
          {status.result.distance_meters !== undefined && (
            <p className="text-xs text-stone-400 mt-1">
              {status.result.distance_meters}m do local
            </p>
          )}
          <Link
            to="/"
            className="block w-full py-3 mt-8 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700"
          >
            Voltar
          </Link>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">{status.message}</h1>
          {status.subline && <p className="text-stone-600">{status.subline}</p>}
          <div className="grid grid-cols-2 gap-2 mt-8">
            <Link
              to="/"
              className="py-3 rounded-lg border border-stone-300 bg-white font-medium hover:bg-stone-50 text-center"
            >
              Voltar
            </Link>
            <button
              onClick={retry}
              className="py-3 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
