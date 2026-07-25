import { useEffect, useState } from 'react'
import { PostCard } from '@/components/community/PostCard'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { useStyleTwins } from '@/hooks/useStyleTwins'
import { bodyShapeLabel } from '@/lib/labels'
import { isFirebaseConfigured } from '@/lib/firebase'
import { subscribePopularPosts } from '@/services/firestoreCommunity'
import { subscribeActivityRanking } from '@/services/firestoreTwins'
import type { CommunityPost, PublicProfile, RankingScope } from '@/types'

type RankingTab = 'POSTS' | 'TWINS' | 'ACTIVITY'

const TABS: ReadonlyArray<SegmentedOption<RankingTab>> = [
  { value: 'POSTS', label: '커뮤니티 인기 코디' },
  { value: 'TWINS', label: '스타일 트윈' },
  { value: 'ACTIVITY', label: '내 활동' },
]

const SCOPE_TABS: ReadonlyArray<SegmentedOption<RankingScope>> = [
  { value: 'WEEK', label: '주간' },
  { value: 'MONTH', label: '월간' },
  { value: 'ALL', label: '전체' },
]

const MEDALS = ['🥇', '🥈', '🥉']

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="tf-rank-badge" data-top={rank <= 3}>
      {rank <= 3 ? MEDALS[rank - 1] : rank}
    </span>
  )
}

/* ── 1. 커뮤니티 인기 코디 랭킹 ─────────────────────────────── */

function PopularPostsRanking() {
  const { toggleLike } = useAppData()
  const { user } = useAuth()
  const [scope, setScope] = useState<RankingScope>('WEEK')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribePopularPosts(scope, user?.id ?? null, (items) => {
      setPosts(items)
      setLoading(false)
    })
  }, [scope, user?.id])

  return (
    <Card
      className="tf-reveal"
      icon="👍"
      title="좋아요 랭킹"
      action={<SegmentedTabs ariaLabel="기간" size="sm" options={SCOPE_TABS} value={scope} onChange={setScope} />}
    >
      {loading ? (
        <MascotBubble message="랭킹을 불러오는 중이에요..." mood="thinking" />
      ) : posts.length === 0 ? (
        <MascotBubble message="이 기간엔 아직 순위에 오른 코디가 없어요." mood="thinking" />
      ) : (
        <div className="tf-rankgrid tf-stagger">
          {posts.map((post, index) => (
            <div key={post.id} className="tf-rankgrid__item">
              <RankBadge rank={index + 1} />
              <PostCard post={post} onToggleLike={toggleLike} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── 2. 스타일 트윈 매칭 랭킹 ───────────────────────────────── */

function TwinRanking() {
  const { twins, loading, toggleFollow } = useStyleTwins(30)

  return (
    <Card className="tf-reveal" icon="🫂" title="스타일 트윈 매칭 랭킹">
      <p className="tf-caption">키·몸무게·골격형·퍼스널컬러·스타일 태그 유사도가 높은 순서예요.</p>
      {loading ? (
        <MascotBubble message="비슷한 스타일을 찾는 중이에요..." mood="thinking" />
      ) : twins.length === 0 ? (
        <MascotBubble message="아직 매칭할 다른 사용자가 없어요." mood="thinking" />
      ) : (
        <ul className="tf-ranklist tf-stagger">
          {twins.map((twin, index) => (
            <li key={twin.id} className="tf-rankrow">
              <RankBadge rank={index + 1} />
              <Avatar nickname={twin.nickname} color={twin.avatarColor} size={38} />
              <div className="tf-rankrow__info">
                <p className="tf-rankrow__name">{twin.nickname}</p>
                <p className="tf-micro">
                  {twin.height}cm · {twin.weight}kg · {bodyShapeLabel[twin.bodyShape]}
                </p>
              </div>
              <span className="tf-rankrow__score">{Math.round(twin.similarity * 100)}%</span>
              <Button
                size="sm"
                variant={twin.following ? 'soft' : 'secondary'}
                onClick={() => toggleFollow(twin.id)}
              >
                {twin.following ? '팔로잉' : '팔로우'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ── 3. 내 활동 랭킹 ───────────────────────────────────────── */

function ActivityRanking() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    return subscribeActivityRanking((items) => {
      setProfiles(items)
      setLoading(false)
    })
  }, [])

  const myRank = profiles.findIndex((p) => p.uid === user?.id) + 1

  return (
    <Card className="tf-reveal" icon="🔥" title="내 활동 랭킹">
      <p className="tf-caption">
        옷장 활용도·착용 기록·저장한 코디 수를 종합한 활동 점수예요. 옷을 자주 등록하고 입을수록
        올라가요.
      </p>
      {loading ? (
        <MascotBubble message="랭킹을 계산하는 중이에요..." mood="thinking" />
      ) : profiles.length === 0 ? (
        <MascotBubble message="아직 활동 데이터가 없어요. 옷장을 채워보세요!" mood="thinking" />
      ) : (
        <>
          {myRank > 0 && (
            <p className="tf-my-rank">
              전체 {profiles.length}명 중 <strong>{myRank}위</strong>예요
            </p>
          )}
          <ul className="tf-ranklist tf-stagger">
            {profiles.slice(0, 20).map((profile, index) => (
              <li
                key={profile.uid}
                className={profile.uid === user?.id ? 'tf-rankrow tf-rankrow--me' : 'tf-rankrow'}
              >
                <RankBadge rank={index + 1} />
                <Avatar nickname={profile.nickname} color={profile.avatarColor} size={38} />
                <div className="tf-rankrow__info">
                  <p className="tf-rankrow__name">
                    {profile.nickname}
                    {profile.uid === user?.id && <span className="tf-compat__me">나</span>}
                  </p>
                  <p className="tf-micro">
                    옷장 {profile.stats.closetCount}개 · 활용도{' '}
                    {Math.round(profile.stats.closetUtilization * 100)}%
                  </p>
                </div>
                <span className="tf-rankrow__score">{profile.stats.activityScore}점</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

export function RankingPage() {
  const [tab, setTab] = useState<RankingTab>('POSTS')

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">랭킹</h1>
          <p className="tf-caption">인기 코디, 스타일 트윈, 내 활동을 한눈에 봐요</p>
        </div>
      </header>

      <div className="tf-toolbar tf-reveal">
        <SegmentedTabs ariaLabel="랭킹 종류" options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'POSTS' && <PopularPostsRanking />}
      {tab === 'TWINS' && <TwinRanking />}
      {tab === 'ACTIVITY' && <ActivityRanking />}
    </div>
  )
}
