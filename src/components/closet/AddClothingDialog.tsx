import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { classifyClothingPhoto, isGroqConfigured } from '@/lib/groq'
import {
  extractDominantColor,
  fileToDisplayDataUrl,
  fileToVisionDataUrl,
  NAMED_COLORS,
  nearestColorName,
} from '@/lib/image'
import {
  majorCategoryLabel,
  materialLabel,
  minorCategoryLabel,
  seasonLabel,
  styleTagLabel,
  thicknessLabel,
} from '@/lib/labels'
import { cn, isLightColor } from '@/lib/utils'
import {
  MAJOR_CATEGORIES,
  MATERIALS,
  SEASONS,
  STYLE_TAGS,
  THICKNESSES,
  type ClothingItem,
  type MajorCategory,
  type Material,
  type MinorCategory,
  type Season,
  type StyleTag,
  type Thickness,
} from '@/types'
import { GarmentGlyph } from './GarmentGlyph'

/** 대분류별로 고를 수 있는 소분류 */
const MINOR_BY_MAJOR: Record<MajorCategory, MinorCategory[]> = {
  TOP: ['T_SHIRT', 'SHIRT', 'BLOUSE', 'SWEATER', 'HOODIE', 'CARDIGAN'],
  BOTTOM: ['SLACKS', 'DENIM', 'SKIRT', 'SHORTS'],
  OUTER: ['COAT', 'JACKET', 'PADDING', 'CARDIGAN'],
  SHOES: ['SNEAKERS', 'BOOTS', 'LOAFER'],
  BAG: ['TOTE_BAG', 'BACKPACK'],
  ACCESSORY: ['CAP', 'MUFFLER'],
}

type NewItem = Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>

interface AddClothingDialogProps {
  open: boolean
  userId: string
  onClose: () => void
  onSubmit: (item: NewItem) => void
}

