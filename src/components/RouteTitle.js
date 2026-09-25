import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_TITLE = 'IJEPA — International Journal of Engineering Practices and Applications';

const TITLES = {
  '/login': 'Sign in',
  '/register': 'Create an account',
  '/papers': 'Browse papers',
  '/author-guidelines': 'Author guidelines',
  '/indexing': 'Indexing & abstracting',
  '/callforpapers': 'Call for papers',
  '/journal-issues': 'Journal issues',
  '/joinusedito': 'Join the editorial team',
  '/submitform': 'Submit a manuscript',
  '/contact-us': 'Contact us',
  '/about-us': 'About us',
  '/privacy-policy': 'Privacy policy',
  '/terms-of-service': 'Terms of service',
  '/editorial-board': 'Editorial board',
  '/author-dashboard': 'Author dashboard',
  '/reviewer-dashboard': 'Reviewer dashboard',
  '/admin-dashboard': 'Admin dashboard',
};

// Sets a per-page <title>. Article pages (/p/:id, /paper/:slug) and the 404 page set
// their own titles, so other paths are left alone.
const RouteTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (path === '/') {
      document.title = SITE_TITLE;
    } else if (path.startsWith('/review/paper/')) {
      document.title = 'Review manuscript | IJEPA';
    } else if (TITLES[path]) {
      document.title = `${TITLES[path]} | IJEPA`;
    }
  }, [pathname]);

  return null;
};

export default RouteTitle;
