'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useGameStore from '@/store/gameStore';
import { PIXEL_COLORS } from '@/constants';
import { cn } from '@/lib/utils';

export default function ColorPicker() {
  const {
    isModalOpen,
    toggleModal,
    selectedPixel,
    selectedColor,
    setSelectedColor,
    placePixel,
    user,
  } = useGameStore();

  const handlePlacePixel = async () => {
    if (!selectedPixel) return;
    
    await placePixel(selectedPixel.x, selectedPixel.y, selectedColor);
    toggleModal('colorPicker');
  };

  return (
    <Dialog open={isModalOpen.colorPicker} onOpenChange={() => toggleModal('colorPicker')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a Color</DialogTitle>
        </DialogHeader>
        
        {selectedPixel && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Placing pixel at ({selectedPixel.x}, {selectedPixel.y})
            </div>
            
            {/* Color Grid */}
            <div className="grid grid-cols-6 gap-2">
              {PIXEL_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                    selectedColor === color ? "border-white shadow-lg" : "border-gray-600"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Preview */}
            <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
              <div
                className="w-16 h-16 rounded-lg border border-gray-600"
                style={{ backgroundColor: selectedColor }}
              />
              <div>
                <div className="font-medium">Preview</div>
                <div className="text-sm text-gray-400">
                  Color: {selectedColor}
                </div>
              </div>
            </div>

            {/* Pixel Balance */}
            <div className="text-sm text-center">
              {user ? (
                <span>
                  Available pixels: <span className="font-bold text-purple-400">{user.free_pixels}</span>
                </span>
              ) : (
                <span className="text-red-400">Please connect your wallet</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => toggleModal('colorPicker')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="game"
                onClick={handlePlacePixel}
                disabled={!user || user.free_pixels <= 0}
                className="flex-1"
              >
                Place Pixel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
