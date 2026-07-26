/**
 * 약관 · 정책 문서 로더.
 *
 * 문서 본문은 코드에 하드코딩하지 않고 `public/legal/` 아래 마크다운 파일로 두고
 * 런타임에 받아온다 — 개정할 때 앱을 다시 빌드하지 않아도 되고, 버전·시행일을
 * manifest 한 곳에서 관리할 수 있다.
 */

/** 회원가입 동의 단계에서의 성격 — 필수 / 선택 / 동의 대상 아님(열람 전용) */
export type LegalConsent = 'required' | 'optional' | 'none'

export interface LegalDocumentMeta {
  id: string
  title: string
  version: string
  /** ISO 날짜 (YYYY-MM-DD) */
  effectiveDate: string
  file: string
  consent: LegalConsent
  summary: string
}

const BASE_PATH = '/legal'

let manifestCache: LegalDocumentMeta[] | null = null
const bodyCache = new Map<string, string>()

/** 문서 목록(제목·버전·시행일)을 가져온다. 한 세션에 한 번만 실제로 받아온다. */
export async function fetchLegalManifest(): Promise<LegalDocumentMeta[]> {
  if (manifestCache) return manifestCache
  const response = await fetch(`${BASE_PATH}/manifest.json`)
  if (!response.ok) throw new Error('약관 목록을 불러오지 못했어요.')
  const parsed = (await response.json()) as { documents?: LegalDocumentMeta[] }
  manifestCache = parsed.documents ?? []
  return manifestCache
}

/** 개별 문서 본문(마크다운 원문)을 가져온다. */
export async function fetchLegalDocument(meta: LegalDocumentMeta): Promise<string> {
  const cached = bodyCache.get(meta.id)
  if (cached) return cached
  const response = await fetch(`${BASE_PATH}/${meta.file}`)
  if (!response.ok) throw new Error(`${meta.title} 본문을 불러오지 못했어요.`)
  const text = await response.text()
  bodyCache.set(meta.id, text)
  return text
}

/** 시행일을 "2026년 7월 26일" 형태로 표시한다 */
export function formatEffectiveDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}
