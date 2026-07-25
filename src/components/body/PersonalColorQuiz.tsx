import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { personalColorLabel, personalColorPalette } from '@/lib/labels'
import type { PersonalColor } from '@/types'

type Axis = 'TONE' | 'DEPTH'
type ToneAnswer = 'WARM' | 'COOL'
type DepthAnswer = 'CLEAR' | 'MUTED'
type Answer = ToneAnswer | DepthAnswer

interface Question {
  id: string
  axis: Axis
  question: string
  options: { label: string; value: Answer }[]
}

/**
 * mycolor.kr 등 실제 진단 업체는 측색 장비를 쓰기 때문에 정확한 문항을 공개하지 않는다.
 * 대신 피부 언더톤(웜/쿨)과 대비·채도(클리어/뮤트)라는, 퍼스널컬러 진단에서 널리 쓰이는
 * 두 축을 기준으로 한 표준적인 자가진단 문항을 구성했다.
 */
const QUESTIONS: Question[] = [
  {
    id: 'vein',
    axis: 'TONE',
    question: '손목 안쪽 정맥 색깔은 어느 쪽에 가깝나요?',
    options: [
      { label: '초록빛에 가깝다', value: 'WARM' },
      { label: '파랑 · 보랏빛에 가깝다', value: 'COOL' },
    ],
  },
  {
    id: 'white',
    axis: 'TONE',
    question: '흰 티셔츠와 아이보리색 상의 중 얼굴이 더 화사해 보이는 쪽은?',
    options: [
      { label: '아이보리 · 크림색', value: 'WARM' },
      { label: '새하얀 화이트', value: 'COOL' },
    ],
  },
  {
    id: 'jewelry',
    axis: 'TONE',
    question: '골드와 실버 액세서리 중 얼굴이 화사해지는 쪽은?',
    options: [
      { label: '골드', value: 'WARM' },
      { label: '실버', value: 'COOL' },
    ],
  },
  {
    id: 'sun',
    axis: 'TONE',
    question: '햇빛에 피부가 노출되면 어떻게 되나요?',
    options: [
      { label: '잘 그을리고 건강한 갈색이 된다', value: 'WARM' },
      { label: '잘 타지 않거나 금방 붉어진다', value: 'COOL' },
    ],
  },
  {
    id: 'lip',
    axis: 'TONE',
    question: '립 컬러 중 더 잘 받는 계열은?',
    options: [
      { label: '코랄 · 오렌지 계열', value: 'WARM' },
      { label: '핑크 · 베리 계열', value: 'COOL' },
    ],
  },
  {
    id: 'contrast',
    axis: 'DEPTH',
    question: '피부 · 눈동자 · 머리카락의 색 대비는 어떤 편인가요?',
    options: [
      { label: '뚜렷하고 또렷한 편', value: 'CLEAR' },
      { label: '부드럽고 은은한 편', value: 'MUTED' },
    ],
  },
  {
    id: 'colorpref',
    axis: 'DEPTH',
    question: '나에게 잘 어울린다는 말을 듣는 컬러는?',
    options: [
      { label: '선명하고 쨍한 원색', value: 'CLEAR' },
      { label: '차분하게 톤다운된 파스텔 · 흐린 컬러', value: 'MUTED' },
    ],
  },
]

function resolvePersonalColor(tone: ToneAnswer, depth: DepthAnswer): PersonalColor {
  if (tone === 'WARM') return depth === 'CLEAR' ? 'SPRING_WARM' : 'AUTUMN_WARM'
  return depth === 'CLEAR' ? 'WINTER_COOL' : 'SUMMER_COOL'
}

interface PersonalColorQuizProps {
  open: boolean
  onClose: () => void
  onComplete: (color: PersonalColor) => void
}

export function PersonalColorQuiz({ open, onClose, onComplete }: PersonalColorQuizProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [result, setResult] = useState<PersonalColor | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (open) {
      setAnswers({})
      setResult(null)
    }
  }, [open])

  if (!open) {
    return <dialog ref={dialogRef} className="tf-dialog" onCancel={onClose} onClose={onClose} />
  }

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === QUESTIONS.length

  function computeResult() {
    const toneAnswers = QUESTIONS.filter((q) => q.axis === 'TONE').map(
      (q) => answers[q.id] as ToneAnswer,
    )
    const depthAnswers = QUESTIONS.filter((q) => q.axis === 'DEPTH').map(
      (q) => answers[q.id] as DepthAnswer,
    )
    const warmCount = toneAnswers.filter((answer) => answer === 'WARM').length
    const clearCount = depthAnswers.filter((answer) => answer === 'CLEAR').length
    const tone: ToneAnswer = warmCount >= toneAnswers.length / 2 ? 'WARM' : 'COOL'
    const depth: DepthAnswer = clearCount >= depthAnswers.length / 2 ? 'CLEAR' : 'MUTED'
    setResult(resolvePersonalColor(tone, depth))
  }

  function handleApply() {
    if (!result) return
    onComplete(result)
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="tf-dialog tf-colorquiz" onCancel={onClose} onClose={onClose}>
      <header className="tf-dialog__head">
        <h2 className="tf-title">퍼스널컬러 자가진단</h2>
        <button type="button" className="tf-icon-btn" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="tf-dialog__body">
        {result ? (
          <div className="tf-colorquiz__result">
            <p className="tf-caption">진단 결과</p>
            <p className="tf-subtitle">{personalColorLabel[result]}</p>
            <div className="tf-palette tf-palette--lg">
              {personalColorPalette[result].map((color) => (
                <span
                  key={color}
                  className="tf-palette__dot"
                  style={{ background: color }}
                  title={color}
                />
              ))}
            </div>
            <p className="tf-micro tf-colorquiz__disclaimer">
              * 간이 자가진단 결과예요. 정확한 진단은 전문 컬러 컨설팅을 참고해 주세요.
            </p>
            <div className="tf-colorquiz__actions">
              <Button variant="secondary" onClick={() => setResult(null)}>
                다시 진단하기
              </Button>
              <Button onClick={handleApply}>내 프로필에 적용하기</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="tf-caption">
              총 {QUESTIONS.length}문항 · 피부 언더톤과 색 대비감을 기준으로 한 자가진단이에요.
            </p>
            <ol className="tf-colorquiz__list">
              {QUESTIONS.map((question, index) => (
                <li key={question.id} className="tf-colorquiz__question">
                  <p className="tf-colorquiz__q">
                    {index + 1}. {question.question}
                  </p>
                  <div className="tf-chipset">
                    {question.options.map((option) => (
                      <Chip
                        key={option.value}
                        selected={answers[question.id] === option.value}
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className="tf-colorquiz__actions">
              <span className="tf-caption">
                {answeredCount}/{QUESTIONS.length} 답변 완료
              </span>
              <Button onClick={computeResult} disabled={!allAnswered}>
                결과 보기
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
