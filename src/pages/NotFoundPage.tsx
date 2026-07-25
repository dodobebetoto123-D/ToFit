import { Link } from 'react-router-dom'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="tf-page">
      <div className="tf-empty tf-reveal">
        <h1 className="tf-display">404</h1>
        <MascotBubble message="찾으시는 페이지가 없어요. 옷장으로 안내해 드릴까요?" mood="thinking" />
        <Link to="/">
          <Button variant="soft">홈으로 가기</Button>
        </Link>
      </div>
    </div>
  )
}
