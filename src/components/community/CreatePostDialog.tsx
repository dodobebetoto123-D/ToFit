import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { fileToVisionDataUrl } from '@/lib/image'
import { OUTFIT_PHOTO_THEMES, type CommunityPost, type OutfitPhotoTheme, type SavedOutfit } from '@/types'
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
      'id' | 'likedBy' | 'likeCount' | 'commentCount' | 'viewedBy' | 'viewCount' | 'liked' | 'createdAt'
    >,
  ) => void
  authorId: string
  authorNickname: string
  authorAvatarColor: string
  /** 첨부할 수 있는 내가 저장한 코디 목록 — 옷 정보를 게시글에 붙일 때 쓴다 */
  savedOutfits: SavedOutfit[]
}

export function CreatePostDialog({
  open,
  onClose,
  onSubmit,
  authorId,
  authorNickname,
  authorAvatarColor,
  savedOutfits,
}: CreatePostDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [theme, setTheme] = useState<OutfitPhotoTheme>('CASUAL_INDOOR')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function handlePhoto(file: File) {
    setUploadingPhoto(true)
    try {
      const dataUrl = await fileToVisionDataUrl(file, 720)
      setPhotoUrl(dataUrl)
    } catch {
      setError('사진을 불러오지 못했어요. 다시 시도해 주세요.')
    } finally {
      setUploadingPhoto(false)
    }
  }

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

    const selectedOutfit = savedOutfits.find((outfit) => outfit.id === selectedOutfitId)

    onSubmit({
      authorId,
      authorNickname,
      authorAvatarColor,
      title: title.trim(),
      content: content.trim(),
      hashtags,
      outfitPhotoTheme: theme,
      photoUrl,
      outfitSlots: selectedOutfit?.coordinate.slots,
    })

    setTitle('')
    setContent('')
    setHashtagsInput('')
    setPhotoUrl(undefined)
    setSelectedOutfitId(null)
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
          {photoUrl ? (
            <img src={photoUrl} alt="업로드한 착장 사진" className="tf-createpost__photo" />
          ) : (
            <PostPhoto theme={theme} />
          )}
        </div>

        <fieldset className="tf-field">
          <legend>착장 사진</legend>
          <label className="tf-uploader">
            <Icon name="camera" size={18} />
            <span>{uploadingPhoto ? '사진을 불러오는 중...' : '사진 업로드'}</span>
            <input
              type="file"
              accept="image/*"
              className="tf-sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handlePhoto(file)
              }}
            />
          </label>
          {photoUrl && (
            <button
              type="button"
              className="tf-textlink"
              onClick={() => setPhotoUrl(undefined)}
            >
              사진 제거하고 테마로 돌아가기
            </button>
          )}
        </fieldset>

        {!photoUrl && (
          <fieldset className="tf-field">
            <legend>사진 테마 (사진을 안 올리면 이 일러스트로 대체돼요)</legend>
            <div className="tf-chipset">
              {OUTFIT_PHOTO_THEMES.map((value) => (
                <Chip key={value} size="sm" selected={theme === value} onClick={() => setTheme(value)}>
                  {THEME_LABEL[value]}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        {savedOutfits.length > 0 && (
          <fieldset className="tf-field">
            <legend>옷 정보 첨부 (선택)</legend>
            <div className="tf-chipset tf-chipset--wrap">
              <Chip size="sm" selected={selectedOutfitId === null} onClick={() => setSelectedOutfitId(null)}>
                첨부 안 함
              </Chip>
              {savedOutfits.map((outfit) => (
                <Chip
                  key={outfit.id}
                  size="sm"
                  selected={selectedOutfitId === outfit.id}
                  onClick={() => setSelectedOutfitId(outfit.id)}
                >
                  {outfit.coordinate.styleName}
                </Chip>
              ))}
            </div>
            <p className="tf-micro">첨부하면 게시글에서 브랜드·색상 등 옷 정보를 볼 수 있어요.</p>
          </fieldset>
        )}

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
