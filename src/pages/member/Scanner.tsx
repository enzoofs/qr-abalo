import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'

const READER_ID = 'qr-reader'

function extractToken(decoded: string): string | null {
  try {
    const url = new URL(decoded)
    const match = url.pathname.match(/\/checkin\/([a-f0-9-]+)/i)
    if (match) return match[1]
  } catch {
    // not a URL
  }
  if (/^[a-f0-9-]{36}$/i.test(decoded)) return decoded
  return null
}

type Phase = 'idle' | 'starting' | 'scanning' | 'error'

export default function Scanner() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const navigatedRef = useRef(false)

  useEffect(() => {
    return () => {
      const qr = scannerRef.current
      if (qr && qr.isScanning) {
        qr.stop()
          .catch(() => {})
          .finally(() => {
            try {
              qr.clear()
            } catch {
              // ignore
            }
          })
      }
    }
  }, [])

  async function startCamera() {
    setError(null)
    setPhase('starting')
    try {
      const qr = new Html5Qrcode(READER_ID, { verbose: false })
      scannerRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          if (navigatedRef.current) return
          const token = extractToken(decoded)
          if (!token) {
            setError('QR não reconhecido. Use o QR do ensaio.')
            return
          }
          navigatedRef.current = true
          qr.stop()
            .catch(() => {})
            .finally(() => {
              navigate(`/checkin/${token}`)
            })
        },
        () => {
          // scan errors fire continuously while no QR is in frame; ignore
        },
      )
      setPhase('scanning')
    } catch (err) {
      console.error('Scanner error', err)
      setPhase('error')
      setError(
        err instanceof Error
          ? `Não consegui abrir a câmera: ${err.message}`
          : 'Não consegui abrir a câmera.',
      )
      scannerRef.current = null
    }
  }

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="mb-4">
        <button onClick={() => navigate('/')} className="text-sm text-stone-500">
          ← Voltar
        </button>
        <h1 className="text-xl font-bold mt-2">Escanear QR do ensaio</h1>
        <p className="text-sm text-stone-500 mt-1">
          Aponta a câmera pro QR Code disponibilizado pela direção.
        </p>
      </header>

      <div
        id={READER_ID}
        className="w-full aspect-square bg-stone-900 rounded-lg overflow-hidden"
      />

      {phase === 'idle' && (
        <button
          onClick={startCamera}
          className="block w-full py-3 mt-4 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700"
        >
          Abrir câmera
        </button>
      )}

      {phase === 'starting' && (
        <p className="text-sm text-stone-500 mt-4 text-center">Abrindo câmera…</p>
      )}

      {phase === 'scanning' && (
        <p className="text-xs text-stone-400 mt-3 text-center">
          Mantenha o QR enquadrado no centro.
        </p>
      )}

      {error && (
        <div className="mt-4">
          <p className="text-sm text-red-600 text-center">{error}</p>
          {phase === 'error' && (
            <button
              onClick={startCamera}
              className="block w-full py-3 mt-2 rounded-lg bg-abalo-600 text-white font-medium"
            >
              Tentar de novo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
