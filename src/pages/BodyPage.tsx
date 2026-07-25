import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import {
  bodyShapeLabel,
  bodyShapeSummary,
  personalColorLabel,
  personalColorPalette,
  styleTagLabel,
} from '@/lib/labels'
import { cn } from '@/lib/utils'
import { BODY_SHAPES, PERSONAL_COLORS, type BodyShape, type PersonalColor } from '@/types'

/** 체형별 추천 · 피하면 좋은 실루엣 */
const BODY_TIPS: Record<BodyShape, { good: string[]; avoid: string[] }> = {
  STRAIGHT: {
    good: ['V넥 · 오픈 카라로 목선 열기', '허리선이 뚜렷한 재킷', '매끈한 소재의 셔츠·슬랙스'],
    avoid: ['목이 꽉 차는 하이넥', '가슴 위 큰 프린트', '과하게 볼륨 있는 니트'],
  },
  WAVE: {
    good: ['짧은 상의 + 하이웨스트 하의', '부드럽고 얇은 소재', '허리를 강조하는 벨트'],
    avoid: ['어깨가 각진 오버핏 아우터', '무겁고 뻣뻣한 소재', '길고 헐렁한 상의'],
  },
  NATURAL: {
    good: ['넉넉한 오버사이즈 실루엣', '두께감 있는 니트·데님', '레이어링으로 만드는 볼륨'],
    avoid: ['몸에 딱 붙는 얇은 상의', '지나치게 짧은 기장', '광택이 강한 소재'],
  },
}

