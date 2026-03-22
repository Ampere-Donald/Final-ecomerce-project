import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Catalogue from './pages/Catalogue/Catalogue'
import ProductDetails from './pages/ProductDetails/ProductDetails'
import Checkout from './pages/Checkout/Checkout'
import About from './pages/About/About'
import Contact from './pages/Contact/Contact'
import Terms from './pages/Terms/Terms'
import Privacy from './pages/Privacy/Privacy'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Profile from './pages/Profile/Profile'
import Favorites from './pages/Favorites/Favorites'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Toast from './components/Toast/Toast'
import BottomNav from './components/BottomNav/BottomNav'
import MiniCart from './components/MiniCart/MiniCart'
import NotFound from './pages/NotFound/NotFound'

function AppContent() {
  const location = useLocation()

  return (
    <div className="app">
      <Header />
      <main className="app__content">
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/product/:code" element={<ProductDetails />} />
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
