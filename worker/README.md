# ToFit AI 프록시 (Cloudflare Worker)

Gemini API 키를 브라우저에 노출하지 않기 위한 중계 서버입니다.
키는 이 Worker의 시크릿에만 저장되고, 앱에는 Worker 주소만 들어갑니다.

```
브라우저 → Cloudflare Worker (키 보관) → Gemini API
```

## 배포 순서

### 1. Gemini 키 발급

1. https://aistudio.google.com/apikey 접속 (구글 계정 필요, 카드 등록 없음)
2. `Create API key` → 복사해 둡니다

> Gemini API 약관상 **만 18세 이상**만 사용할 수 있습니다.

### 2. Cloudflare 가입

https://dash.cloudflare.com/sign-up — 이메일·비밀번호만 있으면 되고 카드 등록은 필요 없습니다.

### 3. Worker 배포

프로젝트 루트에서:

```bash
cd worker
npx wrangler login      # 브라우저가 열리며 계정 인증
npx wrangler deploy
```

배포가 끝나면 주소가 출력됩니다:

```
https://tofit-ai-proxy.<계정이름>.workers.dev
```

### 4. 키를 시크릿으로 등록

```bash
npx wrangler secret put GEMINI_API_KEY
```

프롬프트가 뜨면 2단계에서 발급받은 **새 키**를 붙여넣습니다.
이 값은 Cloudflare에만 저장되고 코드나 저장소에는 남지 않습니다.

### 5. 앱에 Worker 주소 연결

프로젝트 루트의 `.env.local`을 이렇게 바꿉니다:

```diff
- VITE_GROQ_API_KEY=gsk_...
+ VITE_AI_PROXY_URL=https://tofit-ai-proxy.<계정이름>.workers.dev
```

`VITE_GROQ_API_KEY` 줄은 **지웁니다.** 남겨두면 다시 번들에 박힙니다.

### 6. 재배포

```bash
cd ..
npm run build && firebase deploy --only hosting
```

## 동작 확인

```bash
curl -X POST https://tofit-ai-proxy.<계정이름>.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"action":"copy","context":{"situationLabel":"출근","weatherSummary":"체감 27도, 맑음","personalColorLabel":"여름 쿨","nickname":"민지","items":[{"name":"셔츠","brand":"UNIQLO","colorName":"아이보리","categoryLabel":"상의"}]}}'
```

`{"content":"{\"reason\":...}"}` 형태로 오면 정상입니다.

> 한글이 포함된 요청을 셸에서 `-d '...'`로 보내면 인코딩이 깨져 모델이 `??`를 받습니다.
> 반드시 UTF-8 파일로 저장해 `--data-binary @payload.json`으로 보내세요.

## 안전장치

- 모델과 시스템 프롬프트가 Worker에 고정돼 있어, 범용 LLM 프록시로 악용하기 어렵습니다
- `action`은 `classify`와 `copy` 두 가지만 허용합니다
- `wrangler.toml`의 `ALLOWED_ORIGINS`에 없는 출처는 403으로 막습니다
- 5xx는 Worker가 한 번 재시도합니다. 429는 재시도하지 않고 바로 규칙 기반 문구로 폴백합니다
  (Gemini 무료 등급은 분당 요청 수 제한이 있어, 짧게 재시도해봐야 할당량만 축납니다)
- `responseSchema`로 출력 형식을 강제해, 카테고리·소재는 정해진 값 중에서만 나옵니다

> CORS는 브라우저에서 오는 요청만 막습니다. curl 같은 직접 호출까지 완전히 차단하려면
> Cloudflare 대시보드의 Rate Limiting을 추가로 걸어두세요.

## 주의

`worker/src/index.js`의 `MAJOR_CATEGORIES` · `MINOR_CATEGORIES` · `MATERIALS`는
`src/types/index.ts`의 값과 같아야 합니다. 카테고리를 추가하면 양쪽 모두 고쳐 주세요.
