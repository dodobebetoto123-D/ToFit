/**
 * Firebase 초기화 — 앱 전체에서 이 파일 한 곳에서만 initializeApp 을 호출한다.
 * 다른 파일에서 initializeApp 을 다시 부르지 말 것.
 *
 * 설정값은 `.env.local` 의 VITE_FIREBASE_* 를 읽는다. 하드코딩 금지.
 * 키가 하나라도 비어 있으면 초기화를 건너뛰고 `isFirebaseConfigured === false` 가 되며,
 * 앱은 목업 데이터로 동작한다. (로컬에서 키 없이도 화면을 볼 수 있게 하기 위함)
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.length > 0,
)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  // ClothingItem.price 같은 선택 필드가 undefined일 때 Firestore가 기본적으로 setDoc을 거부한다.
  // ignoreUndefinedProperties로 그런 필드를 자동으로 제외하게 한다.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true })
} else if (import.meta.env.DEV) {
  console.info(
    '[ToFit] VITE_FIREBASE_* 환경 변수가 없어 Firebase 없이 목업 데이터로 실행합니다. ' +
      '.env.example 을 .env.local 로 복사한 뒤 값을 채우면 실제 연동됩니다.',
  )
}

export const firebaseApp = app
export const auth = authInstance
export const db = dbInstance
