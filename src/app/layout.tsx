import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import { AuthProvider } from "@/context/AuthContext";

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
        <AuthProvider>
          <SiteNav />

          <main className="flex-grow">
            {children}
          </main>
        </AuthProvider>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <Link href="/" className="logo text-white flex items-center">
                  <img src="/images/logo.jpg" alt="UniNest Logo" style={{ height: '2rem', width: 'auto', marginRight: '0.5rem', borderRadius: '4px' }} />
                  UniNest
                </Link>
                <p>Making student housing and campus living simple, safe, and stress-free across Kenya.</p>
              </div>
              <div>
                <h4>Explore</h4>
                <ul className="footer-links">
                  <li><Link href="/search">All Properties</Link></li>
                  <li><Link href="/agents">Verified Agents</Link></li>
                  <li><a href="/marketplace.html">Student Marketplace</a></li>
                  <li><a href="/marketplace.html#sell">Sell Dorm Items</a></li>
                  <li>
                    <a href="https://www.tiktok.com/@uninest.ke" target="_blank" rel="noopener noreferrer">
                      TikTok Video Tours <span className="footer-social-badge">WATCH</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/uninest.ke?psln=MWNuZTA1Zm5wY21jZg==" target="_blank" rel="noopener noreferrer">
                      Instagram Reels <span className="footer-social-badge">VIEW</span>
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Services</h4>
                <ul className="footer-links">
                  <li><a href="/marketplace.html#track">Track Deal Status</a></li>
                  <li><a href="/marketplace.html?portal=agent">Agent Inquiries Portal</a></li>
                  <li><Link href="/#faq">Safety Guidelines</Link></li>
                </ul>
              </div>
              <div>
                <h4>Legal & Privacy</h4>
                <ul className="footer-links">
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Privacy Policy (Contact Shield)</a></li>
                  <li><a href="#">Agent Mediation Code</a></li>
                </ul>
              </div>
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
                <a href="https://www.instagram.com/uninest.ke?psln=MWNuZTA1Zm5wY21jZg==" target="_blank" rel="noopener noreferrer" className="footer-social-icon instagram" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@uninest.ke" target="_blank" rel="noopener noreferrer" className="footer-social-icon tiktok" aria-label="TikTok">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3 15.67 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.33V9.05c1.26.86 2.76 1.36 4.38 1.41V7.02c-.16 0-.32-.01-.47-.03v-.3z"/>
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
