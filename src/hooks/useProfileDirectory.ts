/**
 * uid → 현재 닉네임 · 아바타색 조회 디렉터리.
 *
 * 게시글·댓글에는 작성 시점의 닉네임이 복사 저장돼 있어, 닉네임을 바꿔도 예전 글에는
 * 옛 이름이 남는다. 화면에 그릴 때 이 디렉터리로 publicProfiles의 현재 값을 덮어써서
 * 모든 노출 지점이 항상 최신 닉네임을 보여주게 한다.
 *
 * publicProfiles 구독은 모듈 단위로 한 번만 열고 모든 컴포넌트가 공유한다.
 */
import { useSyncExternalStore } from 'react'
import { isFirebaseConfigured } from '@/lib/firebase'
import { subscribeAllPublicProfiles } from '@/services/firestoreTwins'

export interface DirectoryEntry {
  nickname: string
  avatarColor: string
}

type Directory = Readonly<Record<string, DirectoryEntry>>

const EMPTY: Directory = {}

let directory: Directory = EMPTY
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

function startSubscription() {
  if (unsubscribe || !isFirebaseConfigured) return
  unsubscribe = subscribeAllPublicProfiles((profiles) => {
    const next: Record<string, DirectoryEntry> = {}
    for (const profile of profiles) {
      next[profile.uid] = { nickname: profile.nickname, avatarColor: profile.avatarColor }
    }
    directory = next
    for (const listener of listeners) listener()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  startSubscription()
  return () => {
    listeners.delete(listener)
    // 구독은 유지한다 — 페이지를 오갈 때마다 끊었다 붙이면 캐시가 비어 닉네임이 잠깐 깜빡인다.
  }
}

function getSnapshot(): Directory {
  return directory
}

export interface ProfileDirectory {
  /** 저장된 닉네임 대신 현재 닉네임을 돌려준다. 프로필을 못 찾으면 저장값을 그대로 쓴다. */
  nicknameOf: (uid: string, fallback: string) => string
  avatarColorOf: (uid: string, fallback: string) => string
}

export function useProfileDirectory(): ProfileDirectory {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    nicknameOf: (uid, fallback) => current[uid]?.nickname || fallback,
    avatarColorOf: (uid, fallback) => current[uid]?.avatarColor || fallback,
  }
}
