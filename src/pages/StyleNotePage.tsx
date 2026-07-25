import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { OutfitBoard } from '@/components/outfit/OutfitBoard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useAppData } from '@/hooks/useAppData'
import { feedbackTagLabel, situationEmoji, situationLabel } from '@/lib/labels'
import type { SavedOutfit } from '@/types'

/** savedAt 기준 "YYYY년 M월" 로 묶는다 — 실제 착용일시 필드가 없어 저장 시점을 기준으로 삼는다 */
function monthKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}`
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
}

export function StyleNotePage() {
  const { savedOutfits, feedbacks } = useAppData()

  const wornOutfits = useMemo(
    () => [...savedOutfits].filter((o) => o.worn).sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [savedOutfits],
  )

  const feedbackByOutfitId = useMemo(() => {
    const map = new Map<string, (typeof feedbacks)[number]>()
    for (const feedback of feedbacks) map.set(feedback.outfitId, feedback)
    return map
  }, [feedbacks])

  const stats = useMemo(() => {
    const ratings = feedbacks.map((f) => f.rating).filter((r) => r > 0)
    const avgRating = ratings.length === 0 ? 0 : ratings.reduce((a, b) => a + b, 0) / ratings.length

    const situationCounts = new Map<string, number>()
    for (const outfit of wornOutfits) {
      situationCounts.set(
        outfit.coordinate.situation,
        (situationCounts.get(outfit.coordinate.situation) ?? 0) + 1,
      )
    }
    const favoriteSituation = [...situationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return { avgRating, favoriteSituation }
  }, [feedbacks, wornOutfits])

  const groups = useMemo(() => {
    const map = new Map<string, SavedOutfit[]>()
    for (const outfit of wornOutfits) {
      const key = monthKey(outfit.savedAt)
      const list = map.get(key) ?? []
      list.push(outfit)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [wornOutfits])

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">스타일 노트</h1>
          <p className="tf-caption">착용한 코디와 피드백을 모아보는 코디 기록이에요</p>
        </div>
      </header>

      {wornOutfits.length === 0 ? (
        <div className="tf-empty tf-reveal">
          <MascotBubble
            message="아직 착용 기록이 없어요. 코디 추천에서 '입었어요'를 눌러보세요!"
            mood="thinking"
          />
          <Link to="/recommend">
            <Button variant="soft" leading={<Icon name="sparkle" size={16} />}>
              코디 추천받으러 가기
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="tf-body-grid tf-reveal">
            <Card icon="👗" title="총 착용 코디">
              <p className="tf-subtitle">{wornOutfits.length}개</p>
              <p className="tf-caption">저장한 코디 {savedOutfits.length}개 중 착용 완료</p>
            </Card>
            <Card icon="⭐" title="평균 만족도">
              <p className="tf-subtitle">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                {stats.avgRating > 0 && <span className="tf-caption"> / 5</span>}
              </p>
              <p className="tf-caption">피드백을 남긴 코디 {feedbacks.length}개 기준</p>
            </Card>
            <Card icon="📍" title="자주 입는 상황">
              <p className="tf-subtitle">
                {stats.favoriteSituation
                  ? `${situationEmoji[stats.favoriteSituation as keyof typeof situationEmoji]} ${situationLabel[stats.favoriteSituation as keyof typeof situationLabel]}`
                  : '-'}
              </p>
              <p className="tf-caption">착용 기록 기준 가장 많이 고른 TPO</p>
            </Card>
          </div>

          {groups.map(([key, outfits]) => (
            <Card key={key} className="tf-reveal" icon="🗓️" title={monthLabel(outfits[0].savedAt)}>
              <div className="tf-savedlist tf-stagger">
                {outfits.map((outfit) => {
                  const feedback = feedbackByOutfitId.get(outfit.coordinate.id)
                  return (
                    <div key={outfit.id} className="tf-notecard">
                      <div className="tf-notecard__head">
                        <Chip readOnly size="sm">
                          {situationEmoji[outfit.coordinate.situation]}{' '}
                          {situationLabel[outfit.coordinate.situation]}
                        </Chip>
                        <span className="tf-micro">
                          {new Date(outfit.savedAt).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <OutfitBoard coordinate={outfit.coordinate} />
                      {feedback ? (
                        <div className="tf-notecard__feedback">
                          <span className="tf-stars-readonly" aria-label={`별점 ${feedback.rating}점`}>
                            {'★'.repeat(feedback.rating)}
                            {'☆'.repeat(5 - feedback.rating)}
                          </span>
                          {feedback.tags.length > 0 && (
                            <span className="tf-caption">
                              {feedback.tags.map((tag) => feedbackTagLabel[tag]).join(' · ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="tf-caption">아직 피드백을 남기지 않았어요</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
