export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell === null || cell === undefined ? '' : String(cell)
          if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
            return '"' + s.replace(/"/g, '""') + '"'
          }
          return s
        })
        .join(','),
    )
    .join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  // BOM (﻿) faz o Excel reconhecer UTF-8 corretamente
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

type Sheet = {
  name: string
  rows: (string | number | null | undefined)[][]
  columnWidths?: number[]
}

// Dynamic-imported pra a lib xlsx (~250KB gzipped) não entrar no bundle inicial.
export async function downloadXlsx(filename: string, sheets: Sheet[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    if (sheet.columnWidths) {
      ws['!cols'] = sheet.columnWidths.map((w) => ({ wch: w }))
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}
