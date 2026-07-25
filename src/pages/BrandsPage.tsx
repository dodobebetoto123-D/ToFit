import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { styleTagLabel } from '@/lib/labels'
import { STYLE_TAGS, type StyleTag } from '@/types'

interface BrandEntry {
  name: string
  description: string
  styles: StyleTag[]
  priceTier: '저가' | '중가' | '고가'
}

/** 무신사에 실제로 입점해 있는 브랜드만 골라 실제 검색결과 페이지로 연결한다 */
const BRANDS: BrandEntry[] = [
  { name: 'MUSINSA STANDARD', description: '무신사 자체 브랜드 — 가성비 좋은 데일리웨어', styles: ['CASUAL', 'MINIMAL'], priceTier: '저가' },
  { name: 'UNIQLO', description: '베이직 필수템, 기능성 소재', styles: ['MINIMAL', 'CASUAL'], priceTier: '저가' },
  { name: 'COS', description: '미니멀한 실루엣의 컨템포러리 브랜드', styles: ['MINIMAL', 'CHIC'], priceTier: '고가' },
  { name: 'ZARA', description: '트렌드를 빠르게 반영하는 패스트패션', styles: ['CHIC', 'CLASSIC'], priceTier: '중가' },
  { name: 'NIKE', description: '스니커즈 · 스포츠웨어의 정석', styles: ['SPORTY'], priceTier: '중가' },
  { name: 'ADIDAS', description: '스트릿 감성의 스포츠 브랜드', styles: ['SPORTY', 'STREET'], priceTier: '중가' },
  { name: 'NEW BALANCE', description: '레트로 무드의 러닝화 · 캠퍼스룩', styles: ['CASUAL', 'AMEKAJI'], priceTier: '중가' },
  { name: 'CONVERSE', description: '어디에나 어울리는 클래식 캔버스화', styles: ['CASUAL'], priceTier: '저가' },
  { name: 'MARHEN.J', description: '국내 컨템포러리 백 브랜드', styles: ['LOVELY', 'CHIC'], priceTier: '중가' },
  { name: 'CHARLES & KEITH', description: '슈즈 · 백 등 여성 액세서리', styles: ['CHIC', 'LOVELY'], priceTier: '중가' },
  { name: 'DR. MARTENS', description: '첼시부츠 · 워커의 대명사', styles: ['STREET', 'CLASSIC'], priceTier: '고가' },
  { name: 'CLARKS', description: '로퍼 · 더비슈즈 등 클래식 신발', styles: ['CLASSIC'], priceTier: '중가' },
  { name: 'THE NORTH FACE', description: '아웃도어 아우터 · 백팩', styles: ['SPORTY', 'CASUAL'], priceTier: '중가' },
  { name: '8 SECONDS', description: '삼성물산 SPA — 트렌디한 오피스룩', styles: ['CHIC', 'CASUAL'], priceTier: '저가' },
  { name: 'SPAO', description: '이랜드 SPA — 데일리 기본템', styles: ['CASUAL'], priceTier: '저가' },
]

function buildBrandUrl(brand: string): string {
  return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(brand)}`
}

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
