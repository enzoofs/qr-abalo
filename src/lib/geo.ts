export type Coords = {
  latitude: number
  longitude: number
  accuracy: number
}

export type GeoError = {
  code: 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'inaccurate' | 'unknown'
  message: string
}

const ERROR_MESSAGES: Record<GeoError['code'], string> = {
  unsupported: 'Seu navegador não suporta geolocalização.',
  denied: 'Você bloqueou o acesso à localização. Libera nas configurações do navegador e tenta de novo.',
  unavailable: 'Não foi possível obter sua localização. Tenta sair e entrar de novo no local.',
  timeout: 'Demorou demais pra pegar sua localização. Tenta de novo.',
  inaccurate:
    'Seu celular está enviando uma localização APROXIMADA, por isso a presença não pode ser confirmada com precisão. Ative a "Localização precisa": no Android, Configurações > Localização > Permissões do app > este app/navegador > ative "Usar localização precisa". No iPhone, Ajustes > Privacidade > Serviços de Localização > o app/Safari > ative "Localização precisa". Depois tente de novo.',
  unknown: 'Erro inesperado ao pegar sua localização.',
}

// Acima dessa precisão (em metros) consideramos que o celular está em
// "localização aproximada" e recusamos, pois daria check-in errado.
const MAX_ACCEPTABLE_ACCURACY = 50

export function getCurrentPosition(options?: {
  timeoutMs?: number
  desiredAccuracy?: number
}): Promise<Coords> {
  const timeoutMs = options?.timeoutMs ?? 15000
  const desiredAccuracy = options?.desiredAccuracy ?? MAX_ACCEPTABLE_ACCURACY

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 'unsupported', message: ERROR_MESSAGES.unsupported } satisfies GeoError)
      return
    }

    let best: Coords | null = null
    let settled = false
    let watchId: number

    function finish() {
      if (settled) return
      settled = true
      navigator.geolocation.clearWatch(watchId)
      clearTimeout(timer)
      if (best && best.accuracy <= desiredAccuracy) {
        resolve(best)
      } else if (best) {
        // Conseguimos uma posição, mas imprecisa demais (localização aproximada).
        reject({ code: 'inaccurate', message: ERROR_MESSAGES.inaccurate } satisfies GeoError)
      } else {
        reject({ code: 'timeout', message: ERROR_MESSAGES.timeout } satisfies GeoError)
      }
    }

    const timer = setTimeout(finish, timeoutMs)

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c: Coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        if (!best || c.accuracy < best.accuracy) best = c
        // Assim que a precisão estiver boa, encerra na hora.
        if (c.accuracy <= desiredAccuracy) finish()
      },
      (err) => {
        if (settled) return
        // Se já temos alguma leitura, deixa o timeout decidir; senão, falha agora.
        if (best) return
        settled = true
        navigator.geolocation.clearWatch(watchId)
        clearTimeout(timer)
        const code: GeoError['code'] =
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'unavailable'
              : err.code === err.TIMEOUT
                ? 'timeout'
                : 'unknown'
        reject({ code, message: ERROR_MESSAGES[code] } satisfies GeoError)
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    )
  })
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
