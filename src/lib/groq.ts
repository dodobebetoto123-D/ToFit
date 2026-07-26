/**
 * AI 기능 클라이언트.
 *
 * Groq를 직접 부르지 않고 Cloudflare Worker 프록시(`VITE_AI_PROXY_URL`)를 거친다.
 * API 키는 Worker 시크릿에만 있고 이 번들에는 들어가지 않는다 — 모델 선택과
 * 시스템 프롬프트도 Worker가 들고 있어서, 여기서는 데이터만 보낸다.
 * 배포 방법은 `worker/README.md` 참고.
 *
 * 두 가지만 제공한다:
 *   - classifyClothingPhoto: 옷 사진 → 카테고리/색상/소재 자동 인식 (vision)
 *   - generateOutfitCopy: 코디 추천 이유/마스코트 코멘트 자연어 생성 (reasoning)
 *
 * 두 함수 모두 실패 시 절대 throw하지 않고 null을 반환한다 — 호출부는 항상
 * 기존 규칙 기반 결과로 자연스럽게 폴백한다.
 */
import {
  MAJOR_CATEGORIES,
  MATERIALS,
  MINOR_CATEGORIES,
  type MajorCategory,
  type Material,
  type MinorCategory,
} from '@/types'

const proxyUrl = import.meta.env.VITE_AI_PROXY_URL
export const isGroqConfigured = typeof proxyUrl === 'string' && proxyUrl.length > 0

if (!isGroqConfigured && import.meta.env.DEV) {
  console.info(
    '[ToFit] VITE_AI_PROXY_URL이 없어 AI 기능 없이 규칙 기반 로직만 사용합니다. ' +
      '설정 방법은 worker/README.md 참고.',
  )
}
if (import.meta.env.DEV && import.meta.env.VITE_GROQ_API_KEY) {
  console.warn(
    '[ToFit] .env.local에 VITE_GROQ_API_KEY가 남아 있습니다. 이 값은 빌드 산출물에 ' +
      '그대로 박혀 공개되므로 삭제하세요. 이제 키는 Worker 시크릿에만 둡니다.',
  )
}

/** 프록시에 보낼 요청 — Worker가 아는 action만 허용된다 */
type ProxyRequest =
  | { action: 'classify'; imageDataUrl: string }
  | { action: 'copy'; context: OutfitCopyContext }

async function callProxy(request: ProxyRequest): Promise<string | null> {
  if (!isGroqConfigured) return null

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      console.warn(`[ToFit] AI 프록시 오류 (${request.action}): ${response.status}`)
      return null
    }

    const data = (await response.json()) as { content?: string | null }
    return data?.content ?? null
  } catch (error) {
    console.warn(`[ToFit] AI 프록시 호출 실패 (${request.action})`, error)
    return null
  }
}

/** 모델이 마크다운 코드펜스로 감싸 응답하는 경우까지 방어적으로 파싱한다 */
function parseJsonLoose<T>(raw: string | null): T | null {
  if (!raw) return null
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

/* ─────────────────────────────────────────────────────────────
   Vision — 옷 사진 자동 분류
   ───────────────────────────────────────────────────────────── */

export interface ClothingVisionResult {
  majorCategory: MajorCategory
  minorCategory: MinorCategory
  color: string
  colorName: string
  material: Material
}

interface RawVisionResponse {
  majorCategory?: string
  minorCategory?: string
  color?: string
  colorName?: string
  material?: string
}

/** enum에 없는 값을 모델이 지어내면 무시한다 (해당 필드는 undefined로 반환) */
function pickValid<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

export async function classifyClothingPhoto(
  imageDataUrl: string,
): Promise<Partial<ClothingVisionResult> | null> {
  const raw = await callProxy({ action: 'classify', imageDataUrl })

  const parsed = parseJsonLoose<RawVisionResponse>(raw)
  if (!parsed) return null

  const majorCategory = pickValid(parsed.majorCategory, MAJOR_CATEGORIES)
  const minorCategory = pickValid(parsed.minorCategory, MINOR_CATEGORIES)
  const material = pickValid(parsed.material, MATERIALS)
  const color = typeof parsed.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.color) ? parsed.color : undefined
  const colorName = typeof parsed.colorName === 'string' ? parsed.colorName : undefined

  if (!majorCategory && !minorCategory && !color && !material) return null

  return { majorCategory, minorCategory, color, colorName, material }
}

