/**
 * Groq API 래퍼 (OpenAI 호환 REST — SDK 없이 fetch만 사용).
 *
 * ⚠️ 프로토타입 단계 한정: `VITE_GROQ_API_KEY`는 클라이언트 번들에 그대로 노출된다.
 * 배포 전에는 반드시 Firebase Cloud Functions 같은 서버 프록시로 옮길 것 — 지금은
 * 팀 결정에 따라 임시로 클라이언트에서 직접 호출한다.
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

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/** 실제 서비스에 쓰이는 모델. 문자열 하나만 바꾸면 교체된다. */
export const GROQ_MODELS = {
  /** 옷 사진 분류 (vision) — 이미지 입력 미지원일 경우 호출부가 자동 폴백한다 */
  vision: 'qwen/qwen3.6-27b',
  /** 코디 추천 문구 생성 (reasoning) */
  reasoning: 'llama-3.3-70b-versatile',
} as const

const apiKey = import.meta.env.VITE_GROQ_API_KEY
export const isGroqConfigured = typeof apiKey === 'string' && apiKey.length > 0

if (!isGroqConfigured && import.meta.env.DEV) {
  console.info('[ToFit] VITE_GROQ_API_KEY가 없어 Groq AI 기능 없이 기존 규칙 기반 로직만 사용합니다.')
}
if (isGroqConfigured && import.meta.env.DEV) {
  console.warn(
    '[ToFit] Groq API 키가 클라이언트 번들에 노출되는 방식으로 동작 중입니다. ' +
      '배포 전 서버 프록시(Firebase Functions 등)로 반드시 교체하세요.',
  )
}

interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

async function callGroqChat(options: {
  model: string
  system: string
  userContent: string | ChatContentPart[]
  maxTokens?: number
  /** qwen3.6 같은 reasoning 모델의 <think> 단계를 끈다 — 안 끄면 토큰을 수천 개씩 태우다 답을 못 낸다 */
  reasoningEffort?: 'none' | 'default'
}): Promise<string | null> {
  if (!isGroqConfigured) return null

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.3,
        max_tokens: options.maxTokens ?? 400,
        response_format: { type: 'json_object' },
        ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
        messages: [
          { role: 'system', content: options.system },
          { role: 'user', content: options.userContent },
        ],
      }),
    })

    if (!response.ok) {
      console.warn(`[ToFit] Groq API 오류 (${options.model}): ${response.status}`)
      return null
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content ?? null
  } catch (error) {
    console.warn(`[ToFit] Groq 호출 실패 (${options.model})`, error)
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
  const raw = await callGroqChat({
    model: GROQ_MODELS.vision,
    maxTokens: 300,
    // qwen3.6-27b는 기본적으로 <think> 추론을 길게 하는 reasoning 모델이라 이걸 안 끄면
    // 분당 토큰 한도(TPM)를 순식간에 다 써버리고 JSON도 못 낸다. 분류 작업엔 추론이 필요 없다.
    reasoningEffort: 'none',
    system:
      '너는 패션 커머스 앱의 옷 사진 분류기다. 사용자가 올린 옷 사진 한 장을 보고 아래 JSON 스키마로만 답한다. ' +
      '설명 문장 없이 JSON 객체 하나만 출력한다.\n' +
      `majorCategory는 다음 중 하나: ${MAJOR_CATEGORIES.join(', ')}\n` +
      `minorCategory는 다음 중 하나: ${MINOR_CATEGORIES.join(', ')}\n` +
      `material은 다음 중 하나: ${MATERIALS.join(', ')}\n` +
      'color는 대표색의 HEX 코드(#rrggbb), colorName은 그 색의 한글 이름(예: "아이보리").\n' +
      '스키마: {"majorCategory":"...","minorCategory":"...","color":"#xxxxxx","colorName":"...","material":"..."}',
    userContent: [
      { type: 'text', text: '이 옷을 분류해줘.' },
      { type: 'image_url', image_url: { url: imageDataUrl } },
    ],
  })

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
  const itemList = context.items
    .map((item) => `- ${item.categoryLabel}: ${item.brand} ${item.name} (${item.colorName})`)
    .join('\n')

  const raw = await callGroqChat({
    model: GROQ_MODELS.reasoning,
    maxTokens: 350,
    system:
      '너는 패션 코디 추천 앱 ToFit의 AI 스타일리스트다. 아래 실제 코디 구성을 근거로만 설명하고, ' +
      '목록에 없는 아이템이나 브랜드를 절대 지어내지 않는다. 반말은 쓰지 않되 친근한 존댓말(-해요/-예요체)을 쓴다. ' +
      '반드시 JSON 객체 하나만 출력한다: ' +
      '{"reason":"2~4문장, 날씨·상황·퍼스널컬러를 근거로 든 추천 이유","mascotComment":"이모지 1개를 포함한 짧은 한 문장, 마스코트가 말하듯 다정하게"}',
    userContent: [
      `상황: ${context.situationLabel}`,
      `날씨: ${context.weatherSummary}`,
      `사용자: ${context.nickname}님, 퍼스널컬러 ${context.personalColorLabel}`,
      '코디 구성:',
      itemList,
    ].join('\n'),
  })

  const parsed = parseJsonLoose<Partial<OutfitCopyResult>>(raw)
  if (!parsed || typeof parsed.reason !== 'string' || typeof parsed.mascotComment !== 'string') {
    return null
  }

  return { reason: parsed.reason, mascotComment: parsed.mascotComment }
}
