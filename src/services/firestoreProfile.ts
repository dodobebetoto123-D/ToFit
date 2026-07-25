/**
 * 사용자 프로필 Firestore 계층.
 *
 * users/{uid}          — 비공개 (이메일 포함). 본인만 읽기/쓰기.
 * publicProfiles/{uid} — 공개 (이메일 없음). 스타일 트윈 매칭·랭킹에 쓰인다.
 */
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { hashString } from '@/lib/utils'
import type { PublicProfile, UserProfile } from '@/types'

/** 트윈 카드·아바타에 쓰는 안정적인 색상 팔레트 — uid로 결정된다 */
const AVATAR_COLORS = [
  '#a0b1f5',
  '#f4a4b5',
  '#f3c98b',
  '#9ecfc4',
  '#bfa8e8',
  '#8fb8e8',
  '#f2a874',
  '#7fc9a8',
]

export function avatarColorForUid(uid: string): string {
  return AVATAR_COLORS[Math.abs(hashString(uid)) % AVATAR_COLORS.length]
}

function userDoc(uid: string) {
  return doc(db!, 'users', uid)
}

function publicProfileDoc(uid: string) {
  return doc(db!, 'publicProfiles', uid)
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export function subscribeUserProfile(uid: string, onChange: (profile: UserProfile | null) => void) {
  return onSnapshot(userDoc(uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as UserProfile) : null)
  })
}

/** 비공개 프로필을 저장하고, 매칭·랭킹에 필요한 필드만 공개 프로필에도 함께 반영한다 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(userDoc(profile.id), profile, { merge: true })
  await setDoc(
    publicProfileDoc(profile.id),
    {
      uid: profile.id,
      nickname: profile.nickname,
      avatarColor: avatarColorForUid(profile.id),
      height: profile.height,
      weight: profile.weight,
      bodyShape: profile.bodyShape,
      personalColor: profile.personalColor,
      styleTags: profile.preferredStyles,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

/** 옷장·저장코디 변경 시 랭킹용 활동 점수를 다시 계산해 공개 프로필에 반영한다 */
export async function syncPublicProfileStats(
  uid: string,
  stats: PublicProfile['stats'],
): Promise<void> {
  // uid를 항상 같이 써서, 혹시 이 호출이 문서를 최초로 만드는 경우에도
  // 문서 안에 최소한의 식별 정보는 남긴다 (조회는 문서 ID를 우선 신뢰하지만, 방어적으로).
  await setDoc(
    publicProfileDoc(uid),
    { uid, stats, updatedAt: new Date().toISOString() },
    { merge: true },
  )
}

export function computeActivityScore(stats: Omit<PublicProfile['stats'], 'activityScore'>): number {
  return Math.round(
    stats.wearCount * 2 +
      stats.closetCount +
      stats.savedOutfitCount * 3 +
      stats.closetUtilization * 20,
  )
}
