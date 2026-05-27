import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

type ParsedRow = {
  full_name: string
  email: string
  whatsapp: string | null
  valid: boolean
  error?: string
}

type Result = {
  inserted: number
  skipped: number
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',' || ch === ';' || ch === '\t') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result.map((s) => s.trim())
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseInput(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  const first = parseCsvLine(lines[0]).map((f) => f.toLowerCase())
  const hasHeader =
    first.includes('email') ||
    first.includes('e-mail') ||
    first.includes('nome') ||
    first.includes('name')
  const start = hasHeader ? 1 : 0

  const rows: ParsedRow[] = []
  for (let i = start; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    if (fields.length === 0 || fields.every((f) => !f)) continue
    const full_name = fields[0] ?? ''
    const email = (fields[1] ?? '').toLowerCase()
    const whatsapp = fields[2] ? fields[2] : null

    if (!full_name && !email) continue
    if (!full_name) {
      rows.push({ full_name, email, whatsapp, valid: false, error: 'Nome vazio' })
      continue
    }
    if (!email) {
      rows.push({ full_name, email, whatsapp, valid: false, error: 'E-mail vazio' })
      continue
    }
    if (!EMAIL_RE.test(email)) {
      rows.push({ full_name, email, whatsapp, valid: false, error: 'E-mail inválido' })
      continue
    }
    rows.push({ full_name, email, whatsapp, valid: true })
  }
  return rows
}

type Props = {
  onImportComplete: () => void | Promise<void>
  onCancel: () => void
}

export function MemberImport({ onImportComplete, onCancel }: Props) {
  const [rawInput, setRawInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseInput(rawInput), [rawInput])
  const valid = parsed.filter((r) => r.valid)
  const invalid = parsed.filter((r) => !r.valid)

  // Dedupe within the input itself (last entry wins on email collision)
  const dedupedValid = useMemo(() => {
    const map = new Map<string, ParsedRow>()
    for (const r of valid) map.set(r.email, r)
    return Array.from(map.values())
  }, [valid])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawInput(String(reader.result ?? ''))
      setResult(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleImport() {
    if (dedupedValid.length === 0) return
    setImporting(true)
    setError(null)
    setResult(null)

    const { data: existing, error: e1 } = await supabase.from('members').select('email')
    if (e1) {
      setError(e1.message)
      setImporting(false)
      return
    }
    const existingSet = new Set((existing ?? []).map((m) => m.email.toLowerCase()))

    const toInsert = dedupedValid.filter((r) => !existingSet.has(r.email))
    const skipped = dedupedValid.length - toInsert.length

    if (toInsert.length === 0) {
      setResult({ inserted: 0, skipped })
      setImporting(false)
      return
    }

    const payload = toInsert.map((r) => ({
      full_name: r.full_name,
      email: r.email,
      whatsapp: r.whatsapp,
      role: 'member' as const,
    }))

    const { error: e2 } = await supabase.from('members').insert(payload)
    setImporting(false)
    if (e2) {
      setError(e2.message)
      return
    }
    setResult({ inserted: toInsert.length, skipped })
    setRawInput('')
    await onImportComplete()
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-sm text-stone-700">Importar planilha</h2>
        <button
          onClick={onCancel}
          className="text-xs text-stone-500 hover:text-stone-700"
        >
          Fechar
        </button>
      </div>

      <p className="text-xs text-stone-500 mb-3">
        Cola ou faz upload de um CSV. Cada linha: <code className="bg-white px-1 rounded border">nome,email,whatsapp</code> (whatsapp opcional). Cabeçalho é detectado automaticamente.
      </p>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white font-medium hover:bg-stone-100"
        >
          Carregar arquivo CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <textarea
        value={rawInput}
        onChange={(e) => {
          setRawInput(e.target.value)
          setResult(null)
        }}
        rows={6}
        placeholder={'Maria Silva,maria@gmail.com,11999990001\nJoão Santos,joao@gmail.com'}
        className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:ring-2 focus:ring-abalo-500 text-sm font-mono"
      />

      {parsed.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="text-stone-600">
            <strong>{dedupedValid.length}</strong> linha{dedupedValid.length === 1 ? '' : 's'} válida{dedupedValid.length === 1 ? '' : 's'}
            {invalid.length > 0 && (
              <>
                {' · '}
                <span className="text-red-600">
                  <strong>{invalid.length}</strong> com erro
                </span>
              </>
            )}
            {valid.length !== dedupedValid.length && (
              <>
                {' · '}
                <span className="text-stone-500">
                  {valid.length - dedupedValid.length} duplicado{valid.length - dedupedValid.length === 1 ? '' : 's'} na lista
                </span>
              </>
            )}
          </p>
          {invalid.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {invalid.slice(0, 5).map((r, i) => (
                <li key={i} className="text-red-600">
                  Linha: <span className="font-mono">{r.full_name || '(vazio)'}, {r.email || '(vazio)'}</span> — {r.error}
                </li>
              ))}
              {invalid.length > 5 && (
                <li className="text-stone-500">… e mais {invalid.length - 5}</li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {result && (
        <div className="mt-3 text-sm bg-green-50 border border-green-200 text-green-800 rounded-md p-3">
          <p>
            <strong>{result.inserted}</strong> membro{result.inserted === 1 ? '' : 's'} importado{result.inserted === 1 ? '' : 's'}.
          </p>
          {result.skipped > 0 && (
            <p className="text-xs mt-1">
              {result.skipped} ignorado{result.skipped === 1 ? '' : 's'} (já existia{result.skipped === 1 ? '' : 'm'} na base).
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing || dedupedValid.length === 0}
        className="w-full py-2.5 mt-3 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700 disabled:opacity-50 text-sm"
      >
        {importing
          ? 'Importando…'
          : dedupedValid.length === 0
            ? 'Importar'
            : `Importar ${dedupedValid.length} membro${dedupedValid.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
