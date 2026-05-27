import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MemberImport } from '../../components/MemberImport'

type Member = {
  id: string
  email: string
  full_name: string
  whatsapp: string | null
  role: 'member' | 'director'
}

export default function Membros() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Member | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('id, email, full_name, whatsapp, role')
      .order('full_name')
    if (error) console.error(error)
    setMembers((data ?? []) as Member[])
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )
  }, [members, search])

  async function handleDelete(m: Member) {
    if (!confirm(`Remover ${m.full_name}? As presenças desse membro também serão apagadas.`)) {
      return
    }
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) {
      alert(error.message)
      return
    }
    await reload()
  }

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="mb-6">
        <Link to="/director" className="text-sm text-stone-500">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold mt-2">Membros</h1>
        <p className="text-sm text-stone-500 mt-1">
          {members.length} cadastrado{members.length === 1 ? '' : 's'}
        </p>
      </header>

      <div className="flex gap-2 mb-2">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm"
        />
        <button
          onClick={() => {
            setAdding(true)
            setEditing(null)
            setImporting(false)
            setError(null)
          }}
          className="px-3 py-2 rounded-md bg-abalo-600 text-white text-sm font-medium hover:bg-abalo-700"
        >
          + Novo
        </button>
      </div>

      <button
        onClick={() => {
          setImporting((v) => !v)
          setAdding(false)
          setEditing(null)
          setError(null)
        }}
        className="text-xs text-abalo-700 mb-4 hover:underline"
      >
        {importing ? 'Cancelar importação' : 'Importar planilha de membros'}
      </button>

      {importing && (
        <MemberImport
          onCancel={() => setImporting(false)}
          onImportComplete={async () => {
            await reload()
          }}
        />
      )}

      {(adding || editing) && (
        <MemberForm
          initial={editing ?? undefined}
          onCancel={() => {
            setAdding(false)
            setEditing(null)
            setError(null)
          }}
          onSaved={async () => {
            setAdding(false)
            setEditing(null)
            setError(null)
            await reload()
          }}
          onError={setError}
        />
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">
          {members.length === 0 ? 'Nenhum membro ainda.' : 'Nenhum resultado.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex justify-between items-center gap-2 p-3 rounded-md bg-white border border-stone-200"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{m.full_name}</p>
                <p className="text-xs text-stone-500 truncate">{m.email}</p>
                {m.role === 'director' && (
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-abalo-100 text-abalo-700 mt-1 uppercase tracking-wide">
                    diretor
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditing(m)
                    setAdding(false)
                    setError(null)
                  }}
                  className="text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type FormProps = {
  initial?: Member
  onCancel: () => void
  onSaved: () => void | Promise<void>
  onError: (msg: string) => void
}

function MemberForm({ initial, onCancel, onSaved, onError }: FormProps) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [role, setRole] = useState<Member['role']>(initial?.role ?? 'member')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    onError('')
    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim() || null,
      role,
    }
    const res = initial
      ? await supabase.from('members').update(payload).eq('id', initial.id)
      : await supabase.from('members').insert(payload)
    setBusy(false)
    if (res.error) {
      onError(res.error.message)
      return
    }
    await onSaved()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4 space-y-3"
    >
      <h2 className="font-semibold text-sm text-stone-700">
        {initial ? 'Editar membro' : 'Novo membro'}
      </h2>
      <input
        type="text"
        placeholder="Nome completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm"
      />
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm"
      />
      <input
        type="tel"
        placeholder="WhatsApp (opcional)"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Member['role'])}
        className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm bg-white"
      >
        <option value="member">Membro</option>
        <option value="director">Diretor</option>
      </select>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 rounded-md border border-stone-300 bg-white text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="py-2 rounded-md bg-abalo-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
