import { createContext } from 'react'
import type { ClothingItem, CommunityPost, Coordinate, OutfitFeedback, SavedOutfit } from '@/types'

export interface AppDataContextValue {
  closet: ClothingItem[]
  closetLoading: boolean
  addClothingItem: (item: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>) => void
  removeClothingItem: (id: string) => void
  togglePreferred: (id: string) => void
  /** 코디 착용 처리 — 구성 아이템의 wearCount 를 올리고 lastWornAt 을 갱신한다 */
  markCoordinateWorn: (coordinate: Coordinate) => void

  savedOutfits: SavedOutfit[]
  saveOutfit: (coordinate: Coordinate) => void
  unsaveOutfit: (savedId: string) => void
  isSaved: (coordinateId: string) => boolean
  toggleWorn: (savedId: string) => void

  feedbacks: OutfitFeedback[]
  addFeedback: (feedback: Omit<OutfitFeedback, 'id' | 'createdAt'>) => void

  posts: CommunityPost[]
  postsLoading: boolean
  createPost: (
    post: Omit<
      CommunityPost,
      'id' | 'likedBy' | 'likeCount' | 'commentCount' | 'viewCount' | 'liked' | 'createdAt'
    >,
  ) => void
  toggleLike: (postId: string) => void
  /** 작성자 본인 글만 삭제된다 (Firestore 보안 규칙으로도 강제) */
  deletePost: (postId: string) => void

  /** 오늘 남은 무료 추천 횟수 (수익 모델: 일 2회 제한) */
  remainingRecommendations: number
  consumeRecommendation: () => boolean
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)
