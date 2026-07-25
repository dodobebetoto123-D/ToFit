import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { majorCategoryLabel, minorCategoryLabel } from '@/lib/labels'
import { fromNow } from '@/lib/utils'
import {
  addCommentDoc,
  deleteCommentDoc,
  incrementPostViewCount,
  subscribeComments,
} from '@/services/firestoreCommunity'
import type { CommunityPost, PostComment } from '@/types'
import { PostPhoto } from './PostPhoto'

interface PostDetailModalProps {
  post: CommunityPost | null
  onClose: () => void
  currentUserId: string | null
  currentUserNickname: string
  currentUserAvatarColor: string
  onToggleLike: (postId: string) => void
  onDelete: (postId: string) => void
}

export function PostDetailModal({
  post,
  onClose,
  currentUserId,
  currentUserNickname,
  currentUserAvatarColor,
  onToggleLike,
  onDelete,
}: PostDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (post && !dialog.open) dialog.showModal()
    if (!post && dialog.open) dialog.close()
  }, [post])

  useEffect(() => {
    if (!post) {
      setComments([])
      return
    }
    void incrementPostViewCount(post.id)
    return subscribeComments(post.id, setComments)
    // post 객체 전체가 아니라 id에만 반응해야 한다 — post는 매 렌더 새 객체라
    // 전체를 의존성에 두면 조회수를 올릴 때마다 posts 구독이 갱신 → post 참조가
    // 바뀜 → effect가 다시 실행 → 조회수가 또 오르는 무한 루프가 생긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  if (!post) {
    return <dialog ref={dialogRef} className="tf-dialog" onCancel={onClose} onClose={onClose} />
  }

  const isAuthor = currentUserId === post.authorId

  async function handleAddComment() {
    if (!post || !currentUserId || !commentText.trim()) return
    setPosting(true)
    try {
      await addCommentDoc(post.id, {
        authorId: currentUserId,
        authorNickname: currentUserNickname,
        authorAvatarColor: currentUserAvatarColor,
        content: commentText.trim(),
      })
      setCommentText('')
    } finally {
      setPosting(false)
    }
  }

  function handleDeleteComment(commentId: string) {
    if (!post) return
    void deleteCommentDoc(post.id, commentId)
  }

  function handleDeletePost() {
    if (!post) return
    if (!window.confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) return
    onDelete(post.id)
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="tf-dialog tf-postdetail" onCancel={onClose} onClose={onClose}>
      <header className="tf-dialog__head">
        <h2 className="tf-title">게시글</h2>
        <button type="button" className="tf-icon-btn" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="tf-dialog__body">
        <div className="tf-postdetail__media">
          {post.photoUrl ? (
            <img src={post.photoUrl} alt={post.title} className="tf-postdetail__photo" />
          ) : (
            <PostPhoto theme={post.outfitPhotoTheme} />
          )}
        </div>

        <div className="tf-postdetail__author">
          <Avatar nickname={post.authorNickname} color={post.authorAvatarColor} size={32} />
          <div className="tf-postdetail__author-info">
            <p className="tf-postcard__nickname">{post.authorNickname}</p>
            <p className="tf-micro">{fromNow(post.createdAt)} · 조회 {post.viewCount}</p>
          </div>
          {isAuthor && (
            <Button variant="ghost" size="sm" onClick={handleDeletePost}>
              삭제
            </Button>
          )}
        </div>

        <h3 className="tf-postdetail__title">{post.title}</h3>
        <p className="tf-postdetail__content">{post.content}</p>
        <p className="tf-postcard__tags">{post.hashtags.map((tag) => `#${tag}`).join(' ')}</p>

        {post.outfitSlots && post.outfitSlots.length > 0 && (
          <div className="tf-postdetail__outfit">
            <h4 className="tf-subtitle">착용한 옷 정보</h4>
            <ul className="tf-outfititems">
              {post.outfitSlots.map((slot) => (
                <li key={slot.id} className="tf-outfititem">
                  <span className="tf-outfititem__swatch" style={{ background: slot.color }} aria-hidden="true" />
                  <div className="tf-outfititem__info">
                    <p className="tf-micro">{slot.brand}</p>
                    <p className="tf-outfititem__name">{slot.name}</p>
                    <p className="tf-caption">
                      {slot.colorName} · {majorCategoryLabel[slot.majorCategory]} ·{' '}
                      {minorCategoryLabel[slot.minorCategory]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="tf-stat tf-postdetail__like"
          onClick={() => onToggleLike(post.id)}
          aria-pressed={post.liked}
        >
          <Icon name={post.liked ? 'heart-filled' : 'heart'} size={17} />
          좋아요 {post.likeCount}
        </button>

        <div className="tf-postdetail__comments">
          <h4 className="tf-subtitle">댓글 {comments.length}</h4>
          {comments.length === 0 ? (
            <p className="tf-caption">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
          ) : (
            <ul className="tf-commentlist">
              {comments.map((comment) => (
                <li key={comment.id} className="tf-comment">
                  <Avatar nickname={comment.authorNickname} color={comment.authorAvatarColor} size={26} />
                  <div className="tf-comment__body">
                    <p className="tf-comment__meta">
                      <span className="tf-comment__nickname">{comment.authorNickname}</span>
                      <span className="tf-micro">{fromNow(comment.createdAt)}</span>
                    </p>
                    <p className="tf-comment__content">{comment.content}</p>
                  </div>
                  {(currentUserId === comment.authorId || isAuthor) && (
                    <button
                      type="button"
                      className="tf-icon-btn tf-comment__delete"
                      onClick={() => handleDeleteComment(comment.id)}
                      aria-label="댓글 삭제"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {currentUserId && (
            <div className="tf-comment-form">
              <input
                className="tf-input"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="댓글을 남겨보세요"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleAddComment()
                }}
              />
              <Button size="sm" onClick={handleAddComment} disabled={posting || !commentText.trim()}>
                등록
              </Button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
