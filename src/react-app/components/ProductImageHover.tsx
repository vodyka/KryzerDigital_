import { useState } from "react";
import { Package } from "lucide-react";

interface ProductImageHoverProps {
  imageUrl: string | null;
  productName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ProductImageHover({
  imageUrl,
  productName,
  size = "sm",
  className = "",
}: ProductImageHoverProps) {
  const [showEnlarged, setShowEnlarged] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const enlargedSizeClasses = {
    sm: "w-48 h-48",
    md: "w-64 h-64",
    lg: "w-80 h-80",
  };

  return (
    <div className="relative inline-block">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={productName}
            className={`${sizeClasses[size]} object-cover rounded border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform hover:scale-105 ${className}`}
            onMouseEnter={() => setShowEnlarged(true)}
            onMouseLeave={() => setShowEnlarged(false)}
          />
          {showEnlarged && (
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <div
                className="relative"
                style={{
                  filter: "drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))",
                }}
              >
                <img
                  src={imageUrl}
                  alt={productName}
                  className={`${enlargedSizeClasses[size]} object-contain rounded-lg border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-900`}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {productName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className={`${sizeClasses[size]} bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center ${className}`}
        >
          <Package className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}
