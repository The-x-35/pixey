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
  } = useGameStore();

  const PIXEL_SIZE = 10;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;

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

  // Handle wheel for zooming
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * zoomFactor));

    if (newScale !== viewport.scale) {
      // Zoom towards mouse position
      const scaleRatio = newScale / viewport.scale;
      const newOffsetX = mouseX - (mouseX - viewport.offsetX) * scaleRatio;
      const newOffsetY = mouseY - (mouseY - viewport.offsetY) * scaleRatio;

      setViewport({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    }
  }, [viewport]);

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
            scale: Math.min(MAX_SCALE, prev.scale * 1.2) 
          }))}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setViewport(prev => ({ 
            ...prev, 
            scale: Math.max(MIN_SCALE, prev.scale * 0.8) 
          }))}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
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
