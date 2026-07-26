import { useCallback, useEffect, useState } from 'react'
import { latLonToGrid } from '@/lib/kmaGrid'
import { fetchKmaWeather } from '@/services/kmaWeather'
import type { WeatherSnapshot } from '@/types'

/** 위치 접근이 안 될 때 쓰는 기본 좌표 — 서울 시청 */
const FALLBACK_GRID = { nx: 60, ny: 127 }

/** 대한민국 평년(1991~2020) 월평균기온 근사치 — 실시간 조회가 안 될 때만 쓰는 계절 추정값 */
const MONTHLY_AVG_TEMP: Record<number, number> = {
  1: -1.9, 2: 0.7, 3: 5.9, 4: 12.5, 5: 18.0, 6: 22.5,
  7: 25.7, 8: 26.2, 9: 21.6, 10: 14.7, 11: 7.5, 12: 0.4,
}

function seasonalEstimate(): WeatherSnapshot {
  const month = new Date().getMonth() + 1
  const temp = Math.round((MONTHLY_AVG_TEMP[month] ?? 15) * 10) / 10
  return {
    temperature: temp,
    temperatureHigh: Math.round((temp + 4) * 10) / 10,
    temperatureLow: Math.round((temp - 4) * 10) / 10,
    feelsLike: temp,
    status: '맑음',
    precipitationChance: 20,
    locationName: '평년 기온 추정',
  }
}

/** 위치를 못 받은 이유 — 화면에 뭘 안내할지 결정한다 */
export type LocationIssue =
  | null
  /** 브라우저·OS 설정에서 이미 거부된 상태. 다시 물어봐도 프롬프트가 안 뜬다. */
  | 'DENIED'
  /** 신호를 못 잡았거나 시간 초과 — 다시 시도하면 될 수도 있다. */
  | 'UNAVAILABLE'
  /** 이 브라우저가 위치를 지원하지 않음 */
  | 'UNSUPPORTED'

interface PositionResult {
  position: GeolocationPosition | null
  issue: LocationIssue
}

/**
 * 위치를 요청하고 **실패 사유까지** 돌려준다.
 * 예전에는 오류를 그냥 버려서, 권한이 거부된 상태로 재시도 버튼을 눌러도 화면에
 * 아무 변화가 없어 "버튼이 안 먹는다"처럼 보였다.
 */
function getPosition(): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ position: null, issue: 'UNSUPPORTED' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ position, issue: null }),
      (error) =>
        resolve({
          position: null,
          issue: error.code === error.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE',
        }),
      // 재시도할 때는 캐시된 위치를 쓰지 않는다 — 안 그러면 눌러도 같은 값이 돌아온다.
      { timeout: 8000, maximumAge: 0 },
    )
  })
}

/** 권한 상태를 미리 확인한다 (지원하지 않는 브라우저면 null) */
async function readPermission(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query) return null
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return status.state
  } catch {
    return null
  }
}

export interface UseWeatherResult {
  weather: WeatherSnapshot
  loading: boolean
  /** 실시간 조회 실패로 계절 평균 추정치를 보여주는 중인지 */
  isEstimate: boolean
  /** 위치 권한을 못 받아 서울 기준으로 보여주고 있는지 */
  locationDenied: boolean
  /** 위치를 못 받은 구체적인 사유 — 안내 문구를 고르는 데 쓴다 */
  locationIssue: LocationIssue
  /** 브라우저 설정에서 이미 차단돼 버튼만으로는 해결이 안 되는 상태인지 */
  locationBlocked: boolean
  /** 위치 권한을 다시 요청하고 날씨를 새로 불러온다 */
  retryLocation: () => void
}

export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherSnapshot>(seasonalEstimate)
  const [loading, setLoading] = useState(true)
  const [isEstimate, setIsEstimate] = useState(true)
  const [locationIssue, setLocationIssue] = useState<LocationIssue>(null)
  const [locationBlocked, setLocationBlocked] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const permission = await readPermission()
      const { position, issue } = await getPosition()
      if (cancelled) return

      const grid = position
        ? latLonToGrid(position.coords.latitude, position.coords.longitude)
        : FALLBACK_GRID
      const locationName = position ? '현재 위치' : '서울'

      const real = await fetchKmaWeather(grid.nx, grid.ny, locationName)
      if (cancelled) return

      setLocationIssue(issue)
      // 브라우저가 이미 '차단'으로 기억하고 있으면 다시 눌러도 프롬프트가 안 뜬다.
      setLocationBlocked(permission === 'denied' || issue === 'DENIED')

      if (real) {
        setWeather(real)
        setIsEstimate(false)
      } else {
        setWeather(seasonalEstimate())
        setIsEstimate(true)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [retryCount])

  const retryLocation = useCallback(() => setRetryCount((count) => count + 1), [])

  return {
    weather,
    loading,
    isEstimate,
    locationDenied: locationIssue !== null,
    locationIssue,
    locationBlocked,
    retryLocation,
  }
}
