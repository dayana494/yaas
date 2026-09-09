import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactsPage from './pages/ContactsPage';
import FlavorsPage from './pages/FlavorsPage';
import FlavorDetailPage from './pages/FlavorDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/flavors" element={<FlavorsPage />} />
        <Route path="/flavors/:slug" element={<FlavorDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