/* ─────────────────────────────────────────────────────────────
   Reasoning — 코디 추천 이유 / 마스코트 코멘트 생성
   ───────────────────────────────────────────────────────────── */

export interface OutfitCopyContext {
  situationLabel: string
  weatherSummary: string
  personalColorLabel: string
  nickname: string
  /** 실제로 이 코디에 쓰인 아이템만 넘긴다 — 모델이 없는 아이템을 지어내지 않도록 */
  items: Array<{ name: string; brand: string; colorName: string; categoryLabel: string }>
}

export interface OutfitCopyResult {
  reason: string
  mascotComment: string
}

/**
 * 모델이 흔히 지어내는 색 이름들.
 * 실제 코디에 없는 색을 문구가 언급하면 사용자에게 틀린 정보가 나가므로, 그런 문구는
 * 통째로 버리고 규칙 기반 문구로 폴백한다 (부정확한 AI 문구보다 낫다).
 */
const COLOR_WORDS = [
  '흰색', '하얀', '화이트', '검정', '검은', '블랙', '회색', '그레이', '남색', '네이비',
  '파란', '파랑', '블루', '하늘색', '빨간', '빨강', '레드', '분홍', '핑크', '베이지',
  '갈색', '브라운', '카키', '초록', '그린', '노란', '옐로우', '주황', '오렌지', '보라',
  '퍼플', '아이보리', '크림', '카멜', '차콜', '라벤더', '데님',
]

/** 코디에 실제로 쓰인 색 이름으로 설명되는 색 단어인지 */
function isColorGrounded(word: string, actualColorNames: string[]): boolean {
  return actualColorNames.some((name) => name.includes(word))
}

/** 실제 코디에 없는 색을 언급하면 true — 그런 문구는 쓰지 않는다 */
function mentionsUnknownColor(text: string, actualColorNames: string[]): boolean {
  return COLOR_WORDS.some((word) => text.includes(word) && !isColorGrounded(word, actualColorNames))
}

export async function generateOutfitCopy(
  context: OutfitCopyContext,
): Promise<OutfitCopyResult | null> {
  const raw = await callProxy({ action: 'copy', context })

  const parsed = parseJsonLoose<Partial<OutfitCopyResult>>(raw)
  if (!parsed || typeof parsed.reason !== 'string' || typeof parsed.mascotComment !== 'string') {
    return null
  }

  const reason = parsed.reason.trim()
  const mascotComment = parsed.mascotComment.trim()
  const combined = `${reason} ${mascotComment}`

  // 값을 못 채우고 자리표시자를 그대로 내보내는 경우가 있다 ("퍼스널컬러인 ??에 어울리는 ??색").
  if (reason.length < 10 || /\?\?|\{\{|___/.test(combined)) {
    console.warn('[ToFit] AI 문구가 비었거나 자리표시자가 남아 사용하지 않습니다.')
    return null
  }

  // 정보가 부족하다며 되묻는 답변도 그대로 보여주면 안 된다.
  if (/정보가 (부족|충분하지)|알려주시면|어렵습니다|어려워요/.test(reason)) {
    console.warn('[ToFit] AI가 문구 대신 되묻는 답을 보내 사용하지 않습니다.')
    return null
  }

  const actualColorNames = context.items.map((item) => item.colorName)
  if (mentionsUnknownColor(combined, actualColorNames)) {
    console.warn('[ToFit] AI 문구가 실제 코디에 없는 색을 언급해 사용하지 않습니다.')
    return null
  }

  return { reason, mascotComment }
}
