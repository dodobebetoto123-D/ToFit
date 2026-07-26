/**
 * ToFit AI 프록시 — Cloudflare Worker
 *
 * Gemini API 키를 브라우저에 내려보내지 않기 위한 중계 서버다.
 * 키는 Worker 시크릿(GEMINI_API_KEY)에만 있고 클라이언트 번들에는 들어가지 않는다.
 *
 * Groq에서 Gemini로 옮겼다. 이유:
 *  - Groq 무료 등급은 분당 토큰이 12,000이라 429가 잦았다 (Gemini는 100만)
 *  - 무료 등급에서 쓸 수 있는 Groq 모델들이 한국어 세부 정보를 자주 틀렸다
 *    (아이보리→흰색, 슬랙스→블라우스처럼 실제 코디에 없는 걸 지어냄)
 *
 * 아무나 이걸 범용 LLM 프록시로 쓰지 못하도록:
 *  - 모델과 시스템 프롬프트를 서버에서 고정한다 (클라이언트는 데이터만 보낸다)
 *  - 허용된 action 두 개(classify / copy) 외에는 거부한다
 *  - 출력 토큰과 이미지 크기에 상한을 둔다
 *  - CORS를 허용 오리진으로 제한한다
 *
 * 배포: worker/README.md 참고
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const MODELS = {
  vision: 'gemini-3.1-flash-lite',
  reasoning: 'gemini-3.1-flash-lite',
}

/**
 * src/types/index.ts의 enum과 동일하게 유지할 것.
 * 프롬프트를 서버에 고정하려고 의도적으로 복제해 두었다 — 클라이언트가 시스템
 * 프롬프트를 마음대로 바꿔 넣지 못하게 하기 위함이다.
 */
const MAJOR_CATEGORIES = ['TOP', 'BOTTOM', 'OUTER', 'SHOES', 'BAG', 'ACCESSORY']
const MINOR_CATEGORIES = [
  'T_SHIRT', 'SHIRT', 'SWEATER', 'HOODIE', 'BLOUSE', 'SLACKS', 'DENIM', 'SKIRT',
  'SHORTS', 'CARDIGAN', 'COAT', 'JACKET', 'PADDING', 'SNEAKERS', 'BOOTS',
  'LOAFER', 'TOTE_BAG', 'BACKPACK', 'CAP', 'MUFFLER',
]
const MATERIALS = ['COTTON', 'LINEN', 'DENIM', 'WOOL', 'LEATHER', 'POLYESTER', 'NYLON', 'KNIT']

/** 이미지 data URL 상한 — 1024px JPEG면 넉넉히 들어간다 */
const MAX_IMAGE_CHARS = 400_000
/** 문구 생성에 넘길 수 있는 아이템 개수 상한 */
const MAX_ITEMS = 12

function allowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim())
  return configured.filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = allowedOrigins(env)
  // 목록을 비워두면 개발 편의상 전부 허용한다 — 배포 시에는 반드시 설정할 것.
  const ok = allowed.length === 0 || allowed.includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/**
 * 일시적인 서버 오류(5xx)만 짧게 재시도한다.
 *
 * 429는 재시도하지 않는다. Gemini 무료 등급은 분당 요청 수 제한이 있는데 "30초쯤 뒤에
 * 다시 오라"고 알려준다. 그만큼 기다리면 사용자가 화면 앞에서 멈춰 있게 되고, 짧은
 * 백오프로 다시 찔러봐야 같은 한도에 걸려 남은 할당량만 축낸다.
 * 호출부(src/lib/ai.ts)가 규칙 기반 문구로 조용히 폴백하므로 실패해도 화면은 멀쩡하다.
 */
async function callGeminiWithRetry(model, payload, apiKey, attempts = 2) {
  let last = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
    })

    if (response.ok) return response
    last = response

    if (response.status < 500 || attempt === attempts - 1) return response
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return last ?? new Response(null, { status: 502 })
}

/** Gemini 응답에서 본문 텍스트만 뽑는다 (parts가 여러 개로 쪼개져 올 수 있다) */
function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null
  const text = parts.map((part) => part?.text ?? '').join('').trim()
  return text.length > 0 ? text : null
}

/** data URL을 Gemini가 받는 inlineData 형태로 바꾼다 */
function toInlineData(dataUrl) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { inlineData: { mimeType: match[1], data: match[2] } }
}

