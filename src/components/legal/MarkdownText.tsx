/**
 * 약관 문서 전용 초경량 마크다운 렌더러.
 *
 * 별도 라이브러리를 들이지 않기 위해 약관에 실제로 쓰는 문법만 처리한다 —
 * 제목(##/###), 문단, 목록(-), 표(|), 코드블록(```), 구분선(---),
 * 인라인 **굵게** 와 `코드`.
 */
import { Fragment, type ReactNode } from 'react'

type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/** 표 구분선(| --- | --- |)인지 */
function isDivider(line: string): boolean {
  return /^\|[\s|:-]+\|$/.test(line.trim())
}

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flushParagraph()
      continue
    }

    if (trimmed.startsWith('```')) {
      flushParagraph()
      const body: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i])
        i += 1
      }
      blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }

    if (trimmed === '---') {
      flushParagraph()
      blocks.push({ kind: 'hr' })
      continue
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph()
      blocks.push({ kind: 'heading', level: 3, text: trimmed.slice(4) })
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph()
      blocks.push({ kind: 'heading', level: 2, text: trimmed.slice(3) })
      continue
    }

    if (trimmed.startsWith('|') && isDivider(lines[i + 1] ?? '')) {
      flushParagraph()
      const header = splitRow(trimmed)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i].trim()))
        i += 1
      }
      i -= 1
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    // 들여쓴 하위 항목도 같은 목록으로 묶는다.
    if (/^[-*] /.test(trimmed)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*] /, ''))
        i += 1
      }
      i -= 1
      blocks.push({ kind: 'list', ordered: false, items })
      continue
    }

    // 번호 목록 — 약관 조문의 "1. 2. 3." 이 한 문단으로 뭉치지 않게 따로 잡는다.
    if (/^\d+\. /.test(trimmed)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\. /, ''))
        i += 1
      }
      i -= 1
      blocks.push({ kind: 'list', ordered: true, items })
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  return blocks
}

/** **굵게** 와 `코드` 만 처리한다 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export function MarkdownText({ markdown }: { markdown: string }) {
  const blocks = parse(markdown)

  return (
    <div className="tf-markdown">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return block.level === 2 ? (
              <h3 key={index} className="tf-markdown__h2">
                {renderInline(block.text)}
              </h3>
            ) : (
              <h4 key={index} className="tf-markdown__h3">
                {renderInline(block.text)}
              </h4>
            )
          case 'list': {
            const items = block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))
            return block.ordered ? (
              <ol key={index} className="tf-markdown__list tf-markdown__list--ordered">
                {items}
              </ol>
            ) : (
              <ul key={index} className="tf-markdown__list">
                {items}
              </ul>
            )
          }
          case 'table':
            return (
              <div key={index} className="tf-markdown__tablewrap">
                <table className="tf-markdown__table">
                  <thead>
                    <tr>
                      {block.header.map((cell, cellIndex) => (
                        <th key={cellIndex}>{renderInline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'code':
            return (
              <pre key={index} className="tf-markdown__code">
                {block.text}
              </pre>
            )
          case 'hr':
            return <hr key={index} className="tf-markdown__hr" />
          default:
            return (
              <p key={index} className="tf-markdown__p">
                {renderInline(block.text)}
              </p>
            )
        }
      })}
    </div>
  )
}
