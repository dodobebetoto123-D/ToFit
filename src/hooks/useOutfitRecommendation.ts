import { useEffect, useMemo, useState } from 'react'
import { generateOutfitCopy, isGroqConfigured } from '@/lib/groq'
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
 * 백그라운드에서 Groq에게 **선택된 후보의** reason/mascotComment 문구만 자연스럽게
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

    return recommendCoordinates({ closet, profile, weather, situation, closetOnly, excludeItemIds })
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

  useEffect(() => {
    if (!base || !profile || !isGroqConfigured) return

    let cancelled = false
    setAiEnhancing(true)

    generateOutfitCopy({
      situationLabel: situationLabel[situation],
      weatherSummary: `체감 ${weather.feelsLike}℃, ${weather.status}, 강수확률 ${weather.precipitationChance}%`,
      personalColorLabel: personalColorLabel[profile.personalColor],
      nickname: profile.nickname,
      items: base.coordinate.slots.map((slot) => ({
        name: slot.name,
        brand: slot.brand,
        colorName: slot.colorName,
        categoryLabel: majorCategoryLabel[slot.majorCategory],
      })),
    }).then((copy) => {
      if (cancelled) return
      setAiEnhancing(false)
      if (copy) setAiCopy({ coordinateId: base.coordinate.id, ...copy })
    })

    return () => {
      cancelled = true
    }
  }, [base, profile, situation, weather])

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
