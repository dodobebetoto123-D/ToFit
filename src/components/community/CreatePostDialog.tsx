import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { OUTFIT_PHOTO_THEMES, type CommunityPost, type OutfitPhotoTheme } from '@/types'
import { PostPhoto } from './PostPhoto'

const THEME_LABEL: Record<OutfitPhotoTheme, string> = {
  STREET_DAY: '거리 스냅',
  OFFICE_MORNING: '출근길',
  CAMPUS_AUTUMN: '캠퍼스',
  DATE_EVENING: '저녁 약속',
  TRAVEL_SUNNY: '여행',
  CASUAL_INDOOR: '실내 캐주얼',
}

interface CreatePostDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (
    post: Omit<
      CommunityPost,
      'id' | 'likedBy' | 'likeCount' | 'commentCount' | 'viewCount' | 'liked' | 'createdAt'
    >,
  ) => void
  authorId: string
  authorNickname: string
  authorAvatarColor: string
}

export function CreatePostDialog({
  open,
  onClose,
  onSubmit,
  authorId,
  authorNickname,
  authorAvatarColor,
}: CreatePostDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [theme, setTheme] = useState<OutfitPhotoTheme>('CASUAL_INDOOR')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    setError(null)

    const hashtags = hashtagsInput
      .split(/[\s,#]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)

    onSubmit({
      authorId,
      authorNickname,
      authorAvatarColor,
      title: title.trim(),
      content: content.trim(),
      hashtags,
      outfitPhotoTheme: theme,
    })

    setTitle('')
    setContent('')
    setHashtagsInput('')
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="tf-dialog" onCancel={onClose} onClose={onClose}>
      <header className="tf-dialog__head">
        <h2 className="tf-title">코디 올리기</h2>
        <button type="button" className="tf-icon-btn" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="tf-dialog__body">
        <div className="tf-createpost__preview">
          <PostPhoto theme={theme} />
        </div>

        <fieldset className="tf-field">
          <legend>사진 테마 (실제 업로드는 추후 지원)</legend>
          <div className="tf-chipset">
            {OUTFIT_PHOTO_THEMES.map((value) => (
              <Chip key={value} size="sm" selected={theme === value} onClick={() => setTheme(value)}>
                {THEME_LABEL[value]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <label className="tf-field">
          <span>제목 *</span>
          <input
            className="tf-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 오늘의 데일리룩"
          />
        </label>

        <label className="tf-field">
          <span>내용 *</span>
          <textarea
            className="tf-input tf-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="코디에 대한 이야기를 들려주세요"
            rows={3}
          />
        </label>

        <label className="tf-field">
          <span>해시태그</span>
          <input
            className="tf-input"
            value={hashtagsInput}
            onChange={(event) => setHashtagsInput(event.target.value)}
            placeholder="예: 오피스룩 데일리룩 (띄어쓰기로 구분)"
          />
        </label>

        {error && (
          <p className="tf-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <footer className="tf-dialog__foot">
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button onClick={handleSubmit} leading={<Icon name="camera" size={16} />}>
          게시하기
        </Button>
      </footer>
    </dialog>
  )
}
