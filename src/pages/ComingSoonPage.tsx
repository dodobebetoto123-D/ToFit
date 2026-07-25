import { Link } from 'react-router-dom'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Button } from '@/components/ui/Button'

interface ComingSoonPageProps {
  title: string
  description: string
  /** 이 화면이 어떤 기능으로 이어지는지 */
  planned: string[]
}

/** 아직 구현하지 않은 메뉴. 무엇이 준비 중인지 솔직하게 보여준다. */
export function ComingSoonPage({ title, description, planned }: ComingSoonPageProps) {
  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">{title}</h1>
          <p className="tf-caption">{description}</p>
        </div>
      </header>

      <div className="tf-empty tf-reveal">
        <MascotBubble message="이 기능은 아직 준비 중이에요. 조금만 기다려 주세요!" mood="thinking" />
        <ul className="tf-guide">
          {planned.map((line) => (
            <li key={line}>
              <span aria-hidden="true">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <Link to="/">
          <Button variant="soft">홈으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  )
}
