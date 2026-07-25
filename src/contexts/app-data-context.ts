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
  /** "오늘 이거 입었어요" — 저장 여부와 무관하게 바로 착용 기록(worn:true)을 남긴다 */
  wearCoordinateNow: (coordinate: Coordinate) => void

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
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)
