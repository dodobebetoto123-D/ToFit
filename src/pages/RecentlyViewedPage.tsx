import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MascotBubble } from '@/components/outfit/MascotBubble'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { majorCategoryLabel, minorCategoryLabel } from '@/lib/labels'
import { isFirebaseConfigured } from '@/lib/firebase'
import { fromNow, formatPrice } from '@/lib/utils'
import { subscribeRecentlyViewed } from '@/services/firestoreRecentlyViewed'
import type { RecentlyViewedItem } from '@/types'

export function RecentlyViewedPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeRecentlyViewed(user.id, (list) => {
      setItems(list)
      setLoading(false)
    })
  }, [user])

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">최근 본 상품</h1>
          <p className="tf-caption">코디 추천에서 눌러본 브랜드 상품이 여기 쌓여요</p>
        </div>
      </header>

      {loading ? (
        <MascotBubble message="최근 본 상품을 불러오는 중이에요..." mood="thinking" />
      ) : items.length === 0 ? (
        <div className="tf-empty tf-reveal">
          <MascotBubble
            message="아직 눌러본 브랜드 상품이 없어요. 코디 추천에서 마음에 드는 아이템을 찾아보세요!"
            mood="thinking"
          />
          <Link to="/recommend">
            <Button variant="soft" leading={<Icon name="sparkle" size={16} />}>
              코디 추천받으러 가기
            </Button>
          </Link>
        </div>
      ) : (
        <Card className="tf-reveal" icon="🕒" title={`최근 본 상품 ${items.length}개`}>
          <ul className="tf-brandlist tf-stagger">
            {items.map((item) => (
              <li key={item.id} className="tf-brandrow">
                <span
                  className="tf-brandrow__color"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                <div className="tf-brandrow__info">
                  <p className="tf-micro">{item.brand}</p>
                  <p className="tf-brandrow__name">{item.name}</p>
                  <p className="tf-caption">
                    {majorCategoryLabel[item.majorCategory]} · {minorCategoryLabel[item.minorCategory]}{' '}
                    · {fromNow(item.viewedAt)} 조회
                  </p>
                </div>
                {item.price !== undefined && (
                  <div className="tf-brandrow__pricebox">
                    {item.discountRate !== undefined && (
                      <span className="tf-brandrow__discount">
                        추정 {Math.round(item.discountRate * 100)}%
                      </span>
                    )}
                    <span className="tf-brandrow__price">
                      {formatPrice(
                        item.discountRate !== undefined
                          ? Math.round(item.price * (1 - item.discountRate))
                          : item.price,
                      )}
                    </span>
                    {item.discountRate !== undefined && (
                      <span className="tf-brandrow__original">{formatPrice(item.price)}</span>
                    )}
                  </div>
                )}
                <Button as="a" href={item.searchUrl} target="_blank" rel="noopener noreferrer" variant="soft" size="sm">
                  다시 보기
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