export function AddClothingDialog({ open, userId, onClose, onSubmit }: AddClothingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [majorCategory, setMajorCategory] = useState<MajorCategory>('TOP')
  const [minorCategory, setMinorCategory] = useState<MinorCategory>('T_SHIRT')
  const [color, setColor] = useState('#e6dbc9')
  const [colorName, setColorName] = useState('크림')
  const [material, setMaterial] = useState<Material>('COTTON')
  const [thickness, setThickness] = useState<Thickness>('MEDIUM')
  const [seasons, setSeasons] = useState<Season[]>(['SPRING', 'AUTUMN'])
  const [style, setStyle] = useState<StyleTag>('CASUAL')
  const [price, setPrice] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [photoHint, setPhotoHint] = useState<string | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // 대분류를 바꾸면 소분류를 그 그룹의 첫 항목으로 맞춰준다.
  useEffect(() => {
    setMinorCategory((current) =>
      MINOR_BY_MAJOR[majorCategory].includes(current)
        ? current
        : MINOR_BY_MAJOR[majorCategory][0],
    )
  }, [majorCategory])

  function toggleSeason(season: Season) {
    setSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season],
    )
  }

  async function handlePhoto(file: File) {
    // 저장용은 확대 보기에서 소재·패턴이 보이도록 크게, AI 전송용은 작게 — 두 벌을 따로 만든다.
    let dataUrl: string | undefined
    try {
      setPhotoUrl(await fileToDisplayDataUrl(file))
    } catch {
      // 압축 실패해도 아래 색상 추출·수동 입력은 그대로 진행한다.
    }
    try {
      dataUrl = await fileToVisionDataUrl(file)
    } catch {
      // Vision 전송용을 못 만들면 아래 AI 분석 단계는 건너뛴다.
    }

    // 즉시 미리보기용 — 캔버스 기반 평균색은 네트워크 없이 바로 나온다.
    try {
      const dominant = await extractDominantColor(file)
      setColor(dominant)
      setColorName(nearestColorName(dominant))
      setPhotoHint(`사진에서 ${nearestColorName(dominant)} 계열을 찾았어요. 이대로 바로 추가해도 돼요.`)
    } catch {
      setPhotoHint('사진에서 색을 읽지 못했어요. 아래에서 직접 골라 주세요.')
    }

    if (!isGroqConfigured || !dataUrl) return

    // Vision AI로 카테고리·소재까지 보강 — 실패해도 위 캔버스 결과가 그대로 남는다.
    setAiAnalyzing(true)
    try {
      const result = await classifyClothingPhoto(dataUrl)
      if (result) {
        if (result.majorCategory) setMajorCategory(result.majorCategory)
        if (result.minorCategory) setMinorCategory(result.minorCategory)
        if (result.color) setColor(result.color)
        if (result.colorName) setColorName(result.colorName)
        if (result.material) setMaterial(result.material)
        setPhotoHint('AI가 사진을 보고 카테고리 · 색상 · 소재를 채워봤어요. 이대로 바로 추가해도 돼요.')
      }
    } catch {
      // 조용히 무시 — 캔버스 기반 색상 추출 결과가 이미 반영돼 있다.
    } finally {
      setAiAnalyzing(false)
    }
  }

  function handleSubmit() {
    setError(null)

    onSubmit({
      userId,
      name: name.trim() || minorCategoryLabel[minorCategory],
      brand: brand.trim() || '브랜드 미상',
      majorCategory,
      minorCategory,
      style,
      color,
      colorName,
      material,
      thickness,
      seasons: seasons.length > 0 ? seasons : ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'],
      price: price ? Number(price) : undefined,
      photoUrl,
      isPreferred: false,
    })

    // 다음 등록을 위해 초기화
    setName('')
    setBrand('')
    setPrice('')
    setPhotoUrl(undefined)
    setPhotoHint(null)
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="tf-dialog" onCancel={onClose} onClose={onClose}>
      <header className="tf-dialog__head">
        <h2 className="tf-title">옷 추가</h2>
        <button type="button" className="tf-icon-btn" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="tf-dialog__body">
        {/* 미리보기 + 사진 등록 */}
        <div className="tf-addform__preview">
          <div className="tf-addform__glyph">
            {photoUrl ? (
              <img src={photoUrl} alt="업로드한 옷 사진" className="tf-addform__photo-preview" />
            ) : (
              <GarmentGlyph category={minorCategory} color={color} />
            )}
          </div>
          <div className="tf-addform__photo">
            <label className="tf-uploader">
              <Icon name="camera" size={18} />
              <span>사진으로 바로 추가</span>
              <input
                type="file"
                accept="image/*"
                className="tf-sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handlePhoto(file)
                }}
              />
            </label>
            <p className="tf-micro">
              {aiAnalyzing
                ? 'AI가 사진을 분석하고 있어요...'
                : (photoHint ??
                  (isGroqConfigured
                    ? '사진을 올리면 AI가 카테고리 · 색상 · 소재를 자동으로 채워드려요.'
                    : '카테고리 자동 인식(Vision AI)은 서버 연동 후 지원됩니다.'))}
            </p>
          </div>
        </div>

        {/* 필수 입력 */}
        <fieldset className="tf-field">
          <legend>카테고리 *</legend>
          <div className="tf-chipset">
            {MAJOR_CATEGORIES.map((category) => (
              <Chip
                key={category}
                selected={majorCategory === category}
                onClick={() => setMajorCategory(category)}
              >
                {majorCategoryLabel[category]}
              </Chip>
            ))}
          </div>
          <div className="tf-chipset">
            {MINOR_BY_MAJOR[majorCategory].map((category) => (
              <Chip
                key={category}
                size="sm"
                selected={minorCategory === category}
                onClick={() => setMinorCategory(category)}
              >
                {minorCategoryLabel[category]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="tf-field">
          <legend>색상 *</legend>
          <div className="tf-swatchset">
            {NAMED_COLORS.map((candidate) => (
              <button
                key={candidate.hex}
                type="button"
                className={cn(
                  'tf-swatchbtn',
                  isLightColor(candidate.hex) && 'tf-swatchbtn--light',
                  color === candidate.hex && 'is-selected',
                )}
                style={{ background: candidate.hex }}
                title={candidate.name}
                aria-label={candidate.name}
                aria-pressed={color === candidate.hex}
                onClick={() => {
                  setColor(candidate.hex)
                  setColorName(candidate.name)
                }}
              />
            ))}
            <label className="tf-swatchbtn tf-swatchbtn--custom" title="직접 고르기">
              <Icon name="plus" size={14} />
              <input
                type="color"
                value={color}
                className="tf-sr-only"
                onChange={(event) => {
                  setColor(event.target.value)
                  setColorName(nearestColorName(event.target.value))
                }}
              />
            </label>
          </div>
          <p className="tf-micro">선택한 색: {colorName}</p>
        </fieldset>

        <div className="tf-field-row">
          <label className="tf-field">
            <span>브랜드</span>
            <input
              className="tf-input"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="비워두면 '브랜드 미상'으로 저장돼요"
            />
          </label>
          <label className="tf-field">
            <span>이름</span>
            <input
              className="tf-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="비워두면 카테고리명으로 저장돼요"
            />
          </label>
        </div>

        {/* 선택 입력 */}
        <details className="tf-details">
          <summary>선택 입력 (소재 · 두께 · 계절 · 스타일 · 가격)</summary>

          <fieldset className="tf-field">
            <legend>소재</legend>
            <div className="tf-chipset">
              {MATERIALS.map((value) => (
                <Chip
                  key={value}
                  size="sm"
                  selected={material === value}
                  onClick={() => setMaterial(value)}
                >
                  {materialLabel[value]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="tf-field">
            <legend>두께</legend>
            <div className="tf-chipset">
              {THICKNESSES.map((value) => (
                <Chip
                  key={value}
                  size="sm"
                  selected={thickness === value}
                  onClick={() => setThickness(value)}
                >
                  {thicknessLabel[value]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="tf-field">
            <legend>계절 (복수 선택)</legend>
            <div className="tf-chipset">
              {SEASONS.map((value) => (
                <Chip
                  key={value}
                  size="sm"
                  selected={seasons.includes(value)}
                  onClick={() => toggleSeason(value)}
                >
                  {seasonLabel[value]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="tf-field">
            <legend>스타일</legend>
            <div className="tf-chipset">
              {STYLE_TAGS.map((value) => (
                <Chip
                  key={value}
                  size="sm"
                  selected={style === value}
                  onClick={() => setStyle(value)}
                >
                  {styleTagLabel[value]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <label className="tf-field">
            <span>가격 (원)</span>
            <input
              className="tf-input"
              type="number"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="예: 39000"
            />
          </label>
        </details>

        {error && <p className="tf-error" role="alert">{error}</p>}
      </div>

      <footer className="tf-dialog__foot">
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button onClick={handleSubmit} leading={<Icon name="plus" size={16} />}>
          옷장에 추가
        </Button>
      </footer>
    </dialog>
  )
}
