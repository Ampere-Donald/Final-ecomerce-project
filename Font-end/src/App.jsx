import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Catalogue from './pages/Catalogue/Catalogue'
import ProductDetails from './pages/ProductDetails/ProductDetails'
import Checkout from './pages/Checkout/Checkout'
import About from './pages/About/About'
import Terms from './pages/Terms/Terms'
import Privacy from './pages/Privacy/Privacy'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import VerifyOTP from './pages/Auth/VerifyOTP'
import Profile from './pages/Profile/Profile'
import Favorites from './pages/Favorites/Favorites'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Toast from './components/Toast/Toast'

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="app__content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/product/:code" element={<ProductDetails />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />

            {/* Protected */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/favourites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          </Routes>
        </main>
        <Toast />
      </div>
    </Router>
  )
}

export default App
