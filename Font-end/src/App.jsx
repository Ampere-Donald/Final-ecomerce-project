import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Catalogue from './pages/Catalogue/Catalogue'
import ProductDetails from './pages/ProductDetails/ProductDetails'
import Checkout from './pages/Checkout/Checkout'
import About from './pages/About/About'
import Contact from './pages/Contact/Contact'
import Terms from './pages/Terms/Terms'
import Privacy from './pages/Privacy/Privacy'
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
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
        <Toast />
      </div>
    </Router>
  )
}

export default App
