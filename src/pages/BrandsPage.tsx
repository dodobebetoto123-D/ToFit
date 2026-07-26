import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { BRANDS, buildBrandUrl } from '@/lib/brands'
import { styleTagLabel } from '@/lib/labels'
import { STYLE_TAGS, type StyleTag } from '@/types'

export function BrandsPage() {
  const [activeStyle, setActiveStyle] = useState<StyleTag | null>(null)

  const visible = useMemo(
    () => (activeStyle ? BRANDS.filter((brand) => brand.styles.includes(activeStyle)) : BRANDS),
    [activeStyle],
  )

  return (
    <div className="tf-page">
      <header className="tf-pagehead tf-reveal">
        <div>
          <h1 className="tf-display">브랜드 추천</h1>
          <p className="tf-caption">내 스타일에 맞는 브랜드를 무신사 검색결과로 바로 확인해요</p>
        </div>
      </header>

      <div className="tf-chipset tf-reveal">
        <Chip size="sm" selected={activeStyle === null} onClick={() => setActiveStyle(null)}>
          전체
        </Chip>
        {STYLE_TAGS.map((tag) => (
          <Chip
            key={tag}
            size="sm"
            selected={activeStyle === tag}
            onClick={() => setActiveStyle((prev) => (prev === tag ? null : tag))}
          >
            {styleTagLabel[tag]}
          </Chip>
        ))}
      </div>

      <div className="tf-grid tf-grid--brands tf-stagger">
        {visible.map((brand) => (
          <Card key={brand.name} icon="🏷️" title={brand.name}>
            <p className="tf-caption">{brand.description}</p>
            <div className="tf-chipset">
              {brand.styles.map((tag) => (
                <Chip key={tag} size="sm" readOnly>
                  {styleTagLabel[tag]}
                </Chip>
              ))}
              <Chip size="sm" readOnly tone="mint">
                {brand.priceTier}
              </Chip>
            </div>
            <Button
              as="a"
              href={buildBrandUrl(brand.name)}
              target="_blank"
              rel="noopener noreferrer"
              variant="soft"
              size="sm"
            >
              무신사에서 보기
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
