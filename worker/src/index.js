/**
 * ToFit AI 프록시 — Cloudflare Worker
 *
 * Groq API 키를 브라우저에 내려보내지 않기 위한 중계 서버다.
 * 키는 Worker 시크릿(GROQ_API_KEY)에만 있고 클라이언트 번들에는 들어가지 않는다.
 *
 * 아무나 이걸 범용 LLM 프록시로 쓰지 못하도록:
 *  - 모델과 시스템 프롬프트를 서버에서 고정한다 (클라이언트는 데이터만 보낸다)
 *  - 허용된 action 두 개(classify / copy) 외에는 거부한다
 *  - max_tokens와 이미지 크기에 상한을 둔다
 *  - CORS를 허용 오리진으로 제한한다
 *
 * 배포: worker/README.md 참고
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const MODELS = {
  vision: 'qwen/qwen3.6-27b',
  reasoning: 'qwen/qwen3.6-27b',
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

/** 429·5xx는 잠깐 기다렸다 다시 시도한다 — Groq 무료 등급은 분당 토큰 한도가 빡빡하다 */
async function callGroqWithRetry(payload, apiKey, attempts = 3) {
  let lastStatus = 0

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) return response
    lastStatus = response.status

    const retriable = response.status === 429 || response.status >= 500
    if (!retriable || attempt === attempts - 1) return response

    // Retry-After를 주면 그걸 따르고, 없으면 0.6s → 1.8s로 늘려가며 기다린다.
    const retryAfter = Number(response.headers.get('Retry-After'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 5000)
      : 600 * 3 ** attempt
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  return new Response(null, { status: lastStatus || 502 })
}

function buildClassifyPayload(body) {
  const imageDataUrl = body.imageDataUrl
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return { error: 'imageDataUrl이 올바르지 않습니다.' }
  }
  if (imageDataUrl.length > MAX_IMAGE_CHARS) {
    return { error: '이미지가 너무 큽니다.' }
  }

  return {
    payload: {
      model: MODELS.vision,
      temperature: 0.3,
      max_tokens: 300,
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '너는 패션 커머스 앱의 옷 사진 분류기다. 사용자가 올린 옷 사진 한 장을 보고 아래 JSON 스키마로만 답한다. ' +
            '설명 문장 없이 JSON 객체 하나만 출력한다.\n' +
            `majorCategory는 다음 중 하나: ${MAJOR_CATEGORIES.join(', ')}\n` +
            `minorCategory는 다음 중 하나: ${MINOR_CATEGORIES.join(', ')}\n` +
            `material은 다음 중 하나: ${MATERIALS.join(', ')}\n` +
            'color는 대표색의 HEX 코드(#rrggbb), colorName은 그 색의 한글 이름(예: "아이보리").\n' +
            '스키마: {"majorCategory":"...","minorCategory":"...","color":"#xxxxxx","colorName":"...","material":"..."}',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '이 옷을 분류해줘.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
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
        `- ${text(item.categoryLabel)}: ${text(item.brand)} ${text(item.name)} (${text(item.colorName)})`,
    )
    .join('\n')

  return {
    payload: {
      model: MODELS.reasoning,
      temperature: 0.2,
      max_tokens: 350,
      // 'low' 이상을 주면 <think>에 토큰을 다 써서 응답이 잘리거나 빈 문구가 나온다.
      // 무료 등급에서 쓸 수 있는 모델(llama-3.3-70b / gpt-oss-120b / qwen3.6-27b)을 모두
      // 비교했을 때 이 조합이 그나마 가장 정확했다. 그래도 틀릴 때가 있어 클라이언트에서
      // 검증 후 규칙 기반 문구로 폴백한다 (src/lib/groq.ts).
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '너는 패션 코디 추천 앱 ToFit의 AI 스타일리스트다. 친근한 존댓말(-해요/-예요체)을 쓴다.\n' +
            '아래 규칙을 반드시 지킨다.\n' +
            '1. 색상은 입력에 적힌 색 이름을 글자 그대로만 쓴다. "아이보리"를 "흰색"으로, ' +
            '"그레이"를 "베이지"로 바꿔 부르지 않는다.\n' +
            '2. 목록에 없는 아이템·브랜드·색을 추가하지 않는다.\n' +
            '3. 퍼스널컬러는 입력에 적힌 이름을 그대로 쓴다. "여름 쿨"을 "봄"으로 바꾸지 않는다.\n' +
            '4. 강수확률은 습도가 아니다. 헷갈리지 말고 입력 그대로 해석한다.\n' +
            '5. 확신이 없으면 그 부분은 언급하지 않는다. 지어내는 것보다 짧은 편이 낫다.\n' +
            '반드시 JSON 객체 하나만 출력한다: ' +
            '{"reason":"2~4문장, 날씨·상황·퍼스널컬러를 근거로 든 추천 이유","mascotComment":"이모지 1개를 포함한 짧은 한 문장, 마스코트가 말하듯 다정하게"}',
        },
        {
          role: 'user',
          content: [
            `상황: ${text(context.situationLabel)}`,
            `날씨: ${text(context.weatherSummary)}`,
            `사용자: ${text(context.nickname)}님, 퍼스널컬러 ${text(context.personalColorLabel)}`,
            '코디 구성:',
            itemList,
          ].join('\n'),
        },
      ],
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
    if (!env.GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY 시크릿이 설정되지 않았습니다.' }, 500, cors)
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

    const response = await callGroqWithRetry(built.payload, env.GROQ_API_KEY)
    if (!response.ok) {
      // Groq가 알려주는 실패 사유를 그대로 붙여준다 — 상태 코드만으로는 원인을 못 찾는다.
      // (에러 본문에 API 키가 들어가지는 않는다)
      const detail = await response.text().catch(() => '')
      console.log(`Groq ${response.status} (${body.action}): ${detail.slice(0, 500)}`)
      return json(
        { error: `Groq 오류 ${response.status}`, detail: detail.slice(0, 500) },
        response.status,
        cors,
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? null
    return json({ content }, 200, cors)
  },
}
