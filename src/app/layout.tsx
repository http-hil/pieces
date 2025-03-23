import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from '../../components/Navigation';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Virtual Wardrobe | Your Digital Clothing Collection",
  description: "Organize your wardrobe digitally and discover your personal style",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slamjam-bg">
        <Navigation />
        <main>{children}</main>
        <footer className="bg-slamjam-text text-white py-12 mt-24">
          <div className="container-slamjam">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Virtual Wardrobe</h3>
                <p className="text-sm text-gray-300">
                  Your digital clothing collection, organized and accessible anywhere.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="/" className="hover:text-slamjam-accent">Home</a></li>
                  <li><a href="/wardrobe" className="hover:text-slamjam-accent">My Wardrobe</a></li>
                  <li><a href="/add-item" className="hover:text-slamjam-accent">Add Item</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Contact</h3>
                <p className="text-sm text-gray-300">
                  Questions or feedback? Reach out to us at support@virtualwardrobe.com
                </p>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Virtual Wardrobe. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
