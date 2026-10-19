import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="page-home min-h-full flex flex-col">
        <SiteNav />

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
                  <li><Link href="/post-property">Post Property</Link></li>
                </ul>
              </div>
              <div>
                <h4>Video Viewings</h4>
                <ul className="footer-links">
                  <li>
                    <a href="https://www.tiktok.com/@uninest" target="_blank" rel="noopener noreferrer">
                      TikTok Room Tours <span className="footer-social-badge">Watch</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/uninest" target="_blank" rel="noopener noreferrer">
                      Instagram Walkthroughs <span className="footer-social-badge">Reels</span>
                    </a>
                  </li>
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
              <div className="footer-bottom-left">
                &copy; 2026 UniNest&trade;
              </div>
              <div className="footer-bottom-center">
                <a href="#" className="footer-legal-link">Terms of Service</a>
                <a href="#" className="footer-legal-link">Privacy Policy</a>
              </div>
              <div className="footer-bottom-right footer-social-icons">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon facebook" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/uninest" target="_blank" rel="noopener noreferrer" className="footer-social-icon instagram" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon twitter" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@uninest" target="_blank" rel="noopener noreferrer" className="footer-social-icon tiktok" aria-label="TikTok">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3 15.67 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.33V9.05c1.26.86 2.76 1.36 4.38 1.41V7.02c-.16 0-.32-.01-.47-.03v-.3z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
