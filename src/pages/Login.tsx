import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

const FLAG_COLORS = ['bg-abalo-red', 'bg-abalo-amber', 'bg-abalo-green', 'bg-abalo-blue', 'bg-abalo-purple']

export default function Login() {
  const { session, signInWithEmail, signUpWithEmail } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={next} replace />

  async function handleEmail(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail
    const { error: err } = await fn(email, password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-full relative overflow-hidden bg-abalo-coral">
      {/* halftone texture */}
      <div className="absolute inset-0 bg-halftone opacity-40 [background-size:16px_16px]" />

      {/* flat color blocks */}
      <div className="absolute -top-8 -left-8 w-56 h-56 rounded-br-[220px] bg-abalo-teal" />
      <div className="absolute -bottom-8 -right-8 w-52 h-64 rounded-tl-[200px] bg-abalo-amber" />

      <div className="relative flex flex-col items-center px-6 pt-16 pb-10">
        <div className="-rotate-3 bg-abalo-ink px-5 py-2 shadow-hard-sm">
          <span className="font-display text-xs tracking-wider text-abalo-amber">BLOCO DE RUA · BH</span>
        </div>

        <h1 className="font-display text-5xl leading-[0.95] text-abalo-ink mt-6 text-center">
          ABALÔ
          <br />
          CAXI
        </h1>

        <div className="flex mt-5 rounded-md overflow-hidden shadow-hard-sm">
          {FLAG_COLORS.map((c) => (
            <span key={c} className={`w-7 h-3.5 ${c}`} />
          ))}
        </div>

        <div className="w-full max-w-sm mt-9 bg-abalo-paper border-[3px] border-abalo-ink rounded-lg shadow-hard-lg p-6">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              className={`flex-1 py-2 rounded-md border-2 border-abalo-ink font-display text-[11px] tracking-wider ${
                mode === 'signin' ? 'bg-abalo-ink text-abalo-amber' : 'bg-white text-abalo-ink'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className={`flex-1 py-2 rounded-md border-2 border-abalo-ink font-display text-[11px] tracking-wider ${
                mode === 'signup' ? 'bg-abalo-ink text-abalo-amber' : 'bg-white text-abalo-ink'
              }`}
            >
              CRIAR CONTA
            </button>
          </div>

          {mode === 'signup' && (
            <p className="text-xs text-abalo-ink bg-white border-2 border-abalo-ink rounded-md p-3 mb-4">
              <strong>Atenção:</strong> use o mesmo e-mail que você informou no formulário de
              inscrição da bateria. Esse vai ser seu e-mail de login pra sempre.
            </p>
          )}

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                E-MAIL
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
              />
            </div>
            <div>
              <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                SENHA
              </label>
              <input
                type="password"
                placeholder="mín. 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
              />
            </div>
            {error && <p className="text-sm font-semibold text-abalo-red">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-md border-[2.5px] border-abalo-ink bg-abalo-coral text-abalo-paper font-display text-sm tracking-wide shadow-hard disabled:opacity-50"
            >
              {busy ? '...' : mode === 'signin' ? 'ENTRAR' : 'CRIAR CONTA'}
            </button>
          </form>
        </div>

        <p className="relative text-center text-[13px] font-semibold text-abalo-ink mt-5 px-10 leading-relaxed">
          Acesso liberado pela diretoria do bloco.
          <br />
          Fale com a diretoria se ainda não tem conta.
        </p>
      </div>
    </div>
  )
}
