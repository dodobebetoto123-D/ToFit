/**
 * 공통 이미지 확대 뷰어.
 *
 * 커뮤니티 게시글 · 옷장 아이템 · 코디 추천 어디서든 같은 컴포넌트를 쓴다.
 *  - 핀치 줌(터치 2점) / 휠 줌 / 더블탭·더블클릭 줌
 *  - 확대 상태에서 드래그로 이동
 *  - 원래 크기일 때 아래로 스와이프하면 닫기
 *  - 여러 장이면 좌우 스와이프 + 화살표 + 페이지 인디케이터
 *  - Esc(네이티브 dialog) · 안드로이드 백버튼 · 닫기 버튼으로 닫기
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface ViewerImage {
  src: string
  alt: string
  caption?: string
}

interface ImageViewerProps {
  images: ViewerImage[]
  open: boolean
  startIndex?: number
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
/** 아래로 이만큼(px) 끌면 닫는다 */
const CLOSE_DRAG = 110
/** 옆으로 이만큼(px) 밀면 이전/다음 장 */
const SWIPE_THRESHOLD = 60

interface Point {
  x: number
  y: number
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function ImageViewer({ images, open, startIndex = 0, onClose }: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  /** 아래로 끌어 닫는 중일 때의 이동량 — 손을 떼면 0으로 돌아간다 */
  const [dismissY, setDismissY] = useState(0)

  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch' | 'track',
    startDistance: 0,
    startScale: 1,
    startOffset: { x: 0, y: 0 } as Point,
    startPoint: { x: 0, y: 0 } as Point,
    lastTap: 0,
  })

  const resetTransform = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setDismissY(0)
  }, [])

  // 열릴 때마다 시작 인덱스로 되돌린다.
  useEffect(() => {
    if (open) {
      setIndex(startIndex)
      resetTransform()
      setLoading(true)
    }
  }, [open, startIndex, resetTransform])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // 이미 브라우저에 올라와 있는 이미지(예: data URL)는 onLoad가 다시 뛰지 않는다.
  // 그대로 두면 스피너가 안 사라지므로 열릴 때마다 완료 여부를 직접 확인한다.
  useEffect(() => {
    if (!open) return
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) setLoading(false)
  }, [open, index])

  // onClose는 호출부에서 인라인 화살표로 넘어와 렌더마다 새 함수가 된다. 아래 히스토리
  // effect가 그걸 의존성으로 잡으면 확대·이동으로 리렌더될 때마다 effect가 다시 돌면서
  // history.back()이 호출돼 뷰어가 저절로 닫힌다. 최신 함수만 ref로 들고 간다.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // 안드로이드 백버튼(브라우저 뒤로가기)으로 닫기 — 히스토리 항목을 하나 쌓아두고 되돌아오면 닫는다.
  useEffect(() => {
    if (!open) return
    window.history.pushState({ tfViewer: true }, '')
    const handlePop = () => onCloseRef.current()
    window.addEventListener('popstate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
      // 버튼으로 닫은 경우엔 우리가 쌓은 항목이 아직 남아 있으므로 직접 걷어낸다.
      if (window.history.state?.tfViewer) window.history.back()
    }
  }, [open])

  const total = images.length
  const current = images[index]

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return
      const wrapped = ((next % total) + total) % total
      setIndex(wrapped)
      resetTransform()
      setLoading(true)
    },
    [total, resetTransform],
  )

  /** 확대 배율이 바뀌어도 이미지가 화면 밖으로 완전히 나가지 않도록 이동량을 제한한다 */
  const clampOffset = useCallback((next: Point, atScale: number): Point => {
    const stage = stageRef.current
    if (!stage || atScale <= 1) return { x: 0, y: 0 }
    const limitX = (stage.clientWidth * (atScale - 1)) / 2
    const limitY = (stage.clientHeight * (atScale - 1)) / 2
    return {
      x: Math.max(-limitX, Math.min(limitX, next.x)),
      y: Math.max(-limitY, Math.min(limitY, next.y)),
    }
  }, [])

  const applyScale = useCallback(
    (nextScale: number, keepOffset: Point) => {
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale))
      setScale(clamped)
      setOffset(clampOffset(keepOffset, clamped))
    },
    [clampOffset],
  )

  function handlePointerDown(event: React.PointerEvent) {
    const stage = stageRef.current
    if (!stage) return
    stage.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current.mode = 'pinch'
      gesture.current.startDistance = distance(a, b)
      gesture.current.startScale = scale
      gesture.current.startOffset = offset
      gesture.current.startPoint = midpoint(a, b)
      return
    }

    gesture.current.mode = scale > 1 ? 'pan' : 'track'
    gesture.current.startPoint = { x: event.clientX, y: event.clientY }
    gesture.current.startOffset = offset
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (gesture.current.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const ratio = distance(a, b) / (gesture.current.startDistance || 1)
      applyScale(gesture.current.startScale * ratio, gesture.current.startOffset)
      return
    }

    const dx = event.clientX - gesture.current.startPoint.x
    const dy = event.clientY - gesture.current.startPoint.y

    if (gesture.current.mode === 'pan') {
      setOffset(
        clampOffset(
          { x: gesture.current.startOffset.x + dx, y: gesture.current.startOffset.y + dy },
          scale,
        ),
      )
      return
    }

    // 원래 크기일 때 — 아래로 끌면 닫기 예고, 옆으로 밀면 장 넘기기 대기.
    if (gesture.current.mode === 'track' && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setDismissY(dy)
    }
  }

  function handlePointerUp(event: React.PointerEvent) {
    const startPoint = gesture.current.startPoint
    const mode = gesture.current.mode
    pointers.current.delete(event.pointerId)

    if (pointers.current.size === 0) gesture.current.mode = 'none'
    else if (pointers.current.size === 1) gesture.current.mode = scale > 1 ? 'pan' : 'track'

    if (mode !== 'track') {
      setDismissY(0)
      return
    }

    const dx = event.clientX - startPoint.x
    const dy = event.clientY - startPoint.y

    if (dy > CLOSE_DRAG && Math.abs(dy) > Math.abs(dx)) {
      setDismissY(0)
      onClose()
      return
    }

    if (total > 1 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(index + (dx < 0 ? 1 : -1))
    }

    setDismissY(0)
  }

  function handleDoubleClick(event: React.MouseEvent) {
    event.preventDefault()
    if (scale > 1) {
      resetTransform()
    } else {
      applyScale(DOUBLE_TAP_SCALE, { x: 0, y: 0 })
    }
  }

  function handleWheel(event: React.WheelEvent) {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return
    applyScale(scale - event.deltaY * 0.003, offset)
  }

  if (!current) {
    return <dialog ref={dialogRef} className="tf-viewer" onCancel={onClose} onClose={onClose} />
  }

  const dimming = Math.max(0, 1 - dismissY / (CLOSE_DRAG * 2.2))

  return (
    <dialog
      ref={dialogRef}
      className="tf-viewer"
      onCancel={onClose}
      onClose={onClose}
      aria-label="이미지 확대 보기"
      style={{ backgroundColor: `rgba(16, 17, 24, ${0.94 * dimming})` }}
    >
      <div className="tf-viewer__bar">
        {total > 1 && (
          <span className="tf-viewer__counter" aria-live="polite">
            {index + 1} / {total}
          </span>
        )}
        <button
          type="button"
          className="tf-viewer__close"
          onClick={onClose}
          aria-label="확대 보기 닫기"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div
        ref={stageRef}
        className="tf-viewer__stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {loading && <span className="tf-viewer__spinner" role="status" aria-label="불러오는 중" />}

        <img
          key={current.src}
          ref={imageRef}
          src={current.src}
          alt={current.alt}
          className="tf-viewer__image"
          draggable={false}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          style={{
            transform: `translate(${offset.x}px, ${offset.y + dismissY}px) scale(${scale})`,
            transition: gesture.current.mode === 'none' ? 'transform 180ms ease-out' : 'none',
            opacity: loading ? 0 : 1,
          }}
        />
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="tf-viewer__nav tf-viewer__nav--prev"
            onClick={() => goTo(index - 1)}
            aria-label="이전 이미지"
          >
            <Icon name="chevron-right" size={24} />
          </button>
          <button
            type="button"
            className="tf-viewer__nav tf-viewer__nav--next"
            onClick={() => goTo(index + 1)}
            aria-label="다음 이미지"
          >
            <Icon name="chevron-right" size={24} />
          </button>
          <div className="tf-viewer__dots">
            {images.map((image, dotIndex) => (
              <button
                key={image.src}
                type="button"
                className={`tf-viewer__dot${dotIndex === index ? ' is-active' : ''}`}
                onClick={() => goTo(dotIndex)}
                aria-label={`${dotIndex + 1}번째 이미지`}
                aria-current={dotIndex === index}
              />
            ))}
          </div>
        </>
      )}

      <p className="tf-viewer__caption">
        {current.caption ?? current.alt}
        <span className="tf-viewer__hint">
          두 번 눌러 확대 · 아래로 밀어 닫기
          {total > 1 && ' · 좌우로 밀어 넘기기'}
        </span>
      </p>
    </dialog>
  )
}
