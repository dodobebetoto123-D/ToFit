import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdFitBanner } from '@/components/ads/AdFitBanner'
import { ClothingCard } from '@/components/closet/ClothingCard'
import { PostCard } from '@/components/community/PostCard'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { OutfitBoard } from '@/components/outfit/OutfitBoard'
import { LocationNotice } from '@/components/weather/LocationNotice'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import { Toggle } from '@/components/ui/Toggle'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { useOutfitRecommendation } from '@/hooks/useOutfitRecommendation'
import { useWeather } from '@/hooks/useWeather'
import { brandsForStyles, buildBrandUrl } from '@/lib/brands'
import {
  bodyShapeLabel,
  bodyShapeSummary,
  majorCategoryLabel,
  personalColorLabel,
  situationEmoji,
  situationLabel,
  styleTagLabel,
} from '@/lib/labels'
import { cn } from '@/lib/utils'
import { MAJOR_CATEGORIES, type MajorCategory, type Situation } from '@/types'

const HOME_SITUATIONS: ReadonlyArray<SegmentedOption<Situation>> = [
  { value: 'DATE', label: situationLabel.DATE, icon: situationEmoji.DATE },
  { value: 'OFFICE', label: situationLabel.OFFICE, icon: situationEmoji.OFFICE },
  { value: 'TRAVEL', label: situationLabel.TRAVEL, icon: situationEmoji.TRAVEL },
]

const CLOSET_FILTERS: ReadonlyArray<SegmentedOption<MajorCategory | 'ALL'>> = [
  { value: 'ALL', label: '전체' },
  ...MAJOR_CATEGORIES.map((category) => ({
    value: category,
    label: majorCategoryLabel[category],
  })),
]

