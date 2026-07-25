# 프로젝트
- 이름: ToFit
- 빌드 도구: **Vite** (Next.js·CRA·Webpack 설정을 도입하지 말 것)
- 프레임워크: **React 19 + TypeScript** (`--template react-ts`로 생성)
- Firebase: Authentication, Firestore, Hosting
- 패키지 매니저: npm (pnpm·yarn 사용 금지)

# 명령어
- 개발 서버: `npm run dev` (http://localhost:5173)
- 빌드: `npm run build` → 출력 폴더는 **dist/**
- 미리보기: `npm run preview`
- 린트: `npm run lint`
- 에뮬레이터: `firebase emulators:start`
- 배포: `npm run build && firebase deploy --only hosting`

# Vite / React 규칙
- 환경 변수는 **`VITE_` 접두사**가 붙어야 클라이언트에서 읽힌다. `process.env` 대신 `import.meta.env`를 쓴다
- 경로 별칭은 `vite.config.ts`의 resolve.alias에만 정의한다
- 파일 확장자는 `.tsx`(컴포넌트) / `.ts`(로직)로 통일한다
- 서버 컴포넌트, `getServerSideProps`, `app/` 라우팅은 이 프로젝트에 존재하지 않는다
- 라우팅이 필요하면 react-router-dom을 쓴다

# Firebase 규칙
- 초기화 코드는 `src/lib/firebase.ts` 한 곳에만 둔다. 다른 파일에서 initializeApp 호출 금지
- 설정값은 `.env.local`의 `VITE_FIREBASE_*`를 읽는다. 하드코딩 금지
- 서비스 계정 키(JSON)는 저장소에 절대 추가하지 않는다
- 보안 규칙을 수정하면 배포 전에 반드시 에뮬레이터로 검증한다
- 프로덕션 데이터를 삭제·수정하는 작업은 먼저 나에게 확인을 받는다

# 코드 탐색 (Graphify)
- 아키텍처나 "이 기능 어디 있냐" 류의 질문은 파일을 훑기 전에
  `graphify-out/GRAPH_REPORT.md`를 먼저 읽는다
- 정밀 추적이 필요하면 `/graphify query`, `/graphify path`를 쓴다

# 코드 스타일
- TypeScript strict 모드, `any` 금지
- 컴포넌트는 함수형, 파일당 하나
- 상태 관리는 별도 라이브러리 없이 useState / useContext로 해결

# 작업 방식
- 파일 3개 이상을 고치는 작업은 먼저 계획을 보여준다
- 추측하지 말고 실제 파일을 읽어서 확인한다
- 커밋 메시지는 한국어로 쓴다
- 주석이나 안내, 설명은 한국어로 한다