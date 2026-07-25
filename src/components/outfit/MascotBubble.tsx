import { Mascot } from '@/components/brand/Mascot'

interface MascotBubbleProps {
  message: string
  mood?: 'default' | 'happy' | 'thinking'
}

/** 마스코트가 한마디 건네는 말풍선. 추천 결과·빈 상태에서 공통으로 쓴다. */
export function MascotBubble({ message, mood = 'happy' }: MascotBubbleProps) {
  return (
    <div className="tf-bubble">
      <Mascot size={46} mood={mood} floating />
      <p className="tf-bubble__text">{message}</p>
    </div>
  )
}
