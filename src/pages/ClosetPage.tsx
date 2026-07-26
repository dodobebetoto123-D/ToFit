import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AddClothingDialog } from '@/components/closet/AddClothingDialog'
import { ClothingCard } from '@/components/closet/ClothingCard'
import { GarmentGlyph } from '@/components/closet/GarmentGlyph'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import {
  majorCategoryLabel,
  materialLabel,
  minorCategoryLabel,
  seasonLabel,
  styleTagLabel,
  thicknessLabel,
} from '@/lib/labels'
import { formatPrice, fromNow } from '@/lib/utils'
import { MAJOR_CATEGORIES, type ClothingItem, type MajorCategory } from '@/types'

type Filter = MajorCategory | 'ALL'
type SortKey = 'RECENT' | 'WORN' | 'NAME'

const FILTERS: ReadonlyArray<SegmentedOption<Filter>> = [
  { value: 'ALL', label: '전체' },
  ...MAJOR_CATEGORIES.map((category) => ({
    value: category,
    label: majorCategoryLabel[category],
  })),
]

const SORTS: ReadonlyArray<SegmentedOption<SortKey>> = [
  { value: 'RECENT', label: '최근 등록' },
  { value: 'WORN', label: '많이 입은 순' },
  { value: 'NAME', label: '이름순' },
]

