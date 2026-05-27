import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type Props = {
  value: string
  size?: number
  className?: string
}

export function QRDisplay({ value, size = 320, className }: Props) {
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    QRCode.toString(value, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'H',
      width: size,
    })
      .then((s) => {
        if (!cancelled) setSvg(s)
      })
      .catch((e) => console.error('QR generation failed', e))
    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
