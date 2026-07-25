/**
 * users/{uid}/savedOutfits, users/{uid}/feedbacks 서브컬렉션.
 */
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createId } from '@/lib/utils'
import type { Coordinate, OutfitFeedback, SavedOutfit } from '@/types'

function savedOutfitsCollection(uid: string) {
  return collection(db!, 'users', uid, 'savedOutfits')
}
function feedbacksCollection(uid: string) {
  return collection(db!, 'users', uid, 'feedbacks')
}

export function subscribeSavedOutfits(uid: string, onChange: (items: SavedOutfit[]) => void) {
  const q = query(savedOutfitsCollection(uid), orderBy('savedAt', 'desc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as SavedOutfit)))
}

export async function addSavedOutfitDoc(uid: string, coordinate: Coordinate): Promise<void> {
  const id = createId('saved')
  const saved: SavedOutfit = { id, coordinate, savedAt: new Date().toISOString(), worn: false }
  await setDoc(doc(savedOutfitsCollection(uid), id), saved)
}

export async function removeSavedOutfitDoc(uid: string, savedId: string): Promise<void> {
  await deleteDoc(doc(savedOutfitsCollection(uid), savedId))
}

export async function setSavedOutfitWorn(uid: string, savedId: string, worn: boolean): Promise<void> {
  await updateDoc(doc(savedOutfitsCollection(uid), savedId), { worn })
}

export function subscribeFeedbacks(uid: string, onChange: (items: OutfitFeedback[]) => void) {
  const q = query(feedbacksCollection(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as OutfitFeedback)))
}

export async function addFeedbackDoc(
  uid: string,
  feedback: Omit<OutfitFeedback, 'id' | 'createdAt'>,
): Promise<void> {
  const id = createId('fb')
  const full: OutfitFeedback = { ...feedback, id, createdAt: new Date().toISOString() }
  await setDoc(doc(feedbacksCollection(uid), id), full)
}
