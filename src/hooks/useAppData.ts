import { use } from 'react'
import { AppDataContext } from '@/contexts/app-data-context'

export function useAppData() {
  const context = use(AppDataContext)
  if (!context) throw new Error('useAppData 는 AppDataProvider 안에서만 쓸 수 있습니다.')
  return context
}
