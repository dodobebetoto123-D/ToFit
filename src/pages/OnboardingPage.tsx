/**
 * 1분 맞춤 진단.
 * 인터뷰에서 "입력이 많으면 바로 지운다"는 얘기가 나왔으므로,
 * 한 화면에 한 질문만 두고 탭 몇 번으로 끝나게 구성한다.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mascot } from '@/components/brand/Mascot'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { HEIGHT_RANGE, WEIGHT_RANGE, validateBodyMetrics } from '@/lib/bodyMetrics'
import {
  bodyShapeLabel,
  bodyShapeSummary,
  genderLabel,
  personalColorLabel,
  personalColorPalette,
  styleTagLabel,
} from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  BODY_SHAPES,
  GENDERS,
  PERSONAL_COLORS,
  STYLE_TAGS,
  type BodyShape,
  type Gender,
  type PersonalColor,
  type StyleTag,
} from '@/types'

const STEPS = ['기본 정보', '체형', '퍼스널 컬러', '스타일 취향'] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()

  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<Gender>(user?.gender ?? 'UNISEX')
  const [height, setHeight] = useState(user?.height ?? 170)
  const [weight, setWeight] = useState(user?.weight ?? 60)
  const [bodyShape, setBodyShape] = useState<BodyShape>(user?.bodyShape ?? 'NATURAL')
  const [personalColor, setPersonalColor] = useState<PersonalColor>(
    user?.personalColor ?? 'SUMMER_COOL',
  )
  const [styles, setStyles] = useState<StyleTag[]>(user?.preferredStyles ?? [])

  // 1단계(기본 정보)에서 범위를 벗어나면 다음으로 못 넘어간다.
  const metricsError = step === 0 ? validateBodyMetrics(height, weight) : null

  function finish() {
    // "나중에 할래요"로도 들어오므로 여기서 한 번 더 막는다 — 말도 안 되는 수치가
    // 저장되면 체형 적합도·추천 점수가 통째로 어긋난다.
    if (validateBodyMetrics(height, weight)) {
      setStep(0)
      return
    }
    // updateProfile을 두 번 나눠 부르면 두 번째 호출이 첫 번째 호출 이전의 user를 스프레드해
    // 방금 저장한 필드를 덮어쓴다 — 한 번의 patch로 합쳐서 호출한다.
    void updateProfile({
      gender,
      height,
      weight,
      bodyShape,
      personalColor,
      preferredStyles: styles,
      colorPalette: personalColorPalette[personalColor],
      onboarded: true,
    })
    navigate('/', { replace: true })
  }

  const canGoNext = step < 3 || styles.length > 0

  return (
    <div className="tf-onboarding">
      <div className="tf-onboarding__card tf-reveal">
        <header className="tf-onboarding__head">
          <Mascot size={54} mood="happy" floating />
          <div>
            <p className="tf-micro">1분 맞춤 진단 · {step + 1}/{STEPS.length}</p>
            <h1 className="tf-title">{STEPS[step]}</h1>
          </div>
        </header>

        <div className="tf-progress" aria-hidden="true">
          {STEPS.map((label, index) => (
            <span key={label} className={cn('tf-progress__seg', index <= step && 'is-done')} />
          ))}
        </div>

        <div className="tf-onboarding__body" key={step}>
          {step === 0 && (
            <>
              <p className="tf-caption">추천 정확도를 위해 기본 정보만 받을게요.</p>
              <fieldset className="tf-field">
                <legend>성별</legend>
                <div className="tf-chipset">
                  {GENDERS.map((value) => (
                    <Chip key={value} selected={gender === value} onClick={() => setGender(value)}>
                      {genderLabel[value]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <div className="tf-field-row">
                <label className="tf-field">
                  <span>키 (cm)</span>
                  <input
                    className="tf-input"
                    type="number"
                    min={HEIGHT_RANGE.min}
                    max={HEIGHT_RANGE.max}
                    value={height}
                    onChange={(event) => setHeight(Number(event.target.value))}
                  />
                </label>
                <label className="tf-field">
                  <span>몸무게 (kg)</span>
                  <input
                    className="tf-input"
                    type="number"
                    min={WEIGHT_RANGE.min}
                    max={WEIGHT_RANGE.max}
                    value={weight}
                    onChange={(event) => setWeight(Number(event.target.value))}
                  />
                </label>
              </div>
              {metricsError && (
                <p className="tf-error" role="alert">
                  {metricsError}
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <p className="tf-caption">잘 모르겠으면 가장 비슷한 설명을 고르면 돼요.</p>
              <div className="tf-optionlist">
                {BODY_SHAPES.map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    className={cn('tf-option', bodyShape === shape && 'is-selected')}
                    onClick={() => setBodyShape(shape)}
                    aria-pressed={bodyShape === shape}
                  >
                    <span className="tf-option__title">{bodyShapeLabel[shape]}</span>
                    <span className="tf-option__desc">{bodyShapeSummary[shape]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="tf-caption">진단받은 적 없다면 어울린다는 말을 자주 들은 쪽으로 고르세요.</p>
              <div className="tf-colorgrid">
                {PERSONAL_COLORS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn('tf-colorcard', personalColor === value && 'is-selected')}
                    onClick={() => setPersonalColor(value)}
                    aria-pressed={personalColor === value}
                  >
                    <span className="tf-colorcard__swatches">
                      {personalColorPalette[value].map((color) => (
                        <span key={color} style={{ background: color }} />
                      ))}
                    </span>
                    <span className="tf-colorcard__label">{personalColorLabel[value]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="tf-caption">끌리는 스타일을 모두 골라주세요. (최소 1개)</p>
              <div className="tf-chipset tf-chipset--wrap">
                {STYLE_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    selected={styles.includes(tag)}
                    onClick={() =>
                      setStyles((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      )
                    }
                  >
                    {styleTagLabel[tag]}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="tf-onboarding__foot">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>
              이전
            </Button>
          ) : (
            <button type="button" className="tf-textlink" onClick={finish}>
              나중에 할래요
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((value) => value + 1)}
              disabled={metricsError !== null}
              trailing={<Icon name="chevron-right" size={16} />}
            >
              다음
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canGoNext} trailing={<Icon name="sparkle" size={16} />}>
              진단 완료
            </Button>
          )}
        </footer>
      </div>
    </div>
  )
}
