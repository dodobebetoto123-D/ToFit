/**
 * publicProfiles 컬렉션 기반 — 스타일 트윈 매칭 · 활동 랭킹.
 * 사용자 규모가 크지 않은 MVP 단계라 클라이언트에서 전체를 받아 계산한다.
 */
import {
  collection,
  doc as docRef,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BodyShape, PersonalColor, PublicProfile, StyleTwin } from '@/types'

function publicProfilesCollection() {
  return collection(db!, 'publicProfiles')
}

/**
 * Firestore 문서가 프로필 저장 도중(레이스) 또는 스키마 변경 이전에 만들어졌을 수 있어
 * 필드별로 방어적으로 채운다. 문서 ID를 uid의 최종 근거로 삼는다.
 */
function normalizeProfile(doc: { id: string; data: () => DocumentData | undefined }): PublicProfile {
  const raw = doc.data() as Partial<PublicProfile>
  return {
    uid: doc.id,
    nickname: raw.nickname ?? '',
    avatarColor: raw.avatarColor ?? '#a0b1f5',
    height: raw.height ?? 0,
    weight: raw.weight ?? 0,
    bodyShape: (raw.bodyShape ?? 'NATURAL') as BodyShape,
    personalColor: (raw.personalColor ?? 'SUMMER_COOL') as PersonalColor,
    styleTags: Array.isArray(raw.styleTags) ? raw.styleTags : [],
    stats: raw.stats ?? {
      wearCount: 0,
      closetCount: 0,
      closetUtilization: 0,
      savedOutfitCount: 0,
      activityScore: 0,
    },
    updatedAt: raw.updatedAt ?? '',
  }
}

/** 닉네임조차 없는 문서는 저장 중 끊긴 불완전한 레코드다 — 매칭·랭킹 노출 대상에서 제외한다 */
function isDisplayable(profile: PublicProfile): boolean {
  return profile.nickname.trim().length > 0
}

export async function fetchAllPublicProfiles(): Promise<PublicProfile[]> {
  const snap = await getDocs(publicProfilesCollection())
  return snap.docs.map(normalizeProfile).filter(isDisplayable)
}

/** uid 목록으로 공개 프로필을 가져온다 — "팔로잉" 목록 화면에 쓴다 */
export async function fetchPublicProfilesByIds(uids: string[]): Promise<PublicProfile[]> {
  const snaps = await Promise.all(uids.map((uid) => getDoc(docRef(db!, 'publicProfiles', uid))))
  return snaps
    .filter((snap) => snap.exists())
    .map((snap) => normalizeProfile(snap))
    .filter(isDisplayable)
}

/**
 * 공개 프로필 전체 실시간 구독 — 닉네임 조회 디렉터리에 쓴다.
 * 정렬을 걸지 않아 stats가 아직 없는 문서도 빠짐없이 들어온다.
 */
export function subscribeAllPublicProfiles(onChange: (profiles: PublicProfile[]) => void) {
  return onSnapshot(publicProfilesCollection(), (snap) =>
    onChange(snap.docs.map(normalizeProfile).filter(isDisplayable)),
  )
}

/** 활동 랭킹 실시간 구독 — activityScore 내림차순 */
export function subscribeActivityRanking(onChange: (profiles: PublicProfile[]) => void) {
  const q = query(publicProfilesCollection(), orderBy('stats.activityScore', 'desc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(normalizeProfile).filter(isDisplayable)))
}

/** 키·몸무게·골격형·퍼스널컬러·스타일태그로 코사인 유사도 근사치를 계산한다 (0~1) */
export function computeSimilarity(me: PublicProfile, other: PublicProfile): number {
  const heightSim = Math.max(0, 1 - Math.abs(me.height - other.height) / 30)
  const weightSim = Math.max(0, 1 - Math.abs(me.weight - other.weight) / 30)
  const bodyShapeSim = me.bodyShape === other.bodyShape ? 1 : 0.3
  const colorSim = me.personalColor === other.personalColor ? 1 : 0.3

  const myTags = new Set(me.styleTags ?? [])
  const otherTags = new Set(other.styleTags ?? [])
  const union = new Set([...myTags, ...otherTags])
  const intersectionSize = [...myTags].filter((tag) => otherTags.has(tag)).length
  const styleSim = union.size === 0 ? 0.5 : intersectionSize / union.size

  return heightSim * 0.25 + weightSim * 0.2 + bodyShapeSim * 0.25 + colorSim * 0.1 + styleSim * 0.2
}

export async function fetchStyleTwins(me: PublicProfile, topN = 10): Promise<StyleTwin[]> {
  const all = await fetchAllPublicProfiles()
  return all
    .filter((p) => p.uid !== me.uid)
    .map((p) => ({
      id: p.uid,
      nickname: p.nickname,
      avatarColor: p.avatarColor,
      height: p.height,
      weight: p.weight,
      bodyShape: p.bodyShape,
      styleTags: p.styleTags,
      similarity: computeSimilarity(me, p),
      following: false,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
}