const STYLE_GUIDE = [
  '어깨선이 또렷해서 각진 아우터가 잘 맞아요',
  '허리선을 살짝 드러내면 비율이 살아나요',
  '두께감 있는 소재가 골격을 자연스럽게 감싸요',
  '큰 패턴보다 무지 · 잔잔한 패턴이 안정적이에요',
]

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { closet, posts, toggleLike, saveOutfit, isSaved, togglePreferred } = useAppData()
  const { weather, isEstimate: weatherIsEstimate, locationIssue, locationBlocked, retryLocation } =
    useWeather()

  const [situation, setSituation] = useState<Situation>('OFFICE')
  const [closetOnly, setClosetOnly] = useState(false)
  const [closetFilter, setClosetFilter] = useState<MajorCategory | 'ALL'>('ALL')
  const [reshuffle, setReshuffle] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  // 규칙 기반 추천을 즉시 계산하고, AI가 reason/mascotComment 문구만 백그라운드에서 다듬는다.
  const { coordinate, aiEnhancing } = useOutfitRecommendation({
    closet,
    profile: user,
    weather,
    situation,
    closetOnly,
    reshuffle,
  })

  const filteredCloset = useMemo(
    () =>
      closetFilter === 'ALL'
        ? closet
        : closet.filter((item) => item.majorCategory === closetFilter),
    [closet, closetFilter],
  )

  const popularPosts = useMemo(
    () => [...posts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 4),
    [posts],
  )

  // 내 선호 스타일과 겹치는 브랜드를 우선으로 4개만 — 전체 목록은 브랜드 추천 페이지에 있다.
  const suggestedBrands = useMemo(
    () => brandsForStyles(user?.preferredStyles ?? [], 4),
    [user?.preferredStyles],
  )

  function handleReshuffle() {
    setNotice(null)
    setReshuffle((count) => count + 1)
  }

  function handleSave() {
    if (!coordinate) return
    saveOutfit(coordinate)
    setNotice('찜한 코디에 저장했어요.')
  }

  return (
    <div className="tf-page tf-home">
      {/* ── 인사 배너 ─────────────────────────────────────── */}
      <section className="tf-hero tf-reveal">
        <div className="tf-hero__intro">
          <h1 className="tf-display">오늘 뭐 입지? 👋</h1>
          <p className="tf-caption">투핏이 TPO별로 코디를 추천드려요</p>
        </div>

        <div className="tf-hero__facts">
          <div className="tf-fact">
            <span className="tf-fact__icon" aria-hidden="true">
              ⛅
            </span>
            <span className="tf-fact__value">{weather.temperature}℃</span>
            <span className="tf-fact__label">
              {weather.locationName} · {weather.status}
              {weatherIsEstimate && ' (추정)'}
            </span>
            <LocationNotice
              issue={locationIssue}
              blocked={locationBlocked}
              onRetry={retryLocation}
            />
          </div>

          <Button
            size="lg"
            className="tf-hero__cta"
            trailing={<Icon name="sparkle" size={17} />}
            onClick={() => navigate('/recommend')}
          >
            코디 받기
          </Button>
        </div>
      </section>

      {notice && (
        <p className="tf-notice tf-reveal" role="status">
          {notice}
        </p>
      )}

      {/* ── 메인 그리드 ───────────────────────────────────── */}
      <div className="tf-home__grid">
        <div className="tf-home__col">
          <Card
            className="tf-reveal"
            icon="✨"
            title="오늘의 코디 추천"
            action={
              <SegmentedTabs
                ariaLabel="상황 선택"
                size="sm"
                options={HOME_SITUATIONS}
                value={situation}
                onChange={setSituation}
              />
            }
          >
            {coordinate ? (
              <>
                <OutfitBoard coordinate={coordinate} />

                <p className="tf-reason">
                  {coordinate.reason}
                  {aiEnhancing && <span className="tf-ai-badge">AI가 다듬는 중…</span>}
                </p>

                <div className="tf-outfit-actions">
                  <Toggle
                    checked={closetOnly}
                    onChange={setClosetOnly}
                    label="내 옷장 아이템 우선 사용"
                  />
                  <div className="tf-outfit-actions__buttons">
                    <Button
                      variant={isSaved(coordinate.id) ? 'soft' : 'primary'}
                      leading={<Icon name="bookmark" size={16} />}
                      onClick={handleSave}
                      disabled={isSaved(coordinate.id)}
                    >
                      {isSaved(coordinate.id) ? '저장됨' : '이 코디 저장'}
                    </Button>
                    <Button
                      variant="secondary"
                      leading={<Icon name="refresh" size={16} />}
                      onClick={handleReshuffle}
                    >
                      다시 추천
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <MascotBubble message="로그인하면 오늘의 코디를 골라드릴게요!" mood="thinking" />
            )}
          </Card>

          <div className="tf-home__pair">
            <Card className="tf-reveal" icon="🧍" title="체형 맞춤 추천">
              {user && (
                <div className="tf-bodycard">
                  <div className="tf-bodycard__figure" aria-hidden="true">
                    <svg viewBox="0 0 60 120" className="tf-bodyfigure">
                      <ellipse cx="30" cy="14" rx="9" ry="10" fill="var(--tf-primary-200)" />
                      <path
                        d="M20 26h20l6 10-4 3v26H18V39l-4-3Z"
                        fill="var(--tf-primary-300)"
                      />
                      <path d="M22 65h7l1 50h-9Z" fill="var(--tf-primary-200)" />
                      <path d="M31 65h7l1 50h-9Z" fill="var(--tf-primary-200)" />
                    </svg>
                  </div>
                  <div className="tf-bodycard__info">
                    <p className="tf-micro">{user.height}cm · {user.weight}kg 기준</p>
                    <p className="tf-subtitle">{bodyShapeLabel[user.bodyShape]}</p>
                    <p className="tf-caption">{bodyShapeSummary[user.bodyShape]}</p>
                    <div className="tf-chipset">
                      <Chip size="sm" readOnly tone="cool">
                        {personalColorLabel[user.personalColor]}
                      </Chip>
                      <Chip size="sm" readOnly>
                        {user.height}cm
                      </Chip>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="tf-reveal" icon="📋" title="추천 스타일 가이드">
              <ul className="tf-guide tf-stagger">
                {STYLE_GUIDE.map((line) => (
                  <li key={line}>
                    <Icon name="check" size={15} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link to="/body" className="tf-textlink">
                내 체형 분석하기
                <Icon name="chevron-right" size={15} />
              </Link>
            </Card>
          </div>
        </div>

        {/* ── 내 옷장 요약 ─────────────────────────────────── */}
        <Card
          className="tf-reveal tf-home__closet"
          icon="👕"
          title="내 옷장"
          action={<span className="tf-caption">전체 {closet.length}개</span>}
        >
          <SegmentedTabs
            ariaLabel="옷장 카테고리"
            variant="pill"
            size="sm"
            options={CLOSET_FILTERS}
            value={closetFilter}
            onChange={setClosetFilter}
            className="tf-home__closet-tabs"
          />

          <div className={cn('tf-grid tf-grid--closet', 'tf-stagger')}>
            {filteredCloset.slice(0, 6).map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                size="compact"
                onTogglePreferred={togglePreferred}
              />
            ))}
          </div>

          <Button
            variant="soft"
            block
            leading={<Icon name="plus" size={16} />}
            onClick={() => navigate('/closet?add=1')}
          >
            옷 추가
          </Button>
          <Link to="/closet" className="tf-textlink tf-textlink--center">
            옷장 전체 보기
            <Icon name="chevron-right" size={15} />
          </Link>
        </Card>
      </div>

      {/* ── 커뮤니티 ──────────────────────────────────────── */}
      <Card
        className="tf-reveal"
        icon="👥"
        title="커뮤니티 인기 코디"
        action={
          <Link to="/community" className="tf-textlink">
            더보기
            <Icon name="chevron-right" size={15} />
          </Link>
        }
      >
        <div className="tf-grid tf-grid--posts tf-stagger">
          {popularPosts.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} />
          ))}
        </div>
      </Card>

      {/* ── 브랜드 추천 (커뮤니티 아래) ───────────────────── */}
      <Card
        className="tf-reveal"
        icon="🏷️"
        title="내 스타일 브랜드 추천"
        action={
          <Link to="/brands" className="tf-textlink">
            더보기
            <Icon name="chevron-right" size={15} />
          </Link>
        }
      >
        <div className="tf-grid tf-grid--brands tf-stagger">
          {suggestedBrands.map((brand) => (
            <div key={brand.name} className="tf-brandmini">
              <p className="tf-brandmini__name">{brand.name}</p>
              <p className="tf-caption">{brand.description}</p>
              <div className="tf-chipset">
                {brand.styles.map((tag) => (
                  <Chip key={tag} size="sm" readOnly>
                    {styleTagLabel[tag]}
                  </Chip>
                ))}
                <Chip size="sm" readOnly tone="mint">
                  {brand.priceTier}
                </Chip>
              </div>
              <Button
                as="a"
                href={buildBrandUrl(brand.name)}
                target="_blank"
                rel="noopener noreferrer"
                variant="soft"
                size="sm"
              >
                무신사에서 보기
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <AdFitBanner width={320} height={100} className="tf-reveal" />
    </div>
  )
}
