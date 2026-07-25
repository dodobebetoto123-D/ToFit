import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PostCard } from '@/components/community/PostCard'
import { PostDetailModal } from '@/components/community/PostDetailModal'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { OutfitBoard } from '@/components/outfit/OutfitBoard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { situationEmoji, situationLabel } from '@/lib/labels'
import { isFirebaseConfigured } from '@/lib/firebase'
import { fromNow } from '@/lib/utils'
import { avatarColorForUid } from '@/services/firestoreProfile'
import { subscribeLikedPosts } from '@/services/firestoreCommunity'
import { SITUATIONS, type CommunityPost, type Situation } from '@/types'

type Filter = Situation | 'ALL'
type MainTab = 'OUTFITS' | 'LIKED_POSTS'

const MAIN_TABS: ReadonlyArray<SegmentedOption<MainTab>> = [
  { value: 'OUTFITS', label: '저장한 코디' },
  { value: 'LIKED_POSTS', label: '좋아요한 게시글' },
]

function SavedOutfitsSection() {
  const { savedOutfits, unsaveOutfit, toggleWorn } = useAppData()
  const [filter, setFilter] = useState<Filter>('ALL')

  const usedSituations = useMemo(
    () => SITUATIONS.filter((s) => savedOutfits.some((o) => o.coordinate.situation === s)),
    [savedOutfits],
  )

  const filters: ReadonlyArray<SegmentedOption<Filter>> = [
    { value: 'ALL', label: '전체' },
    ...usedSituations.map((s) => ({
      value: s as Filter,
      label: situationLabel[s],
      icon: situationEmoji[s],
    })),
  ]

  const visible =
    filter === 'ALL'
      ? savedOutfits
      : savedOutfits.filter((outfit) => outfit.coordinate.situation === filter)

  if (savedOutfits.length === 0) {
    return (
      <div className="tf-empty tf-reveal">
        <MascotBubble
          message="아직 저장한 코디가 없어요. 마음에 드는 코디를 찜해두면 여기 모여요!"
          mood="thinking"
        />
        <Link to="/recommend">
          <Button variant="soft" leading={<Icon name="sparkle" size={16} />}>
            코디 추천받으러 가기
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      {filters.length > 1 && (
        <div className="tf-toolbar tf-reveal">
          <SegmentedTabs ariaLabel="상황별 필터" options={filters} value={filter} onChange={setFilter} />
        </div>
      )}

      <div className="tf-savedlist tf-stagger">
        {visible.map((outfit) => (
          <Card
            key={outfit.id}
            icon={situationEmoji[outfit.coordinate.situation]}
            title={outfit.coordinate.styleName}
            action={<span className="tf-micro">{fromNow(outfit.savedAt)} 저장</span>}
          >
            <OutfitBoard coordinate={outfit.coordinate} />
            <p className="tf-reason">{outfit.coordinate.reason}</p>

            <div className="tf-outfit-actions">
              <Chip readOnly size="sm" tone={outfit.worn ? 'mint' : 'default'}>
                {outfit.worn ? '착용 완료' : '아직 안 입음'}
              </Chip>
              <div className="tf-outfit-actions__buttons">
                <Button
                  variant={outfit.worn ? 'soft' : 'secondary'}
                  leading={<Icon name="check" size={16} />}
                  onClick={() => toggleWorn(outfit.id)}
                >
                  {outfit.worn ? '착용 취소' : '입었어요'}
                </Button>
                <Button variant="ghost" onClick={() => unsaveOutfit(outfit.id)}>
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

function LikedPostsSection() {
  const { user } = useAuth()
  const { toggleLike, deletePost } = useAppData()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeLikedPosts(user.id, (items) => {
      setPosts(items)
      setLoading(false)
    })
  }, [user])

  const selectedPost = selectedPostId ? (posts.find((p) => p.id === selectedPostId) ?? null) : null

  if (loading) {
    return <MascotBubble message="좋아요한 게시글을 불러오는 중이에요..." mood="thinking" />
  }

  if (posts.length === 0) {
    return (
      <div className="tf-empty tf-reveal">
        <MascotBubble message="아직 좋아요한 게시글이 없어요." mood="thinking" />
        <Link to="/community">
          <Button variant="soft" leading={<Icon name="heart" size={16} />}>
            커뮤니티 둘러보러 가기
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="tf-grid tf-grid--posts-lg tf-stagger">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onToggleLike={toggleLike}
            onOpen={(p) => setSelectedPostId(p.id)}
          />
        ))}
      </div>

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPostId(null)}
        currentUserId={user?.id ?? null}
        currentUserNickname={user?.nickname ?? ''}
        currentUserAvatarColor={user ? avatarColorForUid(user.id) : '#a0b1f5'}
        onToggleLike={toggleLike}
        onDelete={deletePost}
      />
    </>
  )
}

export function SavedPage() {
  const { savedOutfits } = useAppData()
  const [tab, setTab] = useState<MainTab>('OUTFITS')

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">찜한 코디</h1>
          <p className="tf-caption">
            저장한 {savedOutfits.length}개 · 실제로 입은 {savedOutfits.filter((o) => o.worn).length}개
          </p>
        </div>
      </header>

      <div className="tf-toolbar tf-reveal">
        <SegmentedTabs ariaLabel="찜한 코디 종류" options={MAIN_TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'OUTFITS' ? <SavedOutfitsSection /> : <LikedPostsSection />}
    </div>
  )
}
