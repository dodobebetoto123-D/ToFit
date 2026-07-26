/**
 * 이미지에서 대표 색을 뽑는다.
 *
 * 기획서의 "사진 → Vision AI 자동 분류" 중 **색상 추출 부분만** 클라이언트에서 처리한다.
 * 카테고리·브랜드 인식은 서버 Vision API가 붙어야 하므로 아직 사용자 입력을 받는다.
 */

/** 긴 변을 maxSize로 줄여 JPEG data URL로 인코딩한다 */
async function resizeToDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', quality)
}

/** Vision AI 업로드용 — 요청 크기를 아끼려고 작게 줄인다. 저장하지 않는다. */
export async function fileToVisionDataUrl(file: File, maxSize = 512): Promise<string> {
  return resizeToDataUrl(file, maxSize, 0.85)
}

/**
 * 화면 표시·확대 보기용으로 저장할 사진.
 *
 * 확대했을 때 소재·패턴이 보여야 해서 Vision용(512px)보다 크게 잡는다. 다만 이 문자열이
 * Firestore 문서 안에 그대로 들어가고 문서 상한이 1MiB라, 1024px·품질 0.82로 타협했다
 * (보통 base64 기준 150~300KB).
 */
export async function fileToDisplayDataUrl(file: File, maxSize = 1024): Promise<string> {
  return resizeToDataUrl(file, maxSize, 0.82)
}

/** 이미지 가장자리를 제외한 중앙 영역의 평균색을 구한다 (배경 영향 최소화) */
export async function extractDominantColor(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')

  ctx.drawImage(bitmap, 0, 0, size, size)
  bitmap.close()

  // 중앙 50% 영역만 샘플링한다.
  const inset = Math.floor(size * 0.25)
  const { data } = ctx.getImageData(inset, inset, size - inset * 2, size - inset * 2)

  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 128) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }

  if (count === 0) return '#cccccc'

  const toHex = (value: number) =>
    Math.round(value / count)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** HEX → 가장 가까운 한글 색상명 */
const NAMED_COLORS: Array<{ hex: string; name: string }> = [
  { hex: '#ffffff', name: '화이트' },
  { hex: '#f2efe9', name: '아이보리' },
  { hex: '#e6dbc9', name: '크림' },
  { hex: '#d9b98c', name: '카멜' },
  { hex: '#c8b596', name: '베이지' },
  { hex: '#8b6b4a', name: '브라운' },
  { hex: '#b8b8b6', name: '라이트 그레이' },
  { hex: '#6f7076', name: '그레이' },
  { hex: '#3b3b40', name: '차콜' },
  { hex: '#1c1c1f', name: '블랙' },
  { hex: '#2f3e56', name: '네이비' },
  { hex: '#8ba6cc', name: '데님 블루' },
  { hex: '#b9cbe8', name: '스카이 블루' },
  { hex: '#a0b1f5', name: '라벤더' },
  { hex: '#7f9e7a', name: '카키' },
  { hex: '#c65f5f', name: '레드' },
  { hex: '#e8a765', name: '오렌지' },
  { hex: '#f4c3d1', name: '핑크' },
]

export function nearestColorName(hex: string): string {
  const parse = (value: string) => {
    const h = value.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  }

  const [r, g, b] = parse(hex)
  let best = NAMED_COLORS[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of NAMED_COLORS) {
    const [cr, cg, cb] = parse(candidate.hex)
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  return best.name
}

export { NAMED_COLORS }
