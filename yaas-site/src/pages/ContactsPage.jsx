import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';

// /contacts — the homepage's own Screen 7 block, standalone: same
// component (ContactSection), same design, same content, per spec.
export default function ContactsPage() {
  return (
    <div className="page page-light">
      <ContactSection />
      <Footer />
    </div>
  );
}
