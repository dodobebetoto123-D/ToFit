import mascotImage from '@/assets/mascot-tofit.png'
import { cn } from '@/lib/utils'

interface MascotProps {
  size?: number
  /** 마스코트 이미지가 하나뿐이라 현재는 시각적으로 구분하지 않는다 — 표정 에셋이 추가되면 여기서 분기한다 */
  mood?: 'default' | 'happy' | 'thinking'
  /** 위아래로 살짝 떠 있는 모션. 대기 상태 강조가 필요할 때만 켠다. */
  floating?: boolean
  className?: string
}

export function Mascot({ size = 64, floating = false, className }: MascotProps) {
  return (
    <img
      src={mascotImage}
      alt="ToFit 마스코트"
      style={{ width: size, height: size, objectFit: 'contain' }}
      className={cn('tf-mascot-img', floating && 'tf-mascot--floating', className)}
    />
  )
}
