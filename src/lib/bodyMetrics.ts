/**
 * 키·몸무게 입력 검증.
 *
 * 예전에는 min/max가 없어 300cm·500kg 같은 값도 그대로 저장됐다. 그런 값이 들어가면
 * 체형 적합도·추천 점수 계산이 통째로 망가진다. 두 화면(온보딩·체형 맞춤)이 같은
 * 기준을 쓰도록 여기 모아둔다.
 */
export const HEIGHT_RANGE = { min: 100, max: 250 } as const
export const WEIGHT_RANGE = { min: 30, max: 200 } as const

function inRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max
}

/** 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다 */
export function validateBodyMetrics(height: number, weight: number): string | null {
  if (!inRange(height, HEIGHT_RANGE)) {
    return `키는 ${HEIGHT_RANGE.min}~${HEIGHT_RANGE.max}cm 사이로 입력해 주세요.`
  }
  if (!inRange(weight, WEIGHT_RANGE)) {
    return `몸무게는 ${WEIGHT_RANGE.min}~${WEIGHT_RANGE.max}kg 사이로 입력해 주세요.`
  }
  return null
}
