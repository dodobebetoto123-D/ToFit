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

export async function generateOutfitCopy(
  context: OutfitCopyContext,
): Promise<OutfitCopyResult | null> {
  const raw = await callProxy({ action: 'copy', context })

  const parsed = parseJsonLoose<Partial<OutfitCopyResult>>(raw)
  if (!parsed || typeof parsed.reason !== 'string' || typeof parsed.mascotComment !== 'string') {
    return null
  }

  return { reason: parsed.reason, mascotComment: parsed.mascotComment }
}
