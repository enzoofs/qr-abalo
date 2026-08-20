import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentPosition, type GeoError } from '../lib/geo'
import { Button, LinkButton } from '../components/ui'

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

function PinIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l10 18H2L12 2z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
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
    <div className="min-h-full p-6 flex flex-col justify-center max-w-md mx-auto bg-abalo-paper">
      {status.kind === 'locating' && (
        <div className="text-center">
          <div className="animate-pulse mb-4 flex justify-center">
            <PinIcon />
          </div>
          <p className="font-bold">Obtendo sua localização…</p>
          <p className="text-sm text-abalo-muted mt-1">Aguarde uns segundos.</p>
        </div>
      )}

      {status.kind === 'submitting' && (
        <div className="text-center">
          <div className="animate-pulse mb-4 flex justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-abalo-ink border-t-transparent animate-spin" />
          </div>
          <p className="font-bold">Registrando presença…</p>
        </div>
      )}

      {status.kind === 'success' && (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-abalo-green border-2 border-abalo-ink flex items-center justify-center shadow-hard-sm">
              <CheckIcon />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Presença registrada!</h1>
          {status.result.event_name && <p className="text-abalo-ink">{status.result.event_name}</p>}
          {status.result.distance_meters !== undefined && (
            <p className="text-xs text-abalo-muted mt-1">{status.result.distance_meters}m do local</p>
          )}
          <LinkButton to="/" className="w-full mt-8 py-3">
            VOLTAR
          </LinkButton>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-abalo-amber border-2 border-abalo-ink flex items-center justify-center shadow-hard-sm">
              <WarnIcon />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold mb-2">{status.message}</h1>
          {status.subline && <p className="text-abalo-ink">{status.subline}</p>}
          <div className="grid grid-cols-2 gap-2 mt-8">
            <LinkButton to="/" variant="secondary" className="py-3">
              VOLTAR
            </LinkButton>
            <Button onClick={retry} className="py-3">
              TENTAR DE NOVO
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
