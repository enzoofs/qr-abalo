import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export default function Login() {
  const { session, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const oauthRedirect = window.location.origin + next

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
    <div className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-abalo-700">Abalô-Caxi</h1>
          <p className="text-sm text-stone-500 mt-1">Controle de presença da bateria</p>
        </div>

        <div className="space-y-2 mb-6">
          <button
            type="button"
            onClick={() => signInWithGoogle(oauthRedirect)}
            className="w-full py-3 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-medium"
          >
            Entrar com Google
          </button>
          <button
            type="button"
            onClick={() => signInWithApple(oauthRedirect)}
            className="w-full py-3 rounded-lg bg-black text-white hover:bg-stone-800 font-medium"
          >
            Entrar com Apple
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-stone-50 px-3 text-xs text-stone-400">ou com e-mail</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null) }}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              mode === 'signin' ? 'bg-abalo-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null) }}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              mode === 'signup' ? 'bg-abalo-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            Criar conta
          </button>
        </div>

        {mode === 'signup' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
            <strong>Atenção:</strong> use o mesmo e-mail que você informou no formulário de inscrição da bateria. Esse vai ser seu e-mail de login pra sempre.
          </p>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
          />
          <input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700 disabled:opacity-50"
          >
            {busy ? '...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
