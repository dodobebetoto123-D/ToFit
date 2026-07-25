import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  ClothingItem,
  CommunityPost,
  Coordinate,
  OutfitFeedback,
  SavedOutfit,
  StyleTwin,
} from '@/types'
import {
  mockCloset,
  mockPosts,
  mockSchedules,
  mockTwins,
  mockWeather,
} from '@/data/mock'
import { createId, toISODate } from '@/lib/utils'
import { AppDataContext, type AppDataContextValue } from './app-data-context'

const CLOSET_KEY = 'tofit.closet'
const SAVED_KEY = 'tofit.saved'
const FEEDBACK_KEY = 'tofit.feedbacks'
const QUOTA_KEY = 'tofit.quota'

/** 무료 사용자 하루 추천 한도 (Lean Canvas 수익 모델) */
const DAILY_FREE_LIMIT = 2

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

interface QuotaState {
  date: string
  used: number
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [closet, setCloset] = useState<ClothingItem[]>(() => readStored(CLOSET_KEY, mockCloset))
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(() => readStored(SAVED_KEY, []))
  const [feedbacks, setFeedbacks] = useState<OutfitFeedback[]>(() => readStored(FEEDBACK_KEY, []))
  const [posts, setPosts] = useState<CommunityPost[]>(mockPosts)
  const [twins, setTwins] = useState<StyleTwin[]>(mockTwins)
  const [quota, setQuota] = useState<QuotaState>(() => {
    const today = toISODate(new Date())
    const stored = readStored<QuotaState>(QUOTA_KEY, { date: today, used: 0 })
    return stored.date === today ? stored : { date: today, used: 0 }
  })

  useEffect(() => localStorage.setItem(CLOSET_KEY, JSON.stringify(closet)), [closet])
  useEffect(() => localStorage.setItem(SAVED_KEY, JSON.stringify(savedOutfits)), [savedOutfits])
  useEffect(() => localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks)), [feedbacks])
  useEffect(() => localStorage.setItem(QUOTA_KEY, JSON.stringify(quota)), [quota])

  /* ── 옷장 ─────────────────────────────────────────────── */

  const addClothingItem = useCallback<AppDataContextValue['addClothingItem']>((item) => {
    const now = new Date().toISOString()
    setCloset((prev) => [
      { ...item, id: createId('cloth'), wearCount: 0, createdAt: now, updatedAt: now },
      ...prev,
    ])
  }, [])

  const removeClothingItem = useCallback((id: string) => {
    setCloset((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const togglePreferred = useCallback((id: string) => {
    setCloset((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isPreferred: !item.isPreferred, updatedAt: new Date().toISOString() }
          : item,
      ),
    )
  }, [])

  const markCoordinateWorn = useCallback((coordinate: Coordinate) => {
    const wornIds = new Set(
      coordinate.slots.map((slot) => slot.clothingItemId).filter((id): id is string => Boolean(id)),
    )
    const now = new Date().toISOString()
    setCloset((prev) =>
      prev.map((item) =>
        wornIds.has(item.id)
          ? { ...item, wearCount: item.wearCount + 1, lastWornAt: now, updatedAt: now }
          : item,
      ),
    )
  }, [])

  /* ── 저장한 코디 ──────────────────────────────────────── */

  const saveOutfit = useCallback((coordinate: Coordinate) => {
    setSavedOutfits((prev) => {
      if (prev.some((saved) => saved.coordinate.id === coordinate.id)) return prev
      return [
        { id: createId('saved'), coordinate, savedAt: new Date().toISOString(), worn: false },
        ...prev,
      ]
    })
  }, [])

  const unsaveOutfit = useCallback((savedId: string) => {
    setSavedOutfits((prev) => prev.filter((saved) => saved.id !== savedId))
  }, [])

  const toggleWorn = useCallback(
    (savedId: string) => {
      setSavedOutfits((prev) =>
        prev.map((saved) => {
          if (saved.id !== savedId) return saved
          if (!saved.worn) markCoordinateWorn(saved.coordinate)
          return { ...saved, worn: !saved.worn }
        }),
      )
    },
    [markCoordinateWorn],
  )

  const savedCoordinateIds = useMemo(
    () => new Set(savedOutfits.map((saved) => saved.coordinate.id)),
    [savedOutfits],
  )
  const isSaved = useCallback(
    (coordinateId: string) => savedCoordinateIds.has(coordinateId),
    [savedCoordinateIds],
  )

  /* ── 피드백 ───────────────────────────────────────────── */

  const addFeedback = useCallback<AppDataContextValue['addFeedback']>((feedback) => {
    setFeedbacks((prev) => [
      { ...feedback, id: createId('fb'), createdAt: new Date().toISOString() },
      ...prev,
    ])
  }, [])

  /* ── 커뮤니티 ─────────────────────────────────────────── */

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) }
          : post,
      ),
    )
  }, [])

  const toggleFollowTwin = useCallback((twinId: string) => {
    setTwins((prev) =>
      prev.map((twin) => (twin.id === twinId ? { ...twin, following: !twin.following } : twin)),
    )
  }, [])

  /* ── 추천 횟수 제한 ───────────────────────────────────── */

  const consumeRecommendation = useCallback(() => {
    const today = toISODate(new Date())
    let allowed = false
    setQuota((prev) => {
      const base = prev.date === today ? prev : { date: today, used: 0 }
      if (base.used >= DAILY_FREE_LIMIT) return base
      allowed = true
      return { date: today, used: base.used + 1 }
    })
    return allowed
  }, [])

  const remainingRecommendations = Math.max(0, DAILY_FREE_LIMIT - quota.used)

  const value = useMemo<AppDataContextValue>(
    () => ({
      closet,
      addClothingItem,
      removeClothingItem,
      togglePreferred,
      markCoordinateWorn,
      savedOutfits,
      saveOutfit,
      unsaveOutfit,
      isSaved,
      toggleWorn,
      feedbacks,
      addFeedback,
      posts,
      toggleLike,
      twins,
      toggleFollowTwin,
      weather: mockWeather,
      schedules: mockSchedules,
      remainingRecommendations,
      consumeRecommendation,
    }),
    [
      closet,
      addClothingItem,
      removeClothingItem,
      togglePreferred,
      markCoordinateWorn,
      savedOutfits,
      saveOutfit,
      unsaveOutfit,
      isSaved,
      toggleWorn,
      feedbacks,
      addFeedback,
      posts,
      toggleLike,
      twins,
      toggleFollowTwin,
      remainingRecommendations,
      consumeRecommendation,
    ],
  )

  return <AppDataContext value={value}>{children}</AppDataContext>
}
