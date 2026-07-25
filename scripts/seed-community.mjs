/**
 * 커뮤니티 초기 시드 스크립트 (1회 실행용).
 * 실제 Firebase Auth 계정을 만들고 그 계정으로 실제 Firestore 문서를 쓴다 —
 * 서비스 계정 키 없이, 보안 규칙을 그대로 통과하는 "진짜" 데이터를 생성한다.
 * 실행 후에는 삭제해도 되는 파일이다 (앱 코드가 아님).
 */
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { arrayUnion, doc, getFirestore, increment, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    }),
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

const AVATAR_COLORS = ['#a0b1f5', '#f4a4b5', '#f3c98b', '#9ecfc4', '#bfa8e8', '#8fb8e8']
const PASSWORD = 'ToFitSeed!2026'

const SEEDS = [
  {
    nickname: 'jin.wear',
    email: 'seed.jinwear@tofit-app-seed.com',
    height: 178, weight: 68, bodyShape: 'STRAIGHT', personalColor: 'AUTUMN_WARM',
    styleTags: ['CASUAL', 'AMEKAJI'],
    post: {
      title: '제주 3박 4일 짐',
      content: '상의 3, 하의 2로 다 돌려 입었어요. 트렌치 하나면 아침저녁 일교차 걱정 없더라고요.',
      hashtags: ['여행룩', '제주도', '패킹'],
      outfitPhotoTheme: 'TRAVEL_SUNNY',
    },
  },
  {
    nickname: 'minji.daily',
    email: 'seed.minjidaily@tofit-app-seed.com',
    height: 164, weight: 51, bodyShape: 'NATURAL', personalColor: 'SUMMER_COOL',
    styleTags: ['MINIMAL', 'CASUAL', 'CHIC'],
    post: {
      title: '봄 출근룩 기록',
      content: '트렌치 꺼냈어요. 아직 아침엔 쌀쌀하네요. 스니커즈로 캐주얼하게 풀었어요.',
      hashtags: ['봄코디', '출근룩', '데일리룩'],
      outfitPhotoTheme: 'OFFICE_MORNING',
    },
  },
  {
    nickname: 'soyoon',
    email: 'seed.soyoon@tofit-app-seed.com',
    height: 165, weight: 50, bodyShape: 'NATURAL', personalColor: 'SUMMER_COOL',
    styleTags: ['MINIMAL', 'CHIC'],
    post: {
      title: '트렌치 데일리',
      content: '카멜 트렌치에 화이트 이너, 봄엔 이게 최고예요. 어디에나 잘 어울려요.',
      hashtags: ['트렌치코트', '봄코디'],
      outfitPhotoTheme: 'STREET_DAY',
    },
  },
  {
    nickname: 'luv.daily',
    email: 'seed.luvdaily@tofit-app-seed.com',
    height: 160, weight: 48, bodyShape: 'WAVE', personalColor: 'SPRING_WARM',
    styleTags: ['LOVELY', 'MINIMAL'],
    post: {
      title: '셔츠 + 슬랙스',
      content: '무난한데 실패 없는 조합이라 자주 입어요. 셔츠 하나로 분위기가 달라지는 것 같아요.',
      hashtags: ['셔츠코디', '오피스룩', '미니멀'],
      outfitPhotoTheme: 'CASUAL_INDOOR',
    },
  },
  {
    nickname: 'chae_style',
    email: 'seed.chaestyle@tofit-app-seed.com',
    height: 166, weight: 49, bodyShape: 'WAVE', personalColor: 'WINTER_COOL',
    styleTags: ['CHIC', 'STREET'],
    post: {
      title: '레더 재킷 + 플리츠',
      content: '조금 힘준 날. 부츠까지 맞췄어요. 블랙 톤으로 통일하니 안정감 있더라고요.',
      hashtags: ['레더재킷', '플리츠스커트', '시크'],
      outfitPhotoTheme: 'DATE_EVENING',
    },
  },
  {
    nickname: 'haru.log',
    email: 'seed.harulog@tofit-app-seed.com',
    height: 163, weight: 52, bodyShape: 'NATURAL', personalColor: 'AUTUMN_WARM',
    styleTags: ['CASUAL', 'MINIMAL'],
    post: {
      title: '캠퍼스 니트룩',
      content: '니트 하나로 버티는 중간 계절. 편한 게 최고예요.',
      hashtags: ['캠퍼스룩', '니트', '데일리룩'],
      outfitPhotoTheme: 'CAMPUS_AUTUMN',
    },
  },
]

async function ensureAccount(seed, index) {
  try {
    await createUserWithEmailAndPassword(auth, seed.email, PASSWORD)
    console.log(`계정 생성: ${seed.nickname}`)
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      await signInWithEmailAndPassword(auth, seed.email, PASSWORD)
      console.log(`기존 계정 로그인: ${seed.nickname}`)
    } else {
      throw e
    }
  }
  const uid = auth.currentUser.uid
  const now = new Date().toISOString()

  await setDoc(doc(db, 'users', uid), {
    id: uid,
    email: seed.email,
    nickname: seed.nickname,
    gender: 'UNISEX',
    height: seed.height,
    weight: seed.weight,
    personalColor: seed.personalColor,
    bodyShape: seed.bodyShape,
    preferredStyles: seed.styleTags,
    colorPalette: [],
    onboarded: true,
    following: [],
    createdAt: now,
    updatedAt: now,
  })

  await setDoc(doc(db, 'publicProfiles', uid), {
    uid,
    nickname: seed.nickname,
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    height: seed.height,
    weight: seed.weight,
    bodyShape: seed.bodyShape,
    personalColor: seed.personalColor,
    styleTags: seed.styleTags,
    stats: { wearCount: 0, closetCount: 0, closetUtilization: 0, savedOutfitCount: 0, activityScore: 0 },
    updatedAt: now,
  })

  const postId = `seed_post_${index}`
  await setDoc(doc(db, 'posts', postId), {
    id: postId,
    authorId: uid,
    authorNickname: seed.nickname,
    authorAvatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    title: seed.post.title,
    content: seed.post.content,
    hashtags: seed.post.hashtags,
    outfitPhotoTheme: seed.post.outfitPhotoTheme,
    likedBy: [],
    likeCount: 0,
    commentCount: Math.floor(Math.random() * 15) + 3,
    viewCount: Math.floor(Math.random() * 2000) + 500,
    createdAt: new Date(Date.now() - index * 86400_000).toISOString(),
  })

  await signOut(auth)
  return { uid, postId }
}

const created = []
for (let i = 0; i < SEEDS.length; i += 1) {
  created.push(await ensureAccount(SEEDS[i], i))
}

// 서로 다른 계정끼리 좋아요를 눌러 자연스러운 인기도를 만든다
for (let i = 0; i < SEEDS.length; i += 1) {
  await signInWithEmailAndPassword(auth, SEEDS[i].email, PASSWORD)
  const uid = auth.currentUser.uid
  for (let j = 0; j < created.length; j += 1) {
    if (j === i) continue
    // 계정마다 다른 글을 좋아요 눌러 자연스러운 분포를 만든다
    if ((i + j) % 2 === 0) {
      const postRef = doc(db, 'posts', created[j].postId)
      await updateDoc(postRef, { likedBy: arrayUnion(uid), likeCount: increment(1) })
    }
  }
  await signOut(auth)
  console.log(`좋아요 반영: ${SEEDS[i].nickname}`)
}

console.log('시드 완료')
process.exit(0)
