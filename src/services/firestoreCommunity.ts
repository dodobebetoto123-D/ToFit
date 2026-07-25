/**
 * posts 최상위 컬렉션 — 커뮤니티 게시글 (공개, 로그인한 누구나 읽기).
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createId } from '@/lib/utils'
import type { CommunityPost, PostComment, RankingScope } from '@/types'

interface RawPost extends Omit<CommunityPost, 'liked'> {}

function postsCollection() {
  return collection(db!, 'posts')
}

function commentsCollection(postId: string) {
  return collection(db!, 'posts', postId, 'comments')
}

function toPost(raw: RawPost, myUid: string | null): CommunityPost {
  return { ...raw, liked: myUid ? raw.likedBy.includes(myUid) : false }
}

export function subscribePosts(myUid: string | null, onChange: (posts: CommunityPost[]) => void) {
  const q = query(postsCollection(), orderBy('createdAt', 'desc'), fsLimit(100))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toPost(d.data() as RawPost, myUid)))
  })
}

/**
 * 내가 좋아요 누른 게시글 — "찜한 코디" 페이지에서 저장한 코디와 함께 보여준다.
 * array-contains + 다른 필드 orderBy는 복합 색인이 필요해, 정렬은 클라이언트에서 한다.
 */
export function subscribeLikedPosts(uid: string, onChange: (posts: CommunityPost[]) => void) {
  const q = query(postsCollection(), where('likedBy', 'array-contains', uid))
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => toPost(d.data() as RawPost, uid))
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    onChange(posts)
  })
}

/**
 * 인기 코디 랭킹 — 기간별(주간/월간/전체) 좋아요순 상위 N개.
 *
 * Firestore는 range 필터(createdAt >=)를 걸면 그 필드가 반드시 1차 정렬 기준이어야 해서
 * "기간 필터 + 좋아요순 정렬"을 한 쿼리로 할 수 없다. 기간 내 문서를 넉넉히 가져온 뒤
 * 클라이언트에서 좋아요순으로 다시 정렬·절단한다 — 커뮤니티 규모가 클 때는 부정확해질 수 있어
 * FETCH_POOL을 넉넉히 잡는다.
 */
const FETCH_POOL = 300

export function subscribePopularPosts(
  scope: RankingScope,
  myUid: string | null,
  onChange: (posts: CommunityPost[]) => void,
  topN = 20,
) {
  const now = Date.now()
  const sinceMs = scope === 'WEEK' ? now - 7 * 86400_000 : scope === 'MONTH' ? now - 30 * 86400_000 : 0
  const q =
    scope === 'ALL'
      ? query(postsCollection(), orderBy('likeCount', 'desc'), fsLimit(topN))
      : query(
          postsCollection(),
          where('createdAt', '>=', new Date(sinceMs).toISOString()),
          orderBy('createdAt'),
          fsLimit(FETCH_POOL),
        )
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => toPost(d.data() as RawPost, myUid))
    posts.sort((a, b) => b.likeCount - a.likeCount)
    onChange(posts.slice(0, topN))
  })
}

export async function createPostDoc(
  post: Omit<
    CommunityPost,
    'id' | 'likedBy' | 'likeCount' | 'commentCount' | 'viewCount' | 'liked' | 'createdAt'
  >,
): Promise<void> {
  const id = createId('post')
  const full: RawPost = {
    ...post,
    id,
    likedBy: [],
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(postsCollection(), id), full)
}

export async function toggleLikeDoc(postId: string, uid: string, currentlyLiked: boolean): Promise<void> {
  await updateDoc(doc(postsCollection(), postId), {
    likedBy: currentlyLiked ? arrayRemove(uid) : arrayUnion(uid),
    likeCount: increment(currentlyLiked ? -1 : 1),
  })
}

export async function deletePostDoc(postId: string): Promise<void> {
  await deleteDoc(doc(postsCollection(), postId))
}

export async function incrementPostViewCount(postId: string): Promise<void> {
  await updateDoc(doc(postsCollection(), postId), { viewCount: increment(1) })
}

/* ─────────────────────────────────────────────────────────────
   댓글
   ───────────────────────────────────────────────────────────── */

export function subscribeComments(postId: string, onChange: (comments: PostComment[]) => void) {
  const q = query(commentsCollection(postId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as PostComment)))
}

export async function addCommentDoc(
  postId: string,
  comment: Omit<PostComment, 'id' | 'postId' | 'createdAt'>,
): Promise<void> {
  const id = createId('comment')
  const full: PostComment = { ...comment, id, postId, createdAt: new Date().toISOString() }
  await setDoc(doc(commentsCollection(postId), id), full)
  await updateDoc(doc(postsCollection(), postId), { commentCount: increment(1) })
}

export async function deleteCommentDoc(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(commentsCollection(postId), commentId))
  await updateDoc(doc(postsCollection(), postId), { commentCount: increment(-1) })
}
