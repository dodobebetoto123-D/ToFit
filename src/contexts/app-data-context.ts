import { createContext } from 'react'
import type {
  ClothingItem,
  CommunityPost,
  Coordinate,
  OutfitFeedback,
  SavedOutfit,
  ScheduleSituation,
  StyleTwin,
  WeatherSnapshot,
} from '@/types'

export interface AppDataContextValue {
  closet: ClothingItem[]
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
  toggleLike: (postId: string) => void

  twins: StyleTwin[]
  toggleFollowTwin: (twinId: string) => void

  weather: WeatherSnapshot
  schedules: ScheduleSituation[]

  /** 오늘 남은 무료 추천 횟수 (수익 모델: 일 2회 제한) */
  remainingRecommendations: number
  consumeRecommendation: () => boolean
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)
