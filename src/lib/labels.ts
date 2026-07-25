/**
 * Enum 성격의 값 → 한글 표기 매핑.
 * UI에 노출되는 문자열은 전부 이 파일을 거친다.
 */
import type {
  BodyShape,
  FeedbackTag,
  Gender,
  MajorCategory,
  Material,
  MinorCategory,
  PersonalColor,
  Season,
  Situation,
  StyleTag,
  Thickness,
} from '@/types'

export const genderLabel: Record<Gender, string> = {
  MALE: '남성',
  FEMALE: '여성',
  UNISEX: '무관',
}

export const personalColorLabel: Record<PersonalColor, string> = {
  SPRING_WARM: '봄 웜톤',
  SUMMER_COOL: '여름 쿨톤',
  AUTUMN_WARM: '가을 웜톤',
  WINTER_COOL: '겨울 쿨톤',
}

/** 퍼스널 컬러별 대표 팔레트 — 진단 결과와 코디 추천 이유에 함께 쓰인다 */
export const personalColorPalette: Record<PersonalColor, string[]> = {
  SPRING_WARM: ['#f7c59f', '#f4a259', '#e8d8a0', '#a3c9a8', '#f2e8cf'],
  SUMMER_COOL: ['#a0b1f5', '#c6d4f2', '#e3d7ef', '#b9d6d2', '#f3f0f7'],
  AUTUMN_WARM: ['#b08968', '#c98c5a', '#7f5539', '#a3a380', '#ede0d4'],
  WINTER_COOL: ['#2f3e56', '#5566bb', '#8f9fd4', '#d8dbe4', '#ffffff'],
}

export const seasonLabel: Record<Season, string> = {
  SPRING: '봄',
  SUMMER: '여름',
  AUTUMN: '가을',
  WINTER: '겨울',
}

export const bodyShapeLabel: Record<BodyShape, string> = {
  STRAIGHT: '스트레이트 체형',
  WAVE: '웨이브 체형',
  NATURAL: '내추럴 체형',
}

export const bodyShapeSummary: Record<BodyShape, string> = {
  STRAIGHT: '상체에 볼륨이 있고 몸의 두께가 있는 편이에요. 목선을 시원하게 열어주는 옷이 잘 어울려요.',
  WAVE: '어깨가 좁고 곡선적인 라인이에요. 상의는 짧고 하의는 길게 입으면 비율이 살아나요.',
  NATURAL: '골격이 또렷하고 어깨가 넓은 편이에요. 넉넉한 실루엣과 두꺼운 소재가 잘 받아요.',
}

export const styleTagLabel: Record<StyleTag, string> = {
  MINIMAL: '미니멀',
  CASUAL: '캐주얼',
  LOVELY: '러블리',
  STREET: '스트릿',
  AMEKAJI: '아메카지',
  CLASSIC: '클래식',
  SPORTY: '스포티',
  CHIC: '시크',
}

export const majorCategoryLabel: Record<MajorCategory, string> = {
  TOP: '상의',
  BOTTOM: '하의',
  OUTER: '아우터',
  SHOES: '신발',
  BAG: '가방',
  ACCESSORY: '액세서리',
}

export const minorCategoryLabel: Record<MinorCategory, string> = {
  T_SHIRT: '티셔츠',
  SHIRT: '셔츠',
  SWEATER: '니트',
  HOODIE: '후디',
  BLOUSE: '블라우스',
  SLACKS: '슬랙스',
  DENIM: '데님',
  SKIRT: '스커트',
  SHORTS: '숏팬츠',
  CARDIGAN: '가디건',
  COAT: '코트',
  JACKET: '재킷',
  PADDING: '패딩',
  SNEAKERS: '스니커즈',
  BOOTS: '부츠',
  LOAFER: '로퍼',
  TOTE_BAG: '토트백',
  BACKPACK: '백팩',
  CAP: '캡',
  MUFFLER: '머플러',
}

export const materialLabel: Record<Material, string> = {
  COTTON: '면',
  LINEN: '린넨',
  DENIM: '데님',
  WOOL: '울',
  LEATHER: '가죽',
  POLYESTER: '폴리에스터',
  NYLON: '나일론',
  KNIT: '니트',
}

export const thicknessLabel: Record<Thickness, string> = {
  THIN: '얇음',
  MEDIUM: '보통',
  THICK: '두꺼움',
}

export const situationLabel: Record<Situation, string> = {
  DAILY: '데일리',
  CAMPUS: '캠퍼스',
  OFFICE: '출근',
  DATE: '데이트',
  TRAVEL: '여행',
  WORKOUT: '운동',
  PARTY: '파티',
  WEDDING: '경조사',
}

export const situationEmoji: Record<Situation, string> = {
  DAILY: '🏠',
  CAMPUS: '🎓',
  OFFICE: '💼',
  DATE: '💗',
  TRAVEL: '✈️',
  WORKOUT: '🏃',
  PARTY: '🥂',
  WEDDING: '💐',
}

export const feedbackTagLabel: Record<FeedbackTag, string> = {
  COMFY: '편했어요',
  COMPLIMENTED: '칭찬받았어요',
  NOT_MY_STYLE: '안 어울렸어요',
  TOO_COLD: '추웠어요',
  TOO_HOT: '더웠어요',
}
