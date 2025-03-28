import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="container-slamjam">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-16 md:py-24">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight uppercase">
              Your Virtual <br />Wardrobe Assistant
            </h1>
            <p className="text-lg text-slamjam-muted">
              Build your digital wardrobe, discover your style, and create perfect outfits with ease.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link
                href="/wardrobe"
                className="btn-primary"
                tabIndex={0}
                aria-label="View your wardrobe"
              >
                View My Wardrobe
              </Link>
              <Link
                href="/add-item"
                className="btn-secondary"
                tabIndex={0}
                aria-label="Add a new item to your wardrobe"
              >
                Add New Item
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] relative">
              <div className="absolute inset-0 bg-slamjam-hover transform rotate-3 z-0"></div>
              <div className="absolute inset-0 bg-white transform -rotate-3 z-10"></div>
              <div className="absolute inset-0 bg-white z-20 overflow-hidden">
                <div className="grid grid-cols-2 gap-2 p-4 h-full">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-slamjam-border"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Categories */}
      <div className="bg-white py-20">
        <div className="container-slamjam">
          <h2 className="text-2xl md:text-3xl font-medium uppercase mb-12 text-center">Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Tops', 'Bottoms', 'Outerwear', 'Accessories'].map((category, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="aspect-[3/4] bg-slamjam-hover mb-4 overflow-hidden">
                  <div className="w-full h-full bg-slamjam-border group-hover:scale-105 transition-transform duration-500"></div>
                </div>
                <h3 className="text-lg uppercase font-medium">{category}</h3>
                <p className="text-sm text-slamjam-muted mt-1">View collection</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* How It Works */}
      <div className="py-20 bg-slamjam-bg">
        <div className="container-slamjam">
          <h2 className="text-2xl md:text-3xl font-medium uppercase mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slamjam-text text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-medium">1</span>
              </div>
              <h3 className="text-xl font-medium uppercase mb-3">Add Items</h3>
              <p className="text-slamjam-muted">
                Paste a product URL from your favorite clothing store and our AI automatically extracts all product details.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-slamjam-text text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-medium">2</span>
              </div>
              <h3 className="text-xl font-medium uppercase mb-3">Organize</h3>
              <p className="text-slamjam-muted">
                Browse and organize your virtual wardrobe by categories, colors, and brands.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-slamjam-text text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-medium">3</span>
              </div>
              <h3 className="text-xl font-medium uppercase mb-3">Create Outfits</h3>
              <p className="text-slamjam-muted">
                Mix and match items to create and save perfect outfit combinations for any occasion.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Latest Additions */}
      <div className="py-20 bg-white">
        <div className="container-slamjam">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl md:text-3xl font-medium uppercase">Latest Additions</h2>
            <Link 
              href="/wardrobe" 
              className="text-sm uppercase tracking-wide hover:text-slamjam-accent transition-colors"
              tabIndex={0}
              aria-label="View all items in your wardrobe"
            >
              View All
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="product-card">
                <div className="relative overflow-hidden">
                  <div className="aspect-[3/4] bg-slamjam-hover"></div>
                  <div className="absolute top-0 right-0 m-3 bg-slamjam-accent text-white text-xs px-2 py-1">
                    NEW
                  </div>
                </div>
                <div className="p-4">
                  <p className="product-category">Category</p>
                  <h3 className="product-title">Product Name {i}</h3>
                  <p className="product-price">$99.00</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Newsletter */}
      <div className="py-20 bg-slamjam-text text-white">
        <div className="container-slamjam text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-medium uppercase mb-4">Stay Updated</h2>
          <p className="text-gray-300 mb-8">
            Subscribe to our newsletter to get updates on new features and style tips.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="flex-1 px-4 py-3 bg-transparent border border-gray-600 focus:border-white outline-none text-white"
              aria-label="Your email address"
            />
            <button 
              className="px-6 py-3 bg-white text-slamjam-text font-medium hover:bg-slamjam-accent hover:text-white transition-colors"
              aria-label="Subscribe to newsletter"
              tabIndex={0}
            >
              SUBSCRIBE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
