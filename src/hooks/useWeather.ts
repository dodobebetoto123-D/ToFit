import { useEffect, useState } from 'react'
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

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export interface UseWeatherResult {
  weather: WeatherSnapshot
  loading: boolean
  /** 실시간 조회 실패로 계절 평균 추정치를 보여주는 중인지 */
  isEstimate: boolean
}

export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherSnapshot>(seasonalEstimate)
  const [loading, setLoading] = useState(true)
  const [isEstimate, setIsEstimate] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const position = await getPosition()
      const grid = position
        ? latLonToGrid(position.coords.latitude, position.coords.longitude)
        : FALLBACK_GRID
      const locationName = position ? '현재 위치' : '서울'

      const real = await fetchKmaWeather(grid.nx, grid.ny, locationName)
      if (cancelled) return

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
  }, [])

  return { weather, loading, isEstimate }
}
