import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Input, PageHeader } from '../components/ui'

export default function TrocarSenha() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (senha.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirma) {
      setError('As senhas não são iguais.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: senha })
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <PageHeader backTo="/" title="Trocar senha" />

      {done ? (
        <div className="bg-white border-2 border-abalo-ink rounded-[10px] p-6 text-center">
          <p className="font-display text-sm text-abalo-ink">SENHA ATUALIZADA ✓</p>
          <p className="text-sm text-abalo-muted mt-2">
            Da próxima vez que entrar, use a senha nova.
          </p>
          <Button onClick={() => navigate('/')} className="mt-5">
            VOLTAR
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-abalo-muted">
            Você já está logado. Escolha uma senha nova (mínimo 6 caracteres).
          </p>
          <div>
            <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
              NOVA SENHA
            </label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
              CONFIRMAR SENHA
            </label>
            <Input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm font-semibold text-abalo-red">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full py-3">
            {busy ? 'SALVANDO…' : 'SALVAR SENHA NOVA'}
          </Button>
        </form>
      )}
    </div>
  )
}
