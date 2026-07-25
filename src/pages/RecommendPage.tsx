import { useState } from 'react'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { OutfitBoard } from '@/components/outfit/OutfitBoard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Toggle } from '@/components/ui/Toggle'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { useOutfitRecommendation } from '@/hooks/useOutfitRecommendation'
import { useWeather } from '@/hooks/useWeather'
import {
  feedbackTagLabel,
  majorCategoryLabel,
  minorCategoryLabel,
  situationEmoji,
  situationLabel,
} from '@/lib/labels'
import { cn, formatPrice } from '@/lib/utils'
import { seasonForTemperature } from '@/services/recommend'
import { trackRecentlyViewed } from '@/services/firestoreRecentlyViewed'
import { FEEDBACK_TAGS, SITUATIONS, type CoordinateSlot, type FeedbackTag, type Situation } from '@/types'

export function RecommendPage() {
  const { user } = useAuth()
  const { closet, saveOutfit, isSaved, markCoordinateWorn, addFeedback } = useAppData()
  const { weather, isEstimate: weatherIsEstimate } = useWeather()

  const [situation, setSituation] = useState<Situation>('DAILY')
  const [closetOnly, setClosetOnly] = useState(false)
  const [reshuffle, setReshuffle] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [showReason, setShowReason] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackTags, setFeedbackTags] = useState<FeedbackTag[]>([])
  const [feedbackDone, setFeedbackDone] = useState(false)

  const { coordinates, selectedIndex, selectCoordinate, coordinate, breakdown, filledByBrand, aiEnhancing } =
    useOutfitRecommendation({
      closet,
      profile: user,
      weather,
      situation,
      closetOnly,
      reshuffle,
    })

  if (!user || !coordinate) {
    return (
      <div className="tf-page">
        <MascotBubble message="로그인하면 오늘의 코디를 골라드릴게요!" mood="thinking" />
      </div>
    )
  }

  const brandSlots = coordinate.slots.filter((slot) => slot.source === 'BRAND')

  function handleReshuffle() {
    setNotice(null)
    setFeedbackDone(false)
    setRating(0)
    setFeedbackTags([])
    setReshuffle((count) => count + 1)
  }

  function handleSelectCoordinate(index: number) {
    selectCoordinate(index)
    setNotice(null)
    setFeedbackDone(false)
    setRating(0)
    setFeedbackTags([])
    setShowReason(false)
  }

  function submitFeedback() {
    if (rating === 0 || !coordinate) return
    addFeedback({ outfitId: coordinate.id, rating, tags: feedbackTags })
    setFeedbackDone(true)
  }

  function handleBrandItemClick(slot: CoordinateSlot) {
    if (!user || !slot.searchUrl || slot.price === undefined) return
    void trackRecentlyViewed(user.id, {
      name: slot.name,
      brand: slot.brand,
      color: slot.color,
      colorName: slot.colorName,
      majorCategory: slot.majorCategory,
      minorCategory: slot.minorCategory,
      price: slot.price,
      discountRate: slot.discountRate,
      searchUrl: slot.searchUrl,
    })
  }

  return (
    <div className="tf-page tf-recommend">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">코디 추천</h1>
          <p className="tf-caption">
            {weather.locationName} · {weather.status} · 체감 {weather.feelsLike}℃ (최고{' '}
            {weather.temperatureHigh}℃ / 최저 {weather.temperatureLow}℃)
            {weatherIsEstimate && ' — 실시간 조회가 안 돼 추정치를 보여드려요'}
          </p>
        </div>
      </header>

      {/* ── TPO 선택 ──────────────────────────────────────── */}
      <Card className="tf-reveal" icon="📍" title="어떤 상황인가요?">
        <div className="tf-tpogrid">
          {SITUATIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={cn('tf-tpo', situation === value && 'is-selected')}
              onClick={() => {
                setSituation(value)
                setFeedbackDone(false)
                setRating(0)
                setFeedbackTags([])
              }}
              aria-pressed={situation === value}
            >
              <span className="tf-tpo__emoji" aria-hidden="true">
                {situationEmoji[value]}
              </span>
              <span className="tf-tpo__label">{situationLabel[value]}</span>
            </button>
          ))}
        </div>

        <div className="tf-recommend__controls">
          <Toggle
            checked={closetOnly}
            onChange={setClosetOnly}
            label="내 옷장 아이템만 사용 (구매 추천 끄기)"
          />
          <Button
            variant="secondary"
            leading={<Icon name="refresh" size={16} />}
            onClick={handleReshuffle}
          >
            다시 추천
          </Button>
        </div>

        {notice && (
          <p className="tf-notice" role="status">
            {notice}
          </p>
        )}
      </Card>

      {/* ── 결과 ──────────────────────────────────────────── */}
      <Card
        className="tf-reveal"
        icon="✨"
        title={coordinate.styleName}
        action={
          <Chip readOnly size="sm">
            {seasonForTemperature(weather.feelsLike) === 'WINTER' ? '겨울' : '간절기'} ·{' '}
            {situationLabel[situation]}
          </Chip>
        }
      >
        {coordinates.length > 1 && (
          <div className="tf-stylepicker" role="tablist" aria-label="코디 후보">
            {coordinates.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={selectedIndex === index}
                className={cn('tf-stylepicker__tab', selectedIndex === index && 'is-selected')}
                onClick={() => handleSelectCoordinate(index)}
              >
                스타일 {index + 1}
              </button>
            ))}
          </div>
        )}

        <OutfitBoard coordinate={coordinate} />

        <MascotBubble message={coordinate.mascotComment} />

        <div className="tf-palette" aria-label="코디 색 조합">
          {coordinate.colorPalette.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="tf-palette__dot"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>

        <div className="tf-outfit-actions">
          <button
            type="button"
            className="tf-textlink"
            onClick={() => setShowReason((value) => !value)}
            aria-expanded={showReason}
          >
            왜 이 코디인가요?
            <Icon name={showReason ? 'chevron-down' : 'chevron-right'} size={15} />
          </button>

          <div className="tf-outfit-actions__buttons">
            <Button
              variant={isSaved(coordinate.id) ? 'soft' : 'primary'}
              leading={<Icon name="bookmark" size={16} />}
              disabled={isSaved(coordinate.id)}
              onClick={() => {
                saveOutfit(coordinate)
                setNotice('찜한 코디에 저장했어요.')
              }}
            >
              {isSaved(coordinate.id) ? '저장됨' : '이 코디 저장'}
            </Button>
            <Button
              variant="secondary"
              leading={<Icon name="check" size={16} />}
              onClick={() => {
                markCoordinateWorn(coordinate)
                setNotice('오늘 착용으로 기록했어요. 다음 추천에 반영할게요.')
              }}
            >
              오늘 이거 입었어요
            </Button>
          </div>
        </div>

        {showReason && (
          <div className="tf-reasonpanel tf-reveal">
            <p className="tf-reason">
              {coordinate.reason}
              {aiEnhancing && <span className="tf-ai-badge">AI가 다듬는 중…</span>}
            </p>
            <table className="tf-scoretable">
              <caption className="tf-sr-only">아이템별 추천 점수</caption>
              <thead>
                <tr>
                  <th scope="col">아이템</th>
                  <th scope="col">날씨</th>
                  <th scope="col">TPO</th>
                  <th scope="col">스타일</th>
                  <th scope="col">퍼스널컬러</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.item.id}>
                    <th scope="row">
                      {row.item.name}
                      <span className="tf-micro">
                        {' '}
                        · {minorCategoryLabel[row.item.minorCategory]}
                      </span>
                    </th>
                    <td>{Math.round(row.weather * 100)}</td>
                    <td>{Math.round(row.formality * 100)}</td>
                    <td>{Math.round(row.style * 100)}</td>
                    <td>{Math.round(row.color * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 부족한 아이템 브랜드 제안 ─────────────────────── */}
      {brandSlots.length > 0 && (
        <Card
          className="tf-reveal"
          icon="🛍️"
          title="옷장에 없는 아이템, 이건 어때요?"
          action={<span className="tf-caption">{filledByBrand.length}개 카테고리 보완</span>}
        >
          <ul className="tf-brandlist tf-stagger">
            {brandSlots.map((slot) => (
              <li key={slot.id} className="tf-brandrow">
                <span
                  className="tf-brandrow__color"
                  style={{ background: slot.color }}
                  aria-hidden="true"
                />
                <div className="tf-brandrow__info">
                  <p className="tf-micro">{slot.brand}</p>
                  <p className="tf-brandrow__name">{slot.name}</p>
                  <p className="tf-caption">
                    {slot.colorName} · {majorCategoryLabel[slot.majorCategory]} ·{' '}
                    {minorCategoryLabel[slot.minorCategory]} · 보유한 아이템과 잘 어울려요
                  </p>
                </div>
                {slot.price !== undefined && (
                  <div className="tf-brandrow__pricebox">
                    {slot.discountRate !== undefined && (
                      <span className="tf-brandrow__discount">
                        추정 {Math.round(slot.discountRate * 100)}%
                      </span>
                    )}
                    <span className="tf-brandrow__price">
                      {formatPrice(
                        slot.discountRate !== undefined
                          ? Math.round(slot.price * (1 - slot.discountRate))
                          : slot.price,
                      )}
                    </span>
                    {slot.discountRate !== undefined && (
                      <span className="tf-brandrow__original">{formatPrice(slot.price)}</span>
                    )}
                  </div>
                )}
                <Button
                  as="a"
                  href={slot.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="soft"
                  size="sm"
                  onClick={() => handleBrandItemClick(slot)}
                >
                  검색결과 보기
                </Button>
              </li>
            ))}
          </ul>
          <p className="tf-micro tf-brandlist__disclaimer">
            * 할인율은 실시간 가격 연동 전까지의 추정치예요. 정확한 가격과 재고는 연결된 검색결과
            페이지에서 확인해 주세요.
          </p>
        </Card>
      )}

      {/* ── 피드백 ────────────────────────────────────────── */}
      <Card className="tf-reveal" icon="💬" title="이 코디 어땠나요?">
        {feedbackDone ? (
          <MascotBubble message="피드백 고마워요! 다음 추천에 바로 반영할게요 💙" />
        ) : (
          <div className="tf-feedback">
            <div className="tf-stars" role="radiogroup" aria-label="별점">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value}점`}
                  className={cn('tf-star', value <= rating && 'is-on')}
                  onClick={() => setRating(value)}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="tf-chipset">
              {FEEDBACK_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  selected={feedbackTags.includes(tag)}
                  onClick={() =>
                    setFeedbackTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                >
                  {feedbackTagLabel[tag]}
                </Chip>
              ))}
            </div>

            <Button onClick={submitFeedback} disabled={rating === 0}>
              피드백 보내기
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
