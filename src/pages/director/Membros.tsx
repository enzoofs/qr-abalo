import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { MemberImport } from '../../components/MemberImport'
import { Button, Input, PageHeader } from '../../components/ui'

type Member = {
  id: string
  email: string
  full_name: string
  whatsapp: string | null
  instrument: string | null
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
      .select('id, email, full_name, whatsapp, instrument, role')
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
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.instrument ?? '').toLowerCase().includes(q),
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
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <PageHeader
        backTo="/director"
        title="Membros"
        subtitle={`${members.length} cadastrado${members.length === 1 ? '' : 's'}`}
      />

      <div className="flex gap-2 mb-2">
        <Input
          type="search"
          placeholder="Buscar por nome, e-mail ou instrumento"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          onClick={() => {
            setAdding(true)
            setEditing(null)
            setImporting(false)
            setError(null)
          }}
          className="shrink-0"
        >
          + NOVO
        </Button>
      </div>

      <button
        onClick={() => {
          setImporting((v) => !v)
          setAdding(false)
          setEditing(null)
          setError(null)
        }}
        className="text-xs font-bold text-abalo-blue mb-4"
      >
        {importing ? 'CANCELAR IMPORTAÇÃO' : 'IMPORTAR PLANILHA DE MEMBROS'}
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

      {error && <p className="text-sm font-semibold text-abalo-red mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-abalo-muted">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-abalo-muted text-center py-6">
          {members.length === 0 ? 'Nenhum membro ainda.' : 'Nenhum resultado.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex justify-between items-center gap-2 p-3 rounded-md bg-white border-2 border-abalo-ink"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-abalo-ink truncate">{m.full_name}</p>
                <p className="text-xs text-abalo-muted truncate">
                  {m.email}
                  {m.instrument && ` · ${m.instrument}`}
                </p>
                {m.role === 'director' && (
                  <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-abalo-amber text-abalo-ink mt-1 uppercase tracking-wide">
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
                  className="text-[11px] font-bold px-2 py-1 rounded border-2 border-abalo-ink hover:bg-abalo-paper"
                >
                  EDITAR
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  className="text-[11px] font-bold px-2 py-1 rounded border-2 border-abalo-red text-abalo-red hover:bg-abalo-red/10"
                >
                  REMOVER
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
  const [instrument, setInstrument] = useState(initial?.instrument ?? '')
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
      instrument: instrument.trim() || null,
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
      className="bg-white border-2 border-abalo-ink rounded-md p-4 mb-4 space-y-3"
    >
      <h2 className="font-display text-[11px] tracking-wide text-abalo-ink">
        {initial ? 'EDITAR MEMBRO' : 'NOVO MEMBRO'}
      </h2>
      <Input
        type="text"
        placeholder="Nome completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="tel"
        placeholder="WhatsApp (opcional)"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Instrumento (opcional)"
        value={instrument}
        onChange={(e) => setInstrument(e.target.value)}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Member['role'])}
        className="w-full px-3 py-2.5 rounded-md border-2 border-abalo-ink bg-white text-sm focus:outline-none focus:ring-2 focus:ring-abalo-coral"
      >
        <option value="member">Membro</option>
        <option value="director">Diretor</option>
      </select>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          CANCELAR
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'SALVANDO…' : 'SALVAR'}
        </Button>
      </div>
    </form>
  )
}
