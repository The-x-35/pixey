'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { PixelBoardProps } from '@/types';
import { PIXEL_COLORS } from '@/constants';

interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export default function PixelBoard({ className, selectedPixel, onPixelSelect }: PixelBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const {
    pixelBoard,
    updatePixelBoard,
    updateGameSettings,
  } = useGameStore();

  const PIXEL_SIZE = 10;
  const MIN_SCALE = 0.23; // Allow zooming out to 10% to see the entire board
  const MAX_SCALE = 10;

  // Fetch pixels from database continuously
  const fetchPixels = useCallback(async () => {
    try {
      const response = await fetch('/api/pixels');
      const result = await response.json();
      
      if (result.success) {
        updatePixelBoard(result.data.pixels);
      }
    } catch (error) {
      console.error('Error fetching pixels:', error);
    }
  }, [updatePixelBoard]);

  // Fetch game settings to update board size and stage
  const fetchGameSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/game-settings');
      const result = await response.json();
      
      if (result.success) {
        const { currentStage, totalBurned, boardSize } = result.data;
        
        // Update the game settings in the store
        updateGameSettings(currentStage, totalBurned, boardSize);
      }
    } catch (error) {
      console.error('Error fetching game settings:', error);
    }
  }, [updateGameSettings]);

  // Fetch data on component mount and set up intervals
  useEffect(() => {
    // Initial fetch
    fetchPixels();
    fetchGameSettings();
    
    // Set up intervals for real-time updates
    const pixelInterval = setInterval(fetchPixels, 2000); // Every 2 seconds
    const settingsInterval = setInterval(fetchGameSettings, 5000); // Every 5 seconds
    
    return () => {
      clearInterval(pixelInterval);
      clearInterval(settingsInterval);
    };
  }, [fetchPixels, fetchGameSettings]);

  // Convert screen coordinates to grid coordinates
  const screenToGrid = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const gridX = Math.floor((canvasX - viewport.offsetX) / (PIXEL_SIZE * viewport.scale));
    const gridY = Math.floor((canvasY - viewport.offsetY) / (PIXEL_SIZE * viewport.scale));

    if (gridX >= 0 && gridX < pixelBoard.boardSize && gridY >= 0 && gridY < pixelBoard.boardSize) {
      return { x: gridX, y: gridY };
    }
    return null;
  }, [viewport, pixelBoard.boardSize]);

  // Draw the pixel board
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    const visibleStartX = Math.max(0, Math.floor(-viewport.offsetX / (PIXEL_SIZE * viewport.scale)));
    const visibleEndX = Math.min(
      pixelBoard.boardSize,
      Math.ceil((canvas.width - viewport.offsetX) / (PIXEL_SIZE * viewport.scale))
    );
    const visibleStartY = Math.max(0, Math.floor(-viewport.offsetY / (PIXEL_SIZE * viewport.scale)));
    const visibleEndY = Math.min(
      pixelBoard.boardSize,
      Math.ceil((canvas.height - viewport.offsetY) / (PIXEL_SIZE * viewport.scale))
    );

    // Draw grid
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.5 / viewport.scale;
    
    for (let x = visibleStartX; x <= visibleEndX; x++) {
      ctx.beginPath();
      ctx.moveTo(x * PIXEL_SIZE, visibleStartY * PIXEL_SIZE);
      ctx.lineTo(x * PIXEL_SIZE, visibleEndY * PIXEL_SIZE);
      ctx.stroke();
    }
    
    for (let y = visibleStartY; y <= visibleEndY; y++) {
      ctx.beginPath();
      ctx.moveTo(visibleStartX * PIXEL_SIZE, y * PIXEL_SIZE);
      ctx.lineTo(visibleEndX * PIXEL_SIZE, y * PIXEL_SIZE);
      ctx.stroke();
    }

    // Draw pixels
    for (let x = visibleStartX; x < visibleEndX; x++) {
      for (let y = visibleStartY; y < visibleEndY; y++) {
        const pixel = pixelBoard.pixels[`${x},${y}`];
        if (pixel) {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    // Draw selected pixel
    if (selectedPixel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / viewport.scale;
      ctx.strokeRect(
        selectedPixel.x * PIXEL_SIZE,
        selectedPixel.y * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    }

    // Restore context
    ctx.restore();
  }, [viewport, pixelBoard, selectedPixel]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (isDragging) return;

    const gridPos = screenToGrid(event.clientX, event.clientY);
    if (gridPos) {
      onPixelSelect(gridPos);
    }
  }, [isDragging, screenToGrid, onPixelSelect]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, []);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    setViewport(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY,
    }));

    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isDragging, lastMousePos]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel for panning
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    // Use scroll wheel to pan around the board
    const scrollSpeed = 1.5; // Adjust this value to control scroll sensitivity
    
    setViewport(prev => {
      const newOffsetX = prev.offsetX - event.deltaX * scrollSpeed;
      const newOffsetY = prev.offsetY - event.deltaY * scrollSpeed;
      
      // Constrain panning to keep board visible and reduce excessive empty space
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const boardWidth = pixelBoard.boardSize * PIXEL_SIZE * prev.scale;
        const boardHeight = pixelBoard.boardSize * PIXEL_SIZE * prev.scale;
        
        // Limit how far users can scroll away from the board
        // Allow some space for navigation but prevent excessive empty space
        const maxOffsetX = rect.width + 200; // Allow 200px extra space
        const maxOffsetY = rect.height + 200;
        const minOffsetX = -boardWidth - 200;
        const minOffsetY = -boardHeight - 200;
        
        return {
          ...prev,
          offsetX: Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX)),
          offsetY: Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY)),
        };
      }
      
      return {
        ...prev,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  }, [pixelBoard.boardSize]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start for pinch-to-zoom
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches);
      setLastTouchDistance(distance);
    }
  }, []);

  // Handle touch move for pinch-to-zoom
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    event.nativeEvent.stopPropagation();
    
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches);
      if (distance && lastTouchDistance) {
        const scaleFactor = distance / lastTouchDistance;
        
        setViewport(prev => {
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * scaleFactor));
          return {
            ...prev,
            scale: newScale,
          };
        });
        
        setLastTouchDistance(distance);
      }
    } else if (event.touches.length === 1) {
      // Single touch panning
      const touch = event.touches[0];
      setViewport(prev => {
        const newOffsetX = prev.offsetX + touch.clientX - (lastMousePos.x || touch.clientX);
        const newOffsetY = prev.offsetY + touch.clientY - (lastMousePos.y || touch.clientY);
        
        return {
          ...prev,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        };
      });
      
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
    }
  }, [lastTouchDistance, lastMousePos]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setLastMousePos({ x: 0, y: 0 });
  }, []);

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Center the board initially
    if (viewport.scale === 1 && viewport.offsetX === 0 && viewport.offsetY === 0) {
      const centerX = (rect.width - pixelBoard.boardSize * PIXEL_SIZE) / 2;
      const centerY = (rect.height - pixelBoard.boardSize * PIXEL_SIZE) / 2;
      setViewport(prev => ({
        ...prev,
        offsetX: centerX,
        offsetY: centerY,
      }));
    }
  }, [pixelBoard.boardSize, viewport]);

  // Effects
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  useEffect(() => {
    // Global mouse up handler
    const handleGlobalMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full relative overflow-hidden rounded-lg border border-[#262626]", className)}
      style={{
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair bg-black"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <button
          onClick={() => setViewport(prev => ({ 
            ...prev, 
            scale: Math.min(MAX_SCALE, prev.scale * 1.5) 
          }))}
          className="text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
            color: 'white',
            padding: '8px',
            borderRadius: '50%',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setViewport(prev => ({ 
            ...prev, 
            scale: Math.max(MIN_SCALE, prev.scale / 1.5) 
          }))}
          className="text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
            color: 'white',
            padding: '8px',
            borderRadius: '50%',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;
            
            const rect = container.getBoundingClientRect();
            const centerX = (rect.width - pixelBoard.boardSize * PIXEL_SIZE) / 2;
            const centerY = (rect.height - pixelBoard.boardSize * PIXEL_SIZE) / 2;
            
            setViewport({
              scale: 1,
              offsetX: centerX,
              offsetY: centerY,
            });
          }}
          className="text-white p-2 rounded text-xs font-medium shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Zoom info only */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white p-3 rounded-lg">
        <div className="text-xs text-white">
          Zoom: {Math.round(viewport.scale * 100)}%
        </div>
      </div>
    </div>
  );
}
