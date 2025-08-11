'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, ExternalLink, Calendar, User } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { FeaturedArtwork } from '@/types';
import { formatWalletAddress } from '@/lib/solana';
import { cn } from '@/lib/utils';

export default function FeaturedArtworksModal() {
  const [artworks, setArtworks] = useState<FeaturedArtwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<FeaturedArtwork | null>(null);

  const { isModalOpen, toggleModal } = useGameStore();

  useEffect(() => {
    if (isModalOpen.featuredArtworks) {
      fetchArtworks();
    }
  }, [isModalOpen.featuredArtworks]);

  const fetchArtworks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/featured-artworks');
      const result = await response.json();
      
      if (result.success) {
        setArtworks(result.data);
      }
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  // Mock artworks for demo
  const mockArtworks: FeaturedArtwork[] = [
    {
      id: '1',
      title: 'Pixel Sunset',
      description: 'A beautiful sunset created with vibrant orange and pink pixels, showcasing the collaborative spirit of the Pixey community.',
      image_url: '/api/placeholder/400/400',
      creator_wallet: 'ABC123...XYZ789',
      created_at: new Date('2024-01-15'),
      is_featured: true,
    },
    {
      id: '2',
      title: 'Digital Mandala',
      description: 'Intricate geometric patterns forming a mesmerizing mandala, demonstrating the artistic potential of pixel art.',
      image_url: '/api/placeholder/400/400',
      creator_wallet: 'DEF456...UVW012',
      created_at: new Date('2024-01-20'),
      is_featured: true,
    },
    {
      id: '3',
      title: 'Crypto Mosaic',
      description: 'A stunning mosaic representing the fusion of art and blockchain technology.',
      image_url: '/api/placeholder/400/400',
      creator_wallet: 'GHI789...RST345',
      created_at: new Date('2024-01-25'),
      is_featured: true,
    },
  ];

  const displayArtworks = artworks.length > 0 ? artworks : mockArtworks;

  return (
    <Dialog open={isModalOpen.featuredArtworks} onOpenChange={() => toggleModal('featuredArtworks')}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent flex items-center">
            ✨ Featured Artworks
          </DialogTitle>
        </DialogHeader>

        {selectedArtwork ? (
          /* Detail View */
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setSelectedArtwork(null)}
              className="mb-4"
            >
              ← Back to Gallery
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image */}
              <div className="space-y-4">
                <div className="aspect-square bg-gray-800 rounded-lg border border-purple-500/20 flex items-center justify-center">
                  <div className="text-6xl">🎨</div>
                </div>
                
                {selectedArtwork.creator_wallet && (
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <User className="h-4 w-4" />
                    <span>Created by {formatWalletAddress(selectedArtwork.creator_wallet)}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedArtwork.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {selectedArtwork.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>Featured on {formatDate(selectedArtwork.created_at)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Featured Artwork</span>
                </div>

                <Button
                  variant="game"
                  className="w-full"
                  onClick={() => {
                    // This would open the artwork location on the pixel board
                    toggleModal('featuredArtworks');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Board
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Gallery View */
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                <div className="text-gray-400">Loading artworks...</div>
              </div>
            ) : (
              <>
                <div className="text-center text-gray-400 mb-6">
                  Discover amazing pixel art created by our community
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayArtworks.map((artwork) => (
                    <button
                      key={artwork.id}
                      onClick={() => setSelectedArtwork(artwork)}
                      className={cn(
                        "group p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-purple-500 transition-all duration-200 hover:scale-105 text-left"
                      )}
                    >
                      {/* Image Placeholder */}
                      <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg mb-3 flex items-center justify-center border border-purple-500/20">
                        <div className="text-4xl">🎨</div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {artwork.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-400 mb-3 line-clamp-3">
                        {artwork.description}
                      </p>

                      {/* Meta */}
                      <div className="space-y-1">
                        {artwork.creator_wallet && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>{formatWalletAddress(artwork.creator_wallet)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(artwork.created_at)}</span>
                        </div>
                      </div>

                      {/* Featured Badge */}
                      {artwork.is_featured && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Star className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400 font-medium">Featured</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {displayArtworks.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎨</div>
                    <div className="text-gray-400 mb-2">No featured artworks yet</div>
                    <div className="text-sm text-gray-500">
                      Create amazing pixel art to be featured!
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
