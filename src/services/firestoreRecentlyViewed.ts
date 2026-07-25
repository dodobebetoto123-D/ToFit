/**
 * users/{uid}/recentlyViewed 서브컬렉션 — 브랜드 검색결과 링크를 클릭한 상품 기록.
 * "최근 본 상품" 페이지에서 보여준다.
 */
import { collection, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { hashString } from '@/lib/utils'
import type { RecentlyViewedItem } from '@/types'

function recentlyViewedCollection(uid: string) {
  return collection(db!, 'users', uid, 'recentlyViewed')
}

export function subscribeRecentlyViewed(
  uid: string,
  onChange: (items: RecentlyViewedItem[]) => void,
) {
  const q = query(recentlyViewedCollection(uid), orderBy('viewedAt', 'desc'), limit(50))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as RecentlyViewedItem)))
}

/** 같은 상품을 다시 클릭하면 문서를 덮어써 조회시각만 갱신한다 (중복 항목 방지) */
export async function trackRecentlyViewed(
  uid: string,
  item: Omit<RecentlyViewedItem, 'id' | 'viewedAt'>,
): Promise<void> {
  const id = `item_${Math.abs(hashString(`${item.brand}_${item.name}_${item.searchUrl}`))}`
  const full: RecentlyViewedItem = { ...item, id, viewedAt: new Date().toISOString() }
  await setDoc(doc(recentlyViewedCollection(uid), id), full)
}