export function BodyPage() {
  const { user, updateProfile } = useAuth()
  const { closet } = useAppData()

  const [editing, setEditing] = useState(false)
  const [height, setHeight] = useState(user?.height ?? 170)
  const [weight, setWeight] = useState(user?.weight ?? 60)
  const [bodyShape, setBodyShape] = useState<BodyShape>(user?.bodyShape ?? 'NATURAL')
  const [personalColor, setPersonalColor] = useState<PersonalColor>(
    user?.personalColor ?? 'SUMMER_COOL',
  )

  /** 옷장 아이템 중 퍼스널 컬러 팔레트에 가까운 비율 */
  const paletteFit = useMemo(() => {
    if (!user || closet.length === 0) return 0
    const palette = personalColorPalette[user.personalColor]
    const parse = (hex: string) => {
      const h = hex.replace('#', '')
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ]
    }
    const matches = closet.filter((item) => {
      const [r, g, b] = parse(item.color)
      return palette.some((p) => {
        const [pr, pg, pb] = parse(p)
        return Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2) < 110
      })
    })
    return Math.round((matches.length / closet.length) * 100)
  }, [closet, user])

  if (!user) return null

  const tips = BODY_TIPS[user.bodyShape]

  function save() {
    void updateProfile({ height, weight, bodyShape, personalColor, colorPalette: personalColorPalette[personalColor] })
    setEditing(false)
  }

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">체형 맞춤</h1>
          <p className="tf-caption">체형과 퍼스널 컬러를 알수록 추천이 정확해져요</p>
        </div>
        <Button variant={editing ? 'primary' : 'secondary'} onClick={() => (editing ? save() : setEditing(true))}>
          {editing ? '저장하기' : '내 정보 수정'}
        </Button>
      </header>

      <div className="tf-body-grid">
        <Card className="tf-reveal" icon="🧍" title="내 체형">
          {editing ? (
            <div className="tf-editform">
              <label className="tf-field">
                <span>키 (cm)</span>
                <input
                  className="tf-input"
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
              </label>
              <label className="tf-field">
                <span>몸무게 (kg)</span>
                <input
                  className="tf-input"
                  type="number"
                  value={weight}
                  onChange={(event) => setWeight(Number(event.target.value))}
                />
              </label>
              <fieldset className="tf-field">
                <legend>골격형</legend>
                <div className="tf-chipset">
                  {BODY_SHAPES.map((shape) => (
                    <Chip
                      key={shape}
                      selected={bodyShape === shape}
                      onClick={() => setBodyShape(shape)}
                    >
                      {bodyShapeLabel[shape]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset className="tf-field">
                <legend>퍼스널 컬러</legend>
                <div className="tf-chipset">
                  {PERSONAL_COLORS.map((value) => (
                    <Chip
                      key={value}
                      selected={personalColor === value}
                      onClick={() => setPersonalColor(value)}
                    >
                      {personalColorLabel[value]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : (
            <div className="tf-bodycard tf-bodycard--lg">
              <div className="tf-bodycard__figure" aria-hidden="true">
                <svg viewBox="0 0 60 120" className="tf-bodyfigure">
                  <ellipse cx="30" cy="14" rx="9" ry="10" fill="var(--tf-primary-200)" />
                  <path d="M20 26h20l6 10-4 3v26H18V39l-4-3Z" fill="var(--tf-primary-300)" />
                  <path d="M22 65h7l1 50h-9Z" fill="var(--tf-primary-200)" />
                  <path d="M31 65h7l1 50h-9Z" fill="var(--tf-primary-200)" />
                </svg>
              </div>
              <div className="tf-bodycard__info">
                <p className="tf-micro">
                  {user.height}cm · {user.weight}kg
                </p>
                <p className="tf-title">{bodyShapeLabel[user.bodyShape]}</p>
                <p className="tf-caption">{bodyShapeSummary[user.bodyShape]}</p>
                <div className="tf-chipset">
                  {user.preferredStyles.map((tag) => (
                    <Chip key={tag} size="sm" readOnly>
                      {styleTagLabel[tag]}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="tf-reveal" icon="🎨" title="퍼스널 컬러">
          <p className="tf-subtitle">{personalColorLabel[user.personalColor]}</p>
          <div className="tf-palette tf-palette--lg">
            {personalColorPalette[user.personalColor].map((color) => (
              <span
                key={color}
                className="tf-palette__dot"
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>

          <div className="tf-meter">
            <div className="tf-meter__head">
              <span className="tf-caption">내 옷장 팔레트 적합도</span>
              <span className="tf-meter__value">{paletteFit}%</span>
            </div>
            <div className="tf-meter__track">
              <div className="tf-meter__fill" style={{ width: `${paletteFit}%` }} />
            </div>
            <p className="tf-micro">
              전체 {closet.length}개 중 {Math.round((paletteFit / 100) * closet.length)}개가 팔레트에
              가까워요.
            </p>
          </div>
        </Card>
      </div>

      <div className="tf-body-grid">
        <Card className="tf-reveal" icon="✅" title="이런 실루엣이 잘 맞아요">
          <ul className="tf-guide tf-stagger">
            {tips.good.map((tip) => (
              <li key={tip}>
                <Icon name="check" size={15} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="tf-reveal" icon="⚠️" title="이건 조금 조심해요">
          <ul className="tf-guide tf-guide--warn tf-stagger">
            {tips.avoid.map((tip) => (
              <li key={tip}>
                <Icon name="close" size={15} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="tf-reveal" icon="📐" title="체형별 코디 적합도">
        <p className="tf-caption">
          같은 코디라도 골격형에 따라 어울리는 정도가 달라요. 추천 엔진은 이 값을 가중치로 씁니다.
        </p>
        <ul className="tf-compat">
          {BODY_SHAPES.map((shape) => {
            const score = shape === user.bodyShape ? 92 : shape === 'NATURAL' ? 74 : 66
            return (
              <li key={shape} className={cn('tf-compat__row', shape === user.bodyShape && 'is-me')}>
                <span className="tf-compat__label">
                  {bodyShapeLabel[shape]}
                  {shape === user.bodyShape && <span className="tf-compat__me">나</span>}
                </span>
                <div className="tf-meter__track">
                  <div className="tf-meter__fill" style={{ width: `${score}%` }} />
                </div>
                <span className="tf-compat__score">{score}</span>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
