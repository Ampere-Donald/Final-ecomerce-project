import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Toast from './components/Toast/Toast'
import BottomNav from './components/BottomNav/BottomNav'
import MiniCart from './components/MiniCart/MiniCart'

const Home = lazy(() => import('./pages/Home/Home'))
const Catalogue = lazy(() => import('./pages/Catalogue/Catalogue'))
const ProductDetails = lazy(() => import('./pages/ProductDetails/ProductDetails'))
const Checkout = lazy(() => import('./pages/Checkout/Checkout'))
const About = lazy(() => import('./pages/About/About'))
const Contact = lazy(() => import('./pages/Contact/Contact'))
const Terms = lazy(() => import('./pages/Terms/Terms'))
const Privacy = lazy(() => import('./pages/Privacy/Privacy'))
const Login = lazy(() => import('./pages/Auth/Login'))
const Signup = lazy(() => import('./pages/Auth/Signup'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const Favorites = lazy(() => import('./pages/Favorites/Favorites'))
const NotFound = lazy(() => import('./pages/NotFound/NotFound'))

const PageFallback = () => (
  <div role="status" aria-live="polite" style={{ minHeight: '45vh', display: 'grid', placeItems: 'center', color: '#64748b', fontWeight: 600 }}>
    Chargement…
  </div>
)

function AppContent() {
  const location = useLocation()

  return (
    <div className="app">
      <Header />
      <main className="app__content">
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/favourites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </main>
      <Toast />
      <MiniCart />
      <BottomNav />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