function buildClassifyPayload(body) {
  const imageDataUrl = body.imageDataUrl
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return { error: 'imageDataUrl이 올바르지 않습니다.' }
  }
  if (imageDataUrl.length > MAX_IMAGE_CHARS) {
    return { error: '이미지가 너무 큽니다.' }
  }
  const inline = toInlineData(imageDataUrl)
  if (!inline) return { error: '이미지 형식을 읽지 못했습니다.' }

  return {
    model: MODELS.vision,
    payload: {
      systemInstruction: {
        parts: [
          {
            text:
              '너는 패션 커머스 앱의 옷 사진 분류기다. 사용자가 올린 옷 사진 한 장을 보고 아래 JSON 스키마로만 답한다.\n' +
              `majorCategory는 다음 중 하나: ${MAJOR_CATEGORIES.join(', ')}\n` +
              `minorCategory는 다음 중 하나: ${MINOR_CATEGORIES.join(', ')}\n` +
              `material은 다음 중 하나: ${MATERIALS.join(', ')}\n` +
              'color는 대표색의 HEX 코드(#rrggbb), colorName은 그 색의 한글 이름(예: "아이보리").',
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: '이 옷을 분류해줘.' }, inline] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            majorCategory: { type: 'STRING', enum: MAJOR_CATEGORIES },
            minorCategory: { type: 'STRING', enum: MINOR_CATEGORIES },
            color: { type: 'STRING' },
            colorName: { type: 'STRING' },
            material: { type: 'STRING', enum: MATERIALS },
          },
          required: ['majorCategory', 'minorCategory', 'color', 'colorName', 'material'],
        },
      },
    },
  }
}

function buildCopyPayload(body) {
  const context = body.context
  if (!context || typeof context !== 'object') {
    return { error: 'context가 없습니다.' }
  }

  const text = (value) => (typeof value === 'string' ? value.slice(0, 120) : '')
  const items = Array.isArray(context.items) ? context.items.slice(0, MAX_ITEMS) : []

  const itemList = items
    .map(
      (item) =>
        `- ${text(item.categoryLabel)}: ${text(item.brand)} ${text(item.name)} (색: ${text(item.colorName)})`,
    )
    .join('\n')

  return {
    model: MODELS.reasoning,
    payload: {
      systemInstruction: {
        parts: [
          {
            text:
              '너는 패션 코디 추천 앱 ToFit의 AI 스타일리스트다. 친근한 존댓말(-해요/-예요체)을 쓴다.\n' +
              '아래 규칙을 반드시 지킨다.\n' +
              '1. 색상은 입력에 적힌 색 이름을 글자 그대로만 쓴다. "아이보리"를 "흰색"으로, ' +
              '"그레이"를 "베이지"로 바꿔 부르지 않는다.\n' +
              '2. 목록에 없는 아이템·브랜드·색을 추가하지 않는다.\n' +
              '3. 퍼스널컬러는 입력에 적힌 이름을 그대로 쓴다.\n' +
              '4. 강수확률은 습도가 아니다. 입력 그대로 해석한다.\n' +
              '5. 입력에 있는 정보만으로 충분하다. 정보가 부족하다는 말은 하지 않는다.\n' +
              'reason은 2~4문장으로 날씨·상황·퍼스널컬러를 근거로 든 추천 이유를 쓴다.\n' +
              'mascotComment는 이모지 1개를 포함한 짧은 한 문장으로, 마스코트가 말하듯 다정하게 쓴다.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                `상황: ${text(context.situationLabel)}`,
                `날씨: ${text(context.weatherSummary)}`,
                `사용자: ${text(context.nickname)}님, 퍼스널컬러 ${text(context.personalColorLabel)}`,
                '코디 구성:',
                itemList,
              ].join('\n'),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reason: { type: 'STRING' },
            mascotComment: { type: 'STRING' },
          },
          required: ['reason', 'mascotComment'],
        },
      },
    },
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST만 허용합니다.' }, 405, cors)
    }
    if (cors['Access-Control-Allow-Origin'] === 'null') {
      return json({ error: '허용되지 않은 출처입니다.' }, 403, cors)
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY 시크릿이 설정되지 않았습니다.' }, 500, cors)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'JSON 본문을 읽지 못했습니다.' }, 400, cors)
    }


    let built
    if (body.action === 'classify') built = buildClassifyPayload(body)
    else if (body.action === 'copy') built = buildCopyPayload(body)
    else return json({ error: '지원하지 않는 action입니다.' }, 400, cors)

    if (built.error) return json({ error: built.error }, 400, cors)

    const response = await callGeminiWithRetry(built.model, built.payload, env.GEMINI_API_KEY)
    if (!response.ok) {
      // Gemini가 알려주는 실패 사유를 그대로 붙여준다 — 상태 코드만으로는 원인을 못 찾는다.
      // (에러 본문에 API 키가 들어가지는 않는다)
      const detail = await response.text().catch(() => '')
      console.log(`Gemini ${response.status} (${body.action}): ${detail.slice(0, 500)}`)
      return json(
        { error: `Gemini 오류 ${response.status}`, detail: detail.slice(0, 500) },
        response.status,
        cors,
      )
    }

    const data = await response.json()
    return json({ content: extractText(data) }, 200, cors)
  },
}
