import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/lib/firebase'
import { avatarColorForUid } from '@/services/firestoreProfile'
import { fetchStyleTwins } from '@/services/firestoreTwins'
import type { PublicProfile, StyleTwin } from '@/types'

/** 나와 가장 비슷한 스타일 트윈 목록 — publicProfiles 컬렉션 기반 실데이터 매칭 */
export function useStyleTwins(topN = 10) {
  const { user, updateProfile } = useAuth()
  const [twins, setTwins] = useState<StyleTwin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isFirebaseConfigured || !user) {
      setTwins([])
      setLoading(false)
      return
    }
    setLoading(true)
    const me: PublicProfile = {
      uid: user.id,
      nickname: user.nickname,
      avatarColor: avatarColorForUid(user.id),
      height: user.height,
      weight: user.weight,
      bodyShape: user.bodyShape,
      personalColor: user.personalColor,
      styleTags: user.preferredStyles ?? [],
      stats: { wearCount: 0, closetCount: 0, closetUtilization: 0, savedOutfitCount: 0, activityScore: 0 },
      updatedAt: user.updatedAt,
    }
    const result = await fetchStyleTwins(me, topN)
    const following = new Set(user.following ?? [])
    setTwins(result.map((twin) => ({ ...twin, following: following.has(twin.id) })))
    setLoading(false)
  }, [user, topN])

  useEffect(() => {
    void load()
  }, [load])

  const toggleFollow = useCallback(
    (twinId: string) => {
      if (!user) return
      const currentFollowing = user.following ?? []
      const isFollowing = currentFollowing.includes(twinId)
      const nextFollowing = isFollowing
        ? currentFollowing.filter((id) => id !== twinId)
        : [...currentFollowing, twinId]
      void updateProfile({ following: nextFollowing })
      setTwins((prev) => prev.map((t) => (t.id === twinId ? { ...t, following: !isFollowing } : t)))
    },
    [user, updateProfile],
  )

  return { twins, loading, toggleFollow, refresh: load }
}
