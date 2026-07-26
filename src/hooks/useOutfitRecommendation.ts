import { useEffect, useMemo, useRef, useState } from 'react'
import { generateOutfitCopy, isAiConfigured, type OutfitCopyResult } from '@/lib/ai'
import { majorCategoryLabel, personalColorLabel, situationLabel } from '@/lib/labels'
import { recommendCoordinates, type RecommendResult } from '@/services/recommend'
import type { ClothingItem, Situation, UserProfile, WeatherSnapshot } from '@/types'

interface UseOutfitRecommendationInput {
  closet: ClothingItem[]
  profile: UserProfile | null
  weather: WeatherSnapshot
  situation: Situation
  closetOnly: boolean
  /** "다시 추천" 횟수 — 늘어날 때마다 최근 착용 상위 아이템을 제외하고 다시 계산한다 */
  reshuffle: number
}

/**
 * 규칙 기반 추천(recommendCoordinates)으로 코디 후보 3개를 즉시 계산해 렌더링하고,
 * 백그라운드에서 AI에게 **선택된 후보의** reason/mascotComment 문구만 자연스럽게
 * 다시 쓰게 한다. 점수 계산(breakdown)은 항상 규칙 기반 결과 그대로 — AI는 문구만
 * 담당한다. 후보 3개 전부에 AI 호출을 하면 비용이 3배가 되니 선택된 것만 보강한다.
 */
export function useOutfitRecommendation(input: UseOutfitRecommendationInput) {
  const { closet, profile, weather, situation, closetOnly, reshuffle } = input

  const bases = useMemo<RecommendResult[]>(() => {
    if (!profile) return []
    const excludeItemIds = closet
      .slice()
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, reshuffle)
      .map((item) => item.id)

    return recommendCoordinates(
      { closet, profile, weather, situation, closetOnly, excludeItemIds },
      3,
      reshuffle,
    )
  }, [closet, profile, weather, situation, closetOnly, reshuffle])

  const [selectedIndex, setSelectedIndex] = useState(0)

  // 후보가 새로 계산되면(TPO 변경·다시 추천 등) 항상 첫 번째 후보부터 다시 보여준다.
  useEffect(() => {
    setSelectedIndex(0)
  }, [bases])

  const base = bases[selectedIndex] ?? null

  const [aiCopy, setAiCopy] = useState<{
    coordinateId: string
    reason: string
    mascotComment: string
  } | null>(null)
  const [aiEnhancing, setAiEnhancing] = useState(false)

  /**
   * 코디 id는 상황·체감온도·아이템 구성을 모두 담은 결정적 문자열이라 캐시 키로 그대로 쓴다.
   * 한 번 받은 문구는 다시 부르지 않는다 — TPO 탭을 오가도 재호출이 없다.
   */
  const copyCache = useRef(new Map<string, OutfitCopyResult>())
  /** 같은 코디에 대해 요청이 겹치지 않게 막는다 (StrictMode의 이중 실행 포함) */
  const inFlight = useRef(new Set<string>())

  // 문구 생성에 필요한 최신 값들 — 이걸 effect 의존성에 넣으면 내용이 같아도
  // 객체 참조가 바뀔 때마다 재호출되므로 ref로 들고만 있는다.
  const contextRef = useRef({ profile, situation, weather })
  contextRef.current = { profile, situation, weather }

  const coordinateId = base?.coordinate.id ?? null

  useEffect(() => {
    if (!coordinateId || !isAiConfigured) return

    const cached = copyCache.current.get(coordinateId)
    if (cached) {
      setAiCopy({ coordinateId, ...cached })
      return
    }
    if (inFlight.current.has(coordinateId)) return

    const { profile: p, situation: s, weather: w } = contextRef.current
    if (!p) return

    const slots = base?.coordinate.slots ?? []
    let cancelled = false
    inFlight.current.add(coordinateId)
    setAiEnhancing(true)

    generateOutfitCopy({
      situationLabel: situationLabel[s],
      weatherSummary: `체감 ${w.feelsLike}℃, ${w.status}, 강수확률 ${w.precipitationChance}%`,
      personalColorLabel: personalColorLabel[p.personalColor],
      nickname: p.nickname,
      items: slots.map((slot) => ({
        name: slot.name,
        brand: slot.brand,
        colorName: slot.colorName,
        categoryLabel: majorCategoryLabel[slot.majorCategory],
      })),
    })
      .then((copy) => {
        if (copy) copyCache.current.set(coordinateId, copy)
        if (cancelled) return
        setAiEnhancing(false)
        if (copy) setAiCopy({ coordinateId, ...copy })
      })
      .finally(() => {
        inFlight.current.delete(coordinateId)
      })

    return () => {
      cancelled = true
    }
    // base는 coordinateId가 같으면 내용도 같다 — 참조 변화로 재호출되지 않게 id만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinateId])

  const coordinate = useMemo(() => {
    if (!base) return null
    if (aiCopy && aiCopy.coordinateId === base.coordinate.id) {
      return { ...base.coordinate, reason: aiCopy.reason, mascotComment: aiCopy.mascotComment }
    }
    return base.coordinate
  }, [base, aiCopy])

  return {
    /** 선택 가능한 코디 후보 전체 (보통 3개) */
    coordinates: bases.map((b) => b.coordinate),
    selectedIndex,
    selectCoordinate: setSelectedIndex,
    /** 현재 선택된 후보 — AI 문구 보강 적용 */
    coordinate,
    breakdown: base?.breakdown ?? [],
    filledByBrand: base?.filledByBrand ?? [],
    /** AI가 문구를 다듬는 중 — 결과는 이미 화면에 있으므로 조용한 표시 정도로만 쓴다 */
    aiEnhancing,
  }
}
