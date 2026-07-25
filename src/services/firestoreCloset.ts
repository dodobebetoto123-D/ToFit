/**
 * users/{uid}/clothes 서브컬렉션 — 내 옷장.
 */
import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createId } from '@/lib/utils'
import type { ClothingItem } from '@/types'

function closetCollection(uid: string) {
  return collection(db!, 'users', uid, 'clothes')
}

export function subscribeCloset(uid: string, onChange: (items: ClothingItem[]) => void) {
  const q = query(closetCollection(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as ClothingItem))
  })
}

export async function addClothingItemDoc(
  uid: string,
  item: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>,
): Promise<void> {
  const now = new Date().toISOString()
  const id = createId('cloth')
  const full: ClothingItem = { ...item, id, wearCount: 0, createdAt: now, updatedAt: now }
  await setDoc(doc(closetCollection(uid), id), full)
}

export async function removeClothingItemDoc(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(closetCollection(uid), itemId))
}

export async function updateClothingItemDoc(
  uid: string,
  itemId: string,
  patch: Partial<ClothingItem>,
): Promise<void> {
  await updateDoc(doc(closetCollection(uid), itemId), { ...patch, updatedAt: new Date().toISOString() })
}

/** 코디 착용 처리 — 구성 아이템들의 wearCount를 원자적으로 +1, lastWornAt을 갱신한다 */
export async function markItemsWorn(uid: string, itemIds: string[]): Promise<void> {
  const now = new Date().toISOString()
  await Promise.all(
    itemIds.map((itemId) =>
      updateDoc(doc(closetCollection(uid), itemId), {
        wearCount: increment(1),
        lastWornAt: now,
        updatedAt: now,
      }),
    ),
  )
}
