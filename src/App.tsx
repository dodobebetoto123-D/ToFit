import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { AppDataProvider } from '@/contexts/AppDataProvider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { BodyPage } from '@/pages/BodyPage'
import { ClosetPage } from '@/pages/ClosetPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RankingPage } from '@/pages/RankingPage'
import { RecommendPage } from '@/pages/RecommendPage'
import { SavedPage } from '@/pages/SavedPage'

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<OnboardingPage />} />

              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/closet" element={<ClosetPage />} />
                <Route path="/recommend" element={<RecommendPage />} />
                <Route path="/body" element={<BodyPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/saved" element={<SavedPage />} />

                <Route
                  path="/recent"
                  element={
                    <ComingSoonPage
                      title="최근 본 상품"
                      description="브랜드 상품을 둘러본 기록이 쌓이는 곳이에요"
                      planned={[
                        '추천 코디에서 눌러본 브랜드 상품 자동 기록',
                        '가격 변동 알림',
                        '내 옷장 아이템과의 매칭도 표시',
                      ]}
                    />
                  }
                />
                <Route
                  path="/notes"
                  element={
                    <ComingSoonPage
                      title="스타일 노트"
                      description="착용 기록과 피드백을 모아보는 코디 캘린더예요"
                      planned={[
                        '주간 · 월간 뷰로 날짜별 착용 코디 썸네일',
                        '특정 날짜에 코디 미리 예약',
                        '최근 착용 아이템 자동 가중치 하향',
                      ]}
                    />
                  }
                />
                <Route
                  path="/brands"
                  element={
                    <ComingSoonPage
                      title="브랜드 추천"
                      description="여러 브랜드의 상품을 한곳에서 비교해요"
                      planned={[
                        '부족한 아이템을 여러 브랜드에서 검색',
                        '가격 · 리뷰 · 핏 비교',
                        '내 옷장 아이템과의 매칭도 표시',
                      ]}
                    />
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ComingSoonPage
                      title="설정"
                      description="계정과 알림, 구독을 관리해요"
                      planned={[
                        '알림 시간 · 위치 설정',
                        'ToFit 프리미엄 구독 관리',
                        '계정 · 개인정보 설정',
                      ]}
                    />
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </AuthProvider>
  )
}
