/** 조건부 className 결합 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

/** 1234000 → "₩1,234,000" */
export function formatPrice(value: number): string {
  return `₩${value.toLocaleString('ko-KR')}`
}

/** 배열에서 하나를 고른다 (seed 기반 — 같은 seed면 항상 같은 결과) */
export function pickBySeed<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]
}

/** 문자열 → 안정적인 정수 해시. 목업 데이터를 결정적으로 만들 때 쓴다. */
export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/** ISO date (YYYY-MM-DD) */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "3일 전" 형태의 상대 시간 */
export function fromNow(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const day = 24 * 60 * 60 * 1000

  if (diffMs < 60 * 1000) return '방금'
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))}분 전`
  if (diffMs < day) return `${Math.floor(diffMs / (60 * 60 * 1000))}시간 전`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

/** HEX 색이 밝은지 판정 — 밝으면 테두리를 그려 흰 배경과 구분한다 */
export function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return false
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  // 상대 휘도 (ITU-R BT.601)
  return (r * 299 + g * 587 + b * 114) / 1000 > 200
}

/** 충돌 가능성이 낮은 로컬 id */
export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** 두 HEX 색을 ratio(0~1)만큼 섞는다 */
export function mixHex(from: string, to: string, ratio: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ]
  }
  const a = parse(from)
  const b = parse(to)
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * ratio)
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`
}

/** 옷 일러스트의 외곽선 색 — 원색보다 살짝 어둡게 */
export function outlineFor(hex: string): string {
  return mixHex(hex, '#1f2230', isLightColor(hex) ? 0.22 : 0.3)
}
