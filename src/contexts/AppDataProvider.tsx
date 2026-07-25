import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/lib/firebase'
import { toISODate } from '@/lib/utils'
import {
  addClothingItemDoc,
  markItemsWorn,
  removeClothingItemDoc,
  subscribeCloset,
  updateClothingItemDoc,
} from '@/services/firestoreCloset'
import { createPostDoc, subscribePosts, toggleLikeDoc } from '@/services/firestoreCommunity'
import {
  addFeedbackDoc,
  addSavedOutfitDoc,
  removeSavedOutfitDoc,
  setSavedOutfitWorn,
  subscribeFeedbacks,
  subscribeSavedOutfits,
} from '@/services/firestoreOutfits'
import { computeActivityScore, syncPublicProfileStats } from '@/services/firestoreProfile'
import type { ClothingItem, CommunityPost, Coordinate, OutfitFeedback, SavedOutfit } from '@/types'
import { AppDataContext, type AppDataContextValue } from './app-data-context'

/** 무료 사용자 하루 추천 한도 (Lean Canvas 수익 모델) */
const DAILY_FREE_LIMIT = 2
const QUOTA_KEY = 'tofit.quota'

interface QuotaState {
  date: string
  used: number
}

function readStoredQuota(): QuotaState {
  const today = toISODate(new Date())
  try {
    const raw = localStorage.getItem(QUOTA_KEY)
    const stored = raw ? (JSON.parse(raw) as QuotaState) : { date: today, used: 0 }
    return stored.date === today ? stored : { date: today, used: 0 }
  } catch {
    return { date: today, used: 0 }
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.id ?? null

  const [closet, setCloset] = useState<ClothingItem[]>([])
  const [closetLoading, setClosetLoading] = useState(true)
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [feedbacks, setFeedbacks] = useState<OutfitFeedback[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [quota, setQuota] = useState<QuotaState>(readStoredQuota)

  useEffect(() => localStorage.setItem(QUOTA_KEY, JSON.stringify(quota)), [quota])

  /* ── Firestore 구독 ───────────────────────────────────────── */

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) {
      setCloset([])
      setClosetLoading(false)
      return
    }
    setClosetLoading(true)
    return subscribeCloset(uid, (items) => {
      setCloset(items)
      setClosetLoading(false)
    })
  }, [uid])

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) {
      setSavedOutfits([])
      return
    }
    return subscribeSavedOutfits(uid, setSavedOutfits)
  }, [uid])

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) {
      setFeedbacks([])
      return
    }
    return subscribeFeedbacks(uid, setFeedbacks)
  }, [uid])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setPosts([])
      setPostsLoading(false)
      return
    }
    setPostsLoading(true)
    return subscribePosts(uid, (items) => {
      setPosts(items)
      setPostsLoading(false)
    })
  }, [uid])

  /* ── 랭킹용 활동 점수 동기화 ──────────────────────────────── */

  useEffect(() => {
    if (!isFirebaseConfigured || !uid || closetLoading) return
    const wornCount = closet.filter((item) => item.wearCount > 0).length
    const stats = {
      wearCount: closet.reduce((sum, item) => sum + item.wearCount, 0),
      closetCount: closet.length,
      closetUtilization: closet.length === 0 ? 0 : wornCount / closet.length,
      savedOutfitCount: savedOutfits.length,
    }
    void syncPublicProfileStats(uid, { ...stats, activityScore: computeActivityScore(stats) })
  }, [uid, closet, closetLoading, savedOutfits])

  /* ── 옷장 ─────────────────────────────────────────────────── */

  const addClothingItem = useCallback<AppDataContextValue['addClothingItem']>(
    (item) => {
      if (!uid) return
      void addClothingItemDoc(uid, item)
    },
    [uid],
  )

  const removeClothingItem = useCallback(
    (id: string) => {
      if (!uid) return
      void removeClothingItemDoc(uid, id)
    },
    [uid],
  )

  const togglePreferred = useCallback(
    (id: string) => {
      if (!uid) return
      const item = closet.find((c) => c.id === id)
      if (!item) return
      void updateClothingItemDoc(uid, id, { isPreferred: !item.isPreferred })
    },
    [uid, closet],
  )

  const markCoordinateWorn = useCallback(
    (coordinate: Coordinate) => {
      if (!uid) return
      const itemIds = coordinate.slots
        .map((slot) => slot.clothingItemId)
        .filter((id): id is string => Boolean(id))
      if (itemIds.length > 0) void markItemsWorn(uid, itemIds)
    },
    [uid],
  )

  /* ── 저장한 코디 ──────────────────────────────────────────── */

  const saveOutfit = useCallback(
    (coordinate: Coordinate) => {
      if (!uid) return
      if (savedOutfits.some((saved) => saved.coordinate.id === coordinate.id)) return
      void addSavedOutfitDoc(uid, coordinate)
    },
    [uid, savedOutfits],
  )

  const unsaveOutfit = useCallback(
    (savedId: string) => {
      if (!uid) return
      void removeSavedOutfitDoc(uid, savedId)
    },
    [uid],
  )

  const toggleWorn = useCallback(
    (savedId: string) => {
      if (!uid) return
      const saved = savedOutfits.find((s) => s.id === savedId)
      if (!saved) return
      if (!saved.worn) markCoordinateWorn(saved.coordinate)
      void setSavedOutfitWorn(uid, savedId, !saved.worn)
    },
    [uid, savedOutfits, markCoordinateWorn],
  )

  const savedCoordinateIds = useMemo(
    () => new Set(savedOutfits.map((saved) => saved.coordinate.id)),
    [savedOutfits],
  )
  const isSaved = useCallback(
    (coordinateId: string) => savedCoordinateIds.has(coordinateId),
    [savedCoordinateIds],
  )

  /* ── 피드백 ───────────────────────────────────────────────── */

  const addFeedback = useCallback<AppDataContextValue['addFeedback']>(
    (feedback) => {
      if (!uid) return
      void addFeedbackDoc(uid, feedback)
    },
    [uid],
  )

  /* ── 커뮤니티 ─────────────────────────────────────────────── */

  const createPost = useCallback<AppDataContextValue['createPost']>((post) => {
    void createPostDoc(post)
  }, [])

  const toggleLike = useCallback(
    (postId: string) => {
      if (!uid) return
      const post = posts.find((p) => p.id === postId)
      if (!post) return
      void toggleLikeDoc(postId, uid, post.liked)
    },
    [uid, posts],
  )

  /* ── 추천 횟수 제한 ───────────────────────────────────────── */

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
      closetLoading,
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
      postsLoading,
      createPost,
      toggleLike,
      remainingRecommendations,
      consumeRecommendation,
    }),
    [
      closet,
      closetLoading,
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
      postsLoading,
      createPost,
      toggleLike,
      remainingRecommendations,
      consumeRecommendation,
    ],
  )

  return <AppDataContext value={value}>{children}</AppDataContext>
}
