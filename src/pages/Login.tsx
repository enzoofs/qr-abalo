import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { friendlyAuthError } from '../lib/errors'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

const FLAG_COLORS = ['bg-abalo-red', 'bg-abalo-amber', 'bg-abalo-green', 'bg-abalo-blue', 'bg-abalo-purple']

export default function Login() {
  const { session, signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [mode, setMode] = useState<'signin' | 'changepw'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // entrar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // trocar senha
  const [cpEmail, setCpEmail] = useState('')
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [suppressRedirect, setSuppressRedirect] = useState(false)

  if (session && !suppressRedirect) return <Navigate to={next} replace />

  function switchMode(next: 'signin' | 'changepw') {
    setMode(next)
    setError(null)
  }

  async function handleSignin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await signInWithEmail(email, password)
    setBusy(false)
    if (err) setError(friendlyAuthError(err))
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (cpNew.length < 6) {
      setError('A senha nova precisa ter pelo menos 6 caracteres.')
      return
    }
    if (cpNew !== cpConfirm) {
      setError('As senhas novas não são iguais.')
      return
    }
    setBusy(true)
    setSuppressRedirect(true)

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: cpEmail,
      password: cpCurrent,
    })
    if (signInErr) {
      setBusy(false)
      setSuppressRedirect(false)
      setError(friendlyAuthError(signInErr.message))
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: cpNew })
    setBusy(false)
    if (updateErr) {
      setError(friendlyAuthError(updateErr.message))
      return
    }
    await supabase.rpc('mark_password_changed')
    navigate(next, { replace: true })
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

        {/* aviso sobre a senha padrão, sempre visível */}
        <div className="w-full max-w-sm mt-6 bg-abalo-ink border-2 border-abalo-ink rounded-md p-3.5">
          <p className="text-xs text-abalo-paper text-center leading-relaxed">
            Sua conta já existe! Faça login com seu <strong className="text-abalo-amber">e-mail</strong>{' '}
            e os <strong className="text-abalo-amber">6 últimos dígitos do seu celular</strong> como
            senha.
          </p>
        </div>

        <div className="w-full max-w-sm mt-4 bg-abalo-paper border-[3px] border-abalo-ink rounded-lg shadow-hard-lg p-6">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 rounded-md border-2 border-abalo-ink font-display text-[11px] tracking-wider ${
                mode === 'signin' ? 'bg-abalo-ink text-abalo-amber' : 'bg-white text-abalo-ink'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => switchMode('changepw')}
              className={`flex-1 py-2 rounded-md border-2 border-abalo-ink font-display text-[11px] tracking-wider ${
                mode === 'changepw' ? 'bg-abalo-ink text-abalo-amber' : 'bg-white text-abalo-ink'
              }`}
            >
              TROCAR SENHA
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignin} className="space-y-4">
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
                  placeholder="6 últimos dígitos do celular"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
                />
              </div>
              {error && <p className="text-sm font-semibold text-abalo-red">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-md border-[2.5px] border-abalo-ink bg-abalo-coral text-abalo-paper font-display text-sm tracking-wide shadow-hard disabled:opacity-50"
              >
                {busy ? '...' : 'ENTRAR'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-xs text-abalo-ink bg-white border-2 border-abalo-ink rounded-md p-3">
                Informe seu e-mail, sua senha atual (os 6 últimos dígitos do celular, se ainda não
                trocou) e a senha nova.
              </p>
              <div>
                <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                  E-MAIL
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={cpEmail}
                  onChange={(e) => setCpEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
                />
              </div>
              <div>
                <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                  SENHA ATUAL
                </label>
                <input
                  type="password"
                  placeholder="6 últimos dígitos do celular"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
                />
              </div>
              <div>
                <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                  SENHA NOVA
                </label>
                <input
                  type="password"
                  placeholder="mín. 6 caracteres"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
                />
              </div>
              <div>
                <label className="block font-display text-[11px] tracking-wider text-abalo-ink mb-2">
                  CONFIRMAR SENHA NOVA
                </label>
                <input
                  type="password"
                  placeholder="mín. 6 caracteres"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-3 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
                />
              </div>
              {error && <p className="text-sm font-semibold text-abalo-red">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-md border-[2.5px] border-abalo-ink bg-abalo-coral text-abalo-paper font-display text-sm tracking-wide shadow-hard disabled:opacity-50"
              >
                {busy ? '...' : 'TROCAR SENHA'}
              </button>
            </form>
          )}
        </div>

        <p className="relative text-center text-[13px] font-semibold text-abalo-ink mt-5 px-10 leading-relaxed">
          Acesso liberado pela diretoria do bloco.
          <br />
          Fale com a diretoria se ainda não conseguir entrar.
        </p>
      </div>
    </div>
  )
}
