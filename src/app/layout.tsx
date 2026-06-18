import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniNest | Student House Hunting",
  description: "Find the perfect student accommodation near your campus. Browse bedsitters, apartments, and houses with UniNest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="page-home min-h-full flex flex-col">
        {/* Navbar */}
        <nav className="navbar">
          <div className="container nav-container">
            <Link href="/" className="logo">
              UniNest
            </Link>
            <button className="mobile-menu-btn" aria-label="Toggle menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="nav-links">
              <Link href="/">Home</Link>
              <Link href="/search">Properties</Link>
              <Link href="/agents">Agents</Link>
            </div>
            <div className="nav-actions">
              <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Sign Up</Link>
            </div>
          </div>
        </nav>

        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <Link href="/" className="logo text-white">
                  UniNest
                </Link>
                <p>Making student house hunting simple, safe, and stress-free.</p>
              </div>
              <div>
                <h4>Explore</h4>
                <ul className="footer-links">
                  <li><Link href="/search">All Properties</Link></li>
                  <li><Link href="/agents">Verified Agents</Link></li>
                </ul>
              </div>
              {/* Hidden Placeholders */}
              {/* <div>
                <h4>Support</h4>
                <ul className="footer-links">
                  <li><a href="#">Help Center</a></li>
                  <li><a href="#">Contact Us</a></li>
                  <li><a href="#">Report a listing</a></li>
                </ul>
              </div>
              <div>
                <h4>Legal</h4>
                <ul className="footer-links">
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                </ul>
              </div> */}
            </div>
            <div className="footer-bottom">
              &copy; 2026 UniNest. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
