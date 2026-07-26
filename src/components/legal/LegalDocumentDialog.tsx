/**
 * 약관 전문 보기 모달 — 회원가입 동의 단계의 "보기" 버튼에서 쓴다.
 * 설정 화면에서는 전용 페이지(/legal)를 쓰므로 이 모달은 가입 흐름 전용이다.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  fetchLegalDocument,
  formatEffectiveDate,
  type LegalDocumentMeta,
} from '@/services/legal'
import { MarkdownText } from './MarkdownText'

interface LegalDocumentDialogProps {
  doc: LegalDocumentMeta | null
  onClose: () => void
}

export function LegalDocumentDialog({ doc, onClose }: LegalDocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (doc && !dialog.open) dialog.showModal()
    if (!doc && dialog.open) dialog.close()
  }, [doc])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    setBody(null)
    setError(null)
    fetchLegalDocument(doc)
      .then((text) => {
        if (!cancelled) setBody(text)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '불러오지 못했어요.')
      })
    return () => {
      cancelled = true
    }
  }, [doc])

  return (
    <dialog ref={dialogRef} className="tf-dialog tf-legaldialog" onCancel={onClose} onClose={onClose}>
      <header className="tf-dialog__head">
        <div>
          <h2 className="tf-title">{doc?.title ?? '약관'}</h2>
          {doc && (
            <p className="tf-micro">
              v{doc.version} · {formatEffectiveDate(doc.effectiveDate)} 시행
            </p>
          )}
        </div>
        <button type="button" className="tf-icon-btn" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="tf-dialog__body">
        {error ? (
          <p className="tf-error" role="alert">
            {error}
          </p>
        ) : body === null ? (
          <p className="tf-caption">불러오는 중이에요…</p>
        ) : (
          <MarkdownText markdown={body} />
        )}
      </div>
    </dialog>
  )
}
