/**
 * 기상청 단기예보((구)동네예보) 조회서비스 — 공공데이터포털(apis.data.go.kr).
 *
 * 실패 시(키 미승인, 네트워크 오류 등) 항상 null을 반환한다 — 호출부는 계절 평균
 * 추정치로 조용히 폴백한다 (src/hooks/useWeather.ts 참고).
 */
import { toISODate } from '@/lib/utils'
import type { WeatherSnapshot } from '@/types'

const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
const serviceKey = import.meta.env.VITE_KMA_SERVICE_KEY

export const isKmaConfigured = typeof serviceKey === 'string' && serviceKey.length > 0

/** 단기예보 발표시각(3시간 간격, ~10분 지연) 중 지금 기준 가장 최근 시각을 구한다 */
function latestBaseDateTime(now: Date): { date: string; time: string } {
  const times = [2, 5, 8, 11, 14, 17, 20, 23]
  const d = new Date(now)
  d.setMinutes(d.getMinutes() - 10) // 발표 지연 보정

  let hour = d.getHours()
  let candidate = [...times].reverse().find((t) => t <= hour)

  if (candidate === undefined) {
    // 자정 직후(00~01시대) — 전날 23시 발표를 쓴다
    d.setDate(d.getDate() - 1)
    candidate = 23
  }
  hour = candidate

  return { date: toISODate(d).replace(/-/g, ''), time: `${String(hour).padStart(2, '0')}00` }
}

interface ForecastItem {
  category: string
  fcstDate: string
  fcstTime: string
  fcstValue: string
}

const SKY_LABEL: Record<string, WeatherSnapshot['status']> = {
  '1': '맑음',
  '3': '구름',
  '4': '흐림',
}
const PTY_LABEL: Record<string, WeatherSnapshot['status']> = {
  '1': '비',
  '2': '비',
  '3': '눈',
  '4': '비',
}

/** 체감온도 근사 — 기온이 낮고 바람이 있을 때만 간단한 풍속냉각 보정을 적용한다 */
function approximateFeelsLike(tempC: number, windSpeedMs: number): number {
  if (tempC > 10 || windSpeedMs < 1.3) return tempC
  const v = Math.pow(windSpeedMs * 3.6, 0.16)
  const wct = 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v
  return Math.round(wct * 10) / 10
}

export async function fetchKmaWeather(
  nx: number,
  ny: number,
  locationName: string,
): Promise<WeatherSnapshot | null> {
  if (!isKmaConfigured) return null

  try {
    const now = new Date()
    const { date, time } = latestBaseDateTime(now)
    const params = new URLSearchParams({
      serviceKey,
      numOfRows: '500',
      pageNo: '1',
      dataType: 'JSON',
      base_date: date,
      base_time: time,
      nx: String(nx),
      ny: String(ny),
    })

    const res = await fetch(`${BASE_URL}?${params.toString()}`)
    if (!res.ok) {
      console.warn(`[ToFit] 기상청 API 오류: ${res.status}`)
      return null
    }

    const data = await res.json()
    const items: ForecastItem[] = data?.response?.body?.items?.item ?? []
    if (items.length === 0) return null

    const todayStr = toISODate(now).replace(/-/g, '')
    const nowHHmm = `${String(now.getHours()).padStart(2, '0')}00`

    const nearestForCategory = (category: string): ForecastItem | undefined => {
      const candidates = items.filter((i) => i.category === category && i.fcstDate === todayStr)
      return (
        candidates.find((i) => i.fcstTime >= nowHHmm) ??
        candidates.sort((a, b) => a.fcstTime.localeCompare(b.fcstTime))[0]
      )
    }

    const tmp = nearestForCategory('TMP')
    const pop = nearestForCategory('POP')
    const sky = nearestForCategory('SKY')
    const pty = nearestForCategory('PTY')
    const wsd = nearestForCategory('WSD')
    const tmn = items.find((i) => i.category === 'TMN' && i.fcstDate === todayStr)
    const tmx = items.find((i) => i.category === 'TMX' && i.fcstDate === todayStr)

    if (!tmp) return null

    const temperature = Number(tmp.fcstValue)
    const windSpeed = wsd ? Number(wsd.fcstValue) : 0
    const status = (pty && pty.fcstValue !== '0' ? PTY_LABEL[pty.fcstValue] : undefined) ??
      (sky ? SKY_LABEL[sky.fcstValue] : undefined) ??
      '맑음'

    return {
      temperature,
      temperatureHigh: tmx ? Number(tmx.fcstValue) : temperature,
      temperatureLow: tmn ? Number(tmn.fcstValue) : temperature,
      feelsLike: approximateFeelsLike(temperature, windSpeed),
      status,
      precipitationChance: pop ? Number(pop.fcstValue) : 0,
      locationName,
    }
  } catch (error) {
    console.warn('[ToFit] 기상청 API 호출 실패', error)
    return null
  }
}
