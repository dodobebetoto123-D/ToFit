/** 설정 > 약관 및 정책 — 이용약관 · 개인정보처리방침 · 오픈소스 라이선스 전문 열람 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MarkdownText } from '@/components/legal/MarkdownText'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Card } from '@/components/ui/Card'
import { SegmentedTabs, type SegmentedOption } from '@/components/ui/SegmentedTabs'
import {
  fetchLegalDocument,
  fetchLegalManifest,
  formatEffectiveDate,
  type LegalDocumentMeta,
} from '@/services/legal'

export function LegalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [docs, setDocs] = useState<LegalDocumentMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 문서 목록을 먼저 받아온다. `?doc=privacy` 로 들어오면 그 문서를 바로 연다.
  useEffect(() => {
    let cancelled = false
    fetchLegalManifest()
      .then((list) => {
        if (cancelled) return
        setDocs(list)
        const requested = searchParams.get('doc')
        const initial = list.find((d) => d.id === requested) ?? list[0]
        setActiveId(initial?.id ?? null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '불러오지 못했어요.')
      })
    return () => {
      cancelled = true
    }
    // 최초 1회만 — 이후 탭 전환은 activeId로 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = docs.find((doc) => doc.id === activeId) ?? null

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setBody(null)
    setError(null)
    fetchLegalDocument(active)
      .then((text) => {
        if (!cancelled) setBody(text)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '불러오지 못했어요.')
      })
    return () => {
      cancelled = true
    }
  }, [active])

  const tabs: ReadonlyArray<SegmentedOption<string>> = docs.map((doc) => ({
    value: doc.id,
    label: doc.title,
  }))

  function handleTabChange(id: string) {
    setActiveId(id)
    searchParams.set('doc', id)
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">약관 및 정책</h1>
          <p className="tf-caption">ToFit을 쓰실 때 적용되는 약속들이에요.</p>
        </div>
      </header>

      {docs.length > 0 && (
        <div className="tf-toolbar tf-reveal">
          <SegmentedTabs
            ariaLabel="문서 선택"
            options={tabs}
            value={activeId ?? ''}
            onChange={handleTabChange}
          />
        </div>
      )}

      <Card className="tf-reveal" icon="📄" title={active?.title ?? '문서'}>
        {active && (
          <p className="tf-caption tf-legal__meta">
            버전 {active.version} · {formatEffectiveDate(active.effectiveDate)} 시행
          </p>
        )}

        {error ? (
          <MascotBubble message={error} mood="thinking" />
        ) : body === null ? (
          <MascotBubble message="문서를 불러오는 중이에요..." mood="thinking" />
        ) : (
          <MarkdownText markdown={body} />
        )}
      </Card>
    </div>
  )
}
