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

export default function PixelBoard({ className }: PixelBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const {
    pixelBoard,
    selectedPixel,
    setSelectedPixel,
    selectedColor,
    toggleModal,
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
    ctx.strokeStyle = '#333';
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
      
      // Preview color
      ctx.fillStyle = selectedColor + '80'; // Semi-transparent
      ctx.fillRect(
        selectedPixel.x * PIXEL_SIZE,
        selectedPixel.y * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    }

    // Restore context
    ctx.restore();
  }, [viewport, pixelBoard, selectedPixel, selectedColor]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (isDragging) return;

    const gridPos = screenToGrid(event.clientX, event.clientY);
    if (gridPos) {
      setSelectedPixel(gridPos);
      toggleModal('colorPicker');
    }
  }, [isDragging, screenToGrid, setSelectedPixel, toggleModal]);

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
    <div ref={containerRef} className={cn("w-full h-full relative overflow-hidden rounded-lg border border-purple-500/20", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair bg-gray-900"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <button
          onClick={() => setViewport(prev => ({ 
            ...prev, 
            scale: Math.min(MAX_SCALE, prev.scale * 1.5) 
          }))}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setViewport(prev => ({ 
            ...prev, 
            scale: Math.max(MIN_SCALE, prev.scale / 1.5) 
          }))}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
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
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded text-xs font-medium shadow-lg transition-colors"
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Board info */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white p-3 rounded-lg">
        <div className="text-sm font-medium">
          Board: {pixelBoard.boardSize}x{pixelBoard.boardSize}
        </div>
        <div className="text-xs text-purple-300">
          Stage {pixelBoard.currentStage} • Zoom: {Math.round(viewport.scale * 100)}%
        </div>
      </div>
    </div>
  );
}
