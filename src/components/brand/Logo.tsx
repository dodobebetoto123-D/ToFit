import logoWordmark from '@/assets/logo-6.png'
import { cn } from '@/lib/utils'
import { Mascot } from './Mascot'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  /** 마스코트를 로고 옆에 함께 노출할지 */
  withMascot?: boolean
  className?: string
}

const LOGO_HEIGHT = { sm: 22, md: 28, lg: 40 } as const
const MASCOT_SIZE = { sm: 26, md: 34, lg: 48 } as const

export function Logo({ size = 'md', withMascot = true, className }: LogoProps) {
  return (
    <span className={cn('tf-logo', className)}>
      <img src={logoWordmark} alt="ToFit" className="tf-logo__word" style={{ height: LOGO_HEIGHT[size] }} />
      {withMascot && <Mascot size={MASCOT_SIZE[size]} className="tf-logo__mascot" />}
    </span>
  )
}
