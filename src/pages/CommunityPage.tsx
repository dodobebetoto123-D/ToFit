import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdFitBanner } from '@/components/ads/AdFitBanner'
import { CreatePostDialog } from '@/components/community/CreatePostDialog'
import { PostCard } from '@/components/community/PostCard'
import { PostDetailModal } from '@/components/community/PostDetailModal'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { useStyleTwins } from '@/hooks/useStyleTwins'
import { avatarColorForUid } from '@/services/firestoreProfile'
import { bodyShapeLabel, styleTagLabel } from '@/lib/labels'

type SortKey = 'POPULAR' | 'RECENT' | 'TAG'

const SORTS: ReadonlyArray<SegmentedOption<SortKey>> = [
  { value: 'POPULAR', label: '인기' },
  { value: 'RECENT', label: '최신' },
  { value: 'TAG', label: '해시태그' },
]

export function CommunityPage() {
  const { user } = useAuth()
  const { posts, postsLoading, toggleLike, createPost, deletePost, savedOutfits } = useAppData()
  const { twins, loading: twinsLoading, toggleFollow } = useStyleTwins()
  const [searchParams, setSearchParams] = useSearchParams()

  const [sort, setSort] = useState<SortKey>('POPULAR')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const query = searchParams.get('q') ?? ''

  // 목록(posts)이 실시간으로 갱신되므로, 선택된 글도 스냅샷이 아니라 최신 상태를 그대로 참조한다.
  const selectedPost = selectedPostId ? (posts.find((p) => p.id === selectedPostId) ?? null) : null

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.hashtags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [posts])

  const visible = useMemo(() => {
    let list = [...posts]

    if (query.trim()) {
      const needle = query.trim().toLowerCase()
      list = list.filter(
        (post) =>
          post.title.toLowerCase().includes(needle) ||
          post.content.toLowerCase().includes(needle) ||
          post.hashtags.some((tag) => tag.toLowerCase().includes(needle)),
      )
    }

    if (activeTag) list = list.filter((post) => post.hashtags.includes(activeTag))

    if (sort === 'RECENT') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sort === 'POPULAR') {
      list.sort((a, b) => b.likeCount - a.likeCount)
    }

    return list
  }, [posts, query, activeTag, sort])

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">커뮤니티</h1>
          <p className="tf-caption">다른 사람들은 오늘 뭘 입었을까요?</p>
        </div>
        <Button leading={<Icon name="camera" size={16} />} onClick={() => setComposerOpen(true)}>
          코디 올리기
        </Button>
      </header>

      <div className="tf-toolbar tf-reveal">
        <SegmentedTabs ariaLabel="정렬" options={SORTS} value={sort} onChange={setSort} />
        {query && (
          <Chip
            size="sm"
            selected
            onClick={() => {
              searchParams.delete('q')
              setSearchParams(searchParams, { replace: true })
            }}
            leading={<Icon name="close" size={13} />}
          >
            “{query}” 검색 중
          </Chip>
        )}
      </div>

      {sort === 'TAG' && (
        <div className="tf-chipset tf-reveal">
          {allTags.map((tag) => (
            <Chip
              key={tag}
              size="sm"
              selected={activeTag === tag}
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
            >
              #{tag}
            </Chip>
          ))}
        </div>
      )}

      <div className="tf-community">
        <div className="tf-community__feed">
          {postsLoading ? (
            <MascotBubble message="커뮤니티 코디를 불러오는 중이에요..." mood="thinking" />
          ) : visible.length === 0 ? (
            <MascotBubble
              message={
                posts.length === 0
                  ? '아직 올라온 코디가 없어요. 첫 코디를 올려볼까요?'
                  : '조건에 맞는 코디가 없어요. 다른 태그로 찾아볼까요?'
              }
              mood="thinking"
            />
          ) : (
            <div className="tf-grid tf-grid--posts-lg tf-stagger">
              {visible.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onToggleLike={toggleLike}
                  onOpen={(p) => setSelectedPostId(p.id)}
                />
              ))}
            </div>
          )}

          <AdFitBanner width={728} height={90} className="tf-reveal" />
        </div>

        {/* ── 스타일 트윈 ─────────────────────────────────── */}
        <Card className="tf-reveal tf-community__aside" icon="🫂" title="스타일 트윈">
          <p className="tf-caption">
            키 · 몸무게 · 골격형 · 스타일 태그 벡터가 비슷한 사람들이에요. 이 사람들은 이렇게 입어요.
          </p>
          {twinsLoading ? (
            <MascotBubble message="비슷한 스타일을 찾는 중이에요..." mood="thinking" />
          ) : twins.length === 0 ? (
            <MascotBubble message="아직 매칭할 다른 사용자가 없어요." mood="thinking" />
          ) : (
            <ul className="tf-twinlist tf-stagger">
              {twins.map((twin) => (
                <li key={twin.id} className="tf-twin">
                  <Avatar nickname={twin.nickname} color={twin.avatarColor} size={38} />
                  <div className="tf-twin__info">
                    <p className="tf-twin__name">{twin.nickname}</p>
                    <p className="tf-micro">
                      {twin.height}cm · {twin.weight}kg · {bodyShapeLabel[twin.bodyShape]}
                    </p>
                    <p className="tf-micro">
                      {(twin.styleTags ?? []).map((tag) => styleTagLabel[tag]).join(' · ')}
                    </p>
                  </div>
                  <div className="tf-twin__right">
                    <span className="tf-twin__score">{Math.round(twin.similarity * 100)}%</span>
                    <Button
                      size="sm"
                      variant={twin.following ? 'soft' : 'secondary'}
                      onClick={() => toggleFollow(twin.id)}
                    >
                      {twin.following ? '팔로잉' : '팔로우'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {user && (
        <CreatePostDialog
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={createPost}
          authorId={user.id}
          authorNickname={user.nickname}
          authorAvatarColor={avatarColorForUid(user.id)}
          savedOutfits={savedOutfits}
        />
      )}

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPostId(null)}
        currentUserId={user?.id ?? null}
        currentUserNickname={user?.nickname ?? ''}
        currentUserAvatarColor={user ? avatarColorForUid(user.id) : '#a0b1f5'}
        onToggleLike={toggleLike}
        onDelete={deletePost}
      />
    </div>
  )
}
