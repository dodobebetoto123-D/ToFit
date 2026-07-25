import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { AppDataProvider } from '@/contexts/AppDataProvider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { BodyPage } from '@/pages/BodyPage'
import { BrandsPage } from '@/pages/BrandsPage'
import { ClosetPage } from '@/pages/ClosetPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RankingPage } from '@/pages/RankingPage'
import { RecentlyViewedPage } from '@/pages/RecentlyViewedPage'
import { RecommendPage } from '@/pages/RecommendPage'
import { SavedPage } from '@/pages/SavedPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StyleNotePage } from '@/pages/StyleNotePage'

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

                <Route path="/recent" element={<RecentlyViewedPage />} />
                <Route path="/notes" element={<StyleNotePage />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </AuthProvider>
  )
}