export function ClosetPage() {
  const { user } = useAuth()
  const { closet, closetLoading, addClothingItem, removeClothingItem, togglePreferred } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<SortKey>('RECENT')
  const [preferredOnly, setPreferredOnly] = useState(false)
  const [selected, setSelected] = useState<ClothingItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)

  // 홈에서 `/closet?add=1` 로 들어오면 바로 등록 창을 연다.
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setDialogOpen(true)
      searchParams.delete('add')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // 코디 보드에서 내 옷장 아이템을 눌러 `/closet?item={id}`로 들어오면 그 아이템의
  // 상세 패널을 바로 연다.
  useEffect(() => {
    const itemId = searchParams.get('item')
    if (!itemId || closetLoading) return
    const item = closet.find((i) => i.id === itemId)
    if (item) setSelected(item)
    searchParams.delete('item')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, closet, closetLoading])

  const visible = useMemo(() => {
    let items = filter === 'ALL' ? closet : closet.filter((i) => i.majorCategory === filter)
    if (preferredOnly) items = items.filter((i) => i.isPreferred)

    return [...items].sort((a, b) => {
      if (sort === 'WORN') return b.wearCount - a.wearCount
      if (sort === 'NAME') return a.name.localeCompare(b.name, 'ko')
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [closet, filter, preferredOnly, sort])

  const countByCategory = useMemo(() => {
    const counts = new Map<MajorCategory, number>()
    for (const item of closet) {
      counts.set(item.majorCategory, (counts.get(item.majorCategory) ?? 0) + 1)
    }
    return counts
  }, [closet])

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">내 옷장</h1>
          <p className="tf-caption">
            전체 {closet.length}개 ·{' '}
            {MAJOR_CATEGORIES.filter((c) => countByCategory.get(c))
              .map((c) => `${majorCategoryLabel[c]} ${countByCategory.get(c)}`)
              .join(' · ')}
          </p>
        </div>
        <Button leading={<Icon name="plus" size={16} />} onClick={() => setDialogOpen(true)}>
          옷 추가
        </Button>
      </header>

      <div className="tf-toolbar tf-reveal">
        <SegmentedTabs
          ariaLabel="카테고리 필터"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
        <div className="tf-toolbar__right">
          <Chip
            size="sm"
            selected={preferredOnly}
            onClick={() => setPreferredOnly((value) => !value)}
            leading={<Icon name={preferredOnly ? 'heart-filled' : 'heart'} size={14} />}
          >
            자주 입는 옷
          </Chip>
          <SegmentedTabs
            ariaLabel="정렬"
            variant="track"
            size="sm"
            options={SORTS}
            value={sort}
            onChange={setSort}
          />
        </div>
      </div>

      {closetLoading ? (
        <div className="tf-empty tf-reveal">
          <MascotBubble message="옷장을 불러오는 중이에요..." mood="thinking" />
        </div>
      ) : visible.length === 0 ? (
        <div className="tf-empty tf-reveal">
          <MascotBubble
            message="이 칸은 아직 비어 있어요. 옷을 추가하면 코디 추천이 훨씬 정확해져요!"
            mood="thinking"
          />
          <Button
            variant="soft"
            leading={<Icon name="plus" size={16} />}
            onClick={() => setDialogOpen(true)}
          >
            첫 옷 등록하기
          </Button>
        </div>
      ) : (
        <div className="tf-grid tf-grid--closet-lg tf-stagger">
          {visible.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              onTogglePreferred={togglePreferred}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {/* ── 상세 패널 ─────────────────────────────────────── */}
      {selected && (
        <div className="tf-detail tf-reveal" role="dialog" aria-label={`${selected.name} 상세`}>
          <button
            type="button"
            className="tf-icon-btn tf-detail__close"
            onClick={() => setSelected(null)}
            aria-label="닫기"
          >
            <Icon name="close" size={19} />
          </button>

          <div className="tf-detail__art">
            {selected.photoUrl ? (
              <>
                <button
                  type="button"
                  className="tf-detail__photobtn"
                  onClick={() => setZoomOpen(true)}
                  aria-label={`${selected.name} 큰 이미지 보기`}
                >
                  <img src={selected.photoUrl} alt={selected.name} className="tf-detail__photo" />
                </button>
                <button
                  type="button"
                  className="tf-zoombtn"
                  onClick={() => setZoomOpen(true)}
                  aria-label="큰 이미지 보기"
                >
                  <Icon name="search" size={16} />
                </button>
              </>
            ) : (
              <GarmentGlyph category={selected.minorCategory} color={selected.color} />
            )}
          </div>

          <div className="tf-detail__info">
            <p className="tf-micro">{selected.brand}</p>
            <h2 className="tf-title">{selected.name}</h2>
            <div className="tf-chipset">
              <Chip size="sm" readOnly>
                {majorCategoryLabel[selected.majorCategory]}
              </Chip>
              <Chip size="sm" readOnly>
                {minorCategoryLabel[selected.minorCategory]}
              </Chip>
              <Chip size="sm" readOnly tone="cool">
                {styleTagLabel[selected.style]}
              </Chip>
            </div>

            <dl className="tf-deflist">
              <div>
                <dt>색상</dt>
                <dd>{selected.colorName}</dd>
              </div>
              <div>
                <dt>소재</dt>
                <dd>{materialLabel[selected.material]}</dd>
              </div>
              <div>
                <dt>두께</dt>
                <dd>{thicknessLabel[selected.thickness]}</dd>
              </div>
              <div>
                <dt>계절</dt>
                <dd>{selected.seasons.map((s) => seasonLabel[s]).join(' · ')}</dd>
              </div>
              <div>
                <dt>착용</dt>
                <dd>
                  {selected.wearCount}회
                  {selected.lastWornAt ? ` · 마지막 ${fromNow(selected.lastWornAt)}` : ''}
                </dd>
              </div>
              {selected.price !== undefined && (
                <div>
                  <dt>가격</dt>
                  <dd>{formatPrice(selected.price)}</dd>
                </div>
              )}
            </dl>

            <div className="tf-detail__actions">
              <Button
                variant="soft"
                leading={
                  <Icon name={selected.isPreferred ? 'heart-filled' : 'heart'} size={16} />
                }
                onClick={() => {
                  togglePreferred(selected.id)
                  setSelected({ ...selected, isPreferred: !selected.isPreferred })
                }}
              >
                {selected.isPreferred ? '자주 입는 옷 해제' : '자주 입는 옷'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  removeClothingItem(selected.id)
                  setSelected(null)
                }}
              >
                옷장에서 삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      <ImageViewer
        open={zoomOpen && !!selected?.photoUrl}
        images={
          selected?.photoUrl
            ? [
                {
                  src: selected.photoUrl,
                  alt: selected.name,
                  caption: `${selected.brand} · ${selected.name}`,
                },
              ]
            : []
        }
        onClose={() => setZoomOpen(false)}
      />

      <AddClothingDialog
        open={dialogOpen}
        userId={user?.id ?? 'guest'}
        onClose={() => setDialogOpen(false)}
        onSubmit={addClothingItem}
      />
    </div>
  )
}
