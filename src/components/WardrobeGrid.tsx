import React from 'react';
import { ClothingItem } from './ProductCard';
import Link from 'next/link';

interface WardrobeGridProps {
  items: ClothingItem[];
}

const WardrobeGrid: React.FC<WardrobeGridProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link 
          key={item.id} 
          href={`/item/${item.id}`}
          className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {item.product_img ? (
              <img
                src={item.product_img}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/placeholder-image.jpg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            {item.tags && (
              <div className="absolute top-3 left-3">
                <span className="inline-block bg-black/75 text-white px-2 py-1 text-xs rounded backdrop-blur-sm">
                  {item.tags}
                </span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-medium text-lg mb-1 line-clamp-1">{item.name}</h3>
            {item.brand && (
              <p className="text-sm text-gray-600 mb-1 capitalize">{item.brand}</p>
            )}
            <div className="flex items-center justify-between">
              {item.price && (
                <span className="text-sm font-bold">
                  ${typeof item.price === 'string' ? item.price : item.price.toFixed(2)}
                </span>
              )}
              {item.color && (
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full border border-gray-200" 
                    style={{ backgroundColor: item.color.toLowerCase() }}
                  />
                  <span className="text-xs text-gray-500 capitalize">{item.color}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default WardrobeGrid; 