export type Coords = {
  latitude: number
  longitude: number
  accuracy: number
}

export type GeoError = {
  code: 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'unknown'
  message: string
}

const ERROR_MESSAGES: Record<GeoError['code'], string> = {
  unsupported: 'Seu navegador não suporta geolocalização.',
  denied: 'Você bloqueou o acesso à localização. Libera nas configurações do navegador e tenta de novo.',
  unavailable: 'Não foi possível obter sua localização. Tenta sair e entrar de novo no local.',
  timeout: 'Demorou demais pra pegar sua localização. Tenta de novo.',
  unknown: 'Erro inesperado ao pegar sua localização.',
}

export function getCurrentPosition(options?: { timeoutMs?: number }): Promise<Coords> {
  const timeoutMs = options?.timeoutMs ?? 12000

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 'unsupported', message: ERROR_MESSAGES.unsupported } satisfies GeoError)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
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
