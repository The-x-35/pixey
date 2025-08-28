'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import useGameStore from '@/store/gameStore';

type GridOption = 4 | 8 | 16 | 32;

interface BoardPixel {
  x: number;
  y: number;
  color: string;
}

interface PixelBotProps {
  onVisibilityChange?: (isVisible: boolean) => void;
}

export default function PixelBot({ onVisibilityChange }: PixelBotProps) {
  const { user } = useGameStore();
  const { connected } = useWallet();
  
  // Get selected pixel from the main page's state
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  
  // Listen to pixel selection events from the main page
  useEffect(() => {
    const handlePixelSelect = (event: CustomEvent) => {
      const pixel = event.detail;
      console.log('PixelBot: Received pixel selection event:', pixel);
      setSelectedPixel(pixel);
    };
    
    // Listen for custom pixel selection events
    document.addEventListener('pixelSelected', handlePixelSelect as EventListener);
    
    return () => {
      document.removeEventListener('pixelSelected', handlePixelSelect as EventListener);
    };
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [grid, setGrid] = useState<GridOption>(32);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState<string>('');

  // Notify parent component when visibility changes
  useEffect(() => {
    onVisibilityChange?.(isOpen);
  }, [isOpen, onVisibilityChange]);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const appendLog = useCallback((line: string) => {
    setLog(prev => `${prev}${prev ? '\n' : ''}${line}`.slice(-8000));
  }, []);

  // Auto-update startX and startY when a pixel is selected on the board
  useEffect(() => {
    if (selectedPixel) {
      console.log('PixelBot: Pixel selected on board:', selectedPixel);
      setStartX(selectedPixel.x);
      setStartY(selectedPixel.y);
      appendLog(`📍 Selected pixel coordinates: (${selectedPixel.x}, ${selectedPixel.y})`);
    } else {
      console.log('PixelBot: No pixel selected');
      appendLog('📍 No pixel selected - please click on the board first');
    }
  }, [selectedPixel, appendLog]);

  // PixelBot now uses selected pixel coordinates from the board
  // No more cursor click handling - coordinates come from selectedPixel

  const drawPreview = useCallback(async () => {
    if (!file || !previewRef.current) return;
    const canvas = previewRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve as any;
      img.onerror = reject as any;
      img.src = URL.createObjectURL(file);
    });

    // Downsample to grid x grid to get one color per board pixel
    const g = document.createElement('canvas');
    g.width = grid; g.height = grid;
    const gctx = g.getContext('2d');
    if (!gctx) return;
    gctx.imageSmoothingEnabled = false;
    gctx.drawImage(img, 0, 0, grid, grid);
    const data = gctx.getImageData(0, 0, grid, grid).data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Scale the N×N grid to fill the preview canvas for visibility
    const cellW = canvas.width / grid;
    const cellH = canvas.height / grid;
    let drawn = 0;
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        const idx = (gy * grid + gx) * 4;
        const a = data[idx + 3];
        if (a < 16) continue;
        const r = data[idx];
        const g2 = data[idx + 1];
        const b = data[idx + 2];
        const color = `#${r.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase();
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(gx * cellW), Math.floor(gy * cellH), Math.ceil(cellW), Math.ceil(cellH));
        drawn++;
      }
    }

    // Grid overlay
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= grid; i++) {
      const x = Math.floor(i * cellW);
      const y = Math.floor(i * cellH);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    appendLog(`👁️ Preview ready (grid=${grid}, filled canvas, cells=${drawn})`);
  }, [file, grid, appendLog]);

  // Regenerate preview when grid changes
  useEffect(() => {
    if (file) {
      drawPreview();
    }
  }, [grid, file, drawPreview]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    setFile(f);
    appendLog(`🖼️ Image selected: ${f.name} (${f.type}, ${f.size} bytes)`);
    // Auto-generate preview after a short delay to ensure file is set
    setTimeout(() => {
      if (f) drawPreview();
    }, 100);
  }, [appendLog, drawPreview]);

  const generatePixels = useCallback(async (): Promise<BoardPixel[]> => {
    if (!file) return [];
    // Get actual board size from game store
    const boardSize = useGameStore.getState().pixelBoard.boardSize || 200;
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve as any;
      img.onerror = reject as any;
      img.src = URL.createObjectURL(file);
    });

    // Downsample image to grid x grid
    const g = document.createElement('canvas');
    g.width = grid; g.height = grid;
    const gctx = g.getContext('2d');
    if (!gctx) return [];
    gctx.imageSmoothingEnabled = false;
    gctx.drawImage(img, 0, 0, grid, grid);
    const data = gctx.getImageData(0, 0, grid, grid).data;

    // One board pixel per grid cell
    const pixels: BoardPixel[] = [];
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        const idx = (gy * grid + gx) * 4;
        const a = data[idx + 3];
        if (a < 16) continue;
        const r = data[idx];
        const g2 = data[idx + 1];
        const b = data[idx + 2];
        const color = `#${r.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase();
        const x = startX + gx;
        const y = startY + gy;
        if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) continue;
        pixels.push({ x, y, color });
      }
    }
    appendLog(`🔧 Prepared ${pixels.length} board pixels (expected ≤ ${grid * grid})`);
    return pixels;
  }, [file, grid, startX, startY, appendLog]);

  const start = useCallback(async () => {
    if (!file) { appendLog('No image selected'); return; }
    if (!user) { appendLog('Connect wallet to use the bot'); return; }
    if (!selectedPixel) { appendLog('Please select a pixel on the board first'); return; }
    setIsDrawing(true);
    try {
      appendLog('🚀 Generating pixels from image...');
      const pixels = await generatePixels();
      appendLog(`🎨 Generated ${pixels.length} pixels to place`);
      appendLog(`📍 Starting at (${startX}, ${startY}) with grid ${grid}x${grid}`);

      // Get JWT token from localStorage
      const authKey = `pixey_auth_${user.wallet_address}`;
      const storedAuth = localStorage.getItem(authKey);
      const authData = storedAuth ? JSON.parse(storedAuth) : null;
      const token = authData?.token;
      
      if (!token) {
        appendLog('❌ No JWT token found. Please reconnect your wallet.');
        useGameStore.getState().addToast({
          message: 'Authentication token expired. Please reconnect your wallet.',
          type: 'error',
          duration: 5000
        });
        return;
      }
      
      let placedCount = 0;
      let totalCost = 0;
      
      // Place pixels one by one with 400ms delay
      for (let i = 0; i < pixels.length; i++) {
        const pixel = pixels[i];
        
        try {
          appendLog(`📤 Placing pixel ${i + 1}/${pixels.length} at (${pixel.x}, ${pixel.y})`);
          
          // Call single pixel placement API
          const response = await fetch('/api/place-pixel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              x: pixel.x,
              y: pixel.y,
              color: pixel.color,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.success) {
            placedCount++;
            const pixelsDeducted = result.data.pixels_deducted || 1;
            totalCost += pixelsDeducted;
            
            // Update local board state immediately
            const gameStore = useGameStore.getState();
            const currentPixels = { ...gameStore.pixelBoard.pixels };
            currentPixels[`${pixel.x},${pixel.y}`] = {
              x: pixel.x,
              y: pixel.y,
              color: pixel.color,
              wallet_address: user.wallet_address,
              placed_at: new Date(),
            };
            gameStore.updatePixelBoard(Object.values(currentPixels));
            
            appendLog(`✅ Pixel ${i + 1}/${pixels.length} placed at (${pixel.x}, ${pixel.y})`);
            
            // Wait 0ms before placing next pixel
            if (i < pixels.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        } catch (pixelError: any) {
          appendLog(`❌ Failed to place pixel at (${pixel.x}, ${pixel.y}): ${pixelError.message}`);
          // Continue with next pixel instead of stopping
        }
      }
      
      if (placedCount > 0) {
        useGameStore.getState().addToast({
          message: `Successfully placed ${placedCount} pixels! Cost: ${totalCost} pixels`,
          type: 'success',
          duration: 6000
        });
        
        appendLog(`🎉 Completed! Placed ${placedCount}/${pixels.length} pixels. Total cost: ${totalCost} pixels`);
        
        // Refresh user data to show updated free pixels
        try {
          const userRes = await fetch(`${window.location.origin}/api/users?wallet_address=${user.wallet_address}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.success && userData.user) {
              useGameStore.getState().setUser(userData.user);
              appendLog(`🔄 User data refreshed: ${userData.user.free_pixels} free pixels remaining`);
            }
          }
        } catch (refreshError) {
          appendLog(`⚠️ Could not refresh user data: ${refreshError}`);
        }
      } else {
        appendLog('❌ No pixels were placed successfully');
      }
    } catch (e: any) {
      appendLog(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setIsDrawing(false);
    }
  }, [file, user, generatePixels, appendLog, startX, startY, grid, selectedPixel]);

  return (
    <>
      <button
        onClick={() => setIsOpen(v => !v)}
        className={cn('fixed left-4 top-36 z-50 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 md:left-4 md:top-36')}
        style={{
          background: 'linear-gradient(to right, #EE00FF 0%, #EE5705 66%, #EE05E7 100%)',
          color: 'white',
          padding: '12px',
          borderRadius: '50%',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
          border: 'none',
          cursor: 'pointer',
        }}
        title="Pixel Agent"
      >
        <svg className="w-8 h-8" viewBox="0 -19.5 164 164" fill="currentColor">
          <path d="M19.2329 89.0831C17.3341 89.4211 15.7432 89.7559 14.1371 89.9817C7.06966 90.976 1.51901 86.5687 0.48068 79.5288C-1.0289 69.307 6.73229 58.1139 14.141 55.0389C16.6482 53.9986 19.5794 53.9795 23.0364 53.3665C32.2494 32.1615 49.7618 21.7934 73.5423 20.3488C73.8921 16.4462 74.238 12.5935 74.6022 8.54059C73.5751 8.11988 72.3431 7.95977 71.6796 7.26077C70.7134 6.24344 69.5996 4.84016 69.5957 3.59771C69.5918 2.53116 70.9221 0.709891 71.8974 0.535306C74.597 0.0535535 77.542 -0.276629 80.1608 0.325233C83.5048 1.0938 83.9852 3.75262 81.8548 6.48561C81.4171 6.9389 81.1341 7.51899 81.0462 8.14288C81.224 11.6156 81.5273 15.081 81.7616 18.179C88.0211 18.7375 94.0055 19.0381 99.9211 19.8421C119.273 22.472 132.088 33.3508 139.077 51.3896C139.194 51.6909 139.333 51.9849 139.478 52.2744C139.549 52.3747 139.633 52.4656 139.727 52.5448C142.943 52.5448 146.247 52.1103 149.393 52.6347C156.138 53.7583 161.178 57.4004 162.853 64.3477C164.528 71.2951 161.862 77.0616 156.759 81.6435C151.742 86.1493 145.621 87.389 138.993 86.5404C138.746 86.7453 138.532 86.987 138.359 87.2571C130.949 104.691 117.203 114.915 99.7662 120.658C84.6227 125.684 68.3154 126.026 52.9746 121.639C36.0424 116.958 23.8017 107.182 19.2329 89.0831ZM74.3653 116.033C77.9548 115.728 81.5686 115.59 85.1292 115.09C99.4118 113.083 112.05 107.628 121.744 96.6153C138.759 77.2881 134.524 42.1123 104.846 32.3558C93.8566 28.746 82.3857 26.5243 70.7233 27.2725C57.6687 28.1106 46.2832 33.0968 37.8617 43.4256C30.0513 53.0022 26.6062 64.3694 26.3233 76.5471C25.9125 94.2223 34.5276 106.232 51.1808 112.095C58.6448 114.649 66.4731 115.979 74.362 116.032L74.3653 116.033ZM20.0205 60.3756C19.7421 60.3376 19.4597 60.3412 19.1824 60.3861C12.7641 62.2757 6.45466 73.2929 8.09026 79.6823C8.58579 81.6199 9.81316 82.7712 11.7592 82.8092C13.8765 82.8512 16.0005 82.5894 17.5501 82.4949C18.4092 74.7881 19.2099 67.6156 20.0185 60.3742L20.0205 60.3756ZM141.736 77.21C145.278 77.15 148.678 75.8064 151.305 73.4289C154.874 70.1905 155.296 65.2817 152.224 62.4522C149.242 59.7061 145.667 58.9152 141.736 59.7146V77.21Z"/>
          <path d="M84.8075 82.0252C86.4018 82.3193 88.1725 82.2825 89.5331 83.0097C90.1516 83.3495 90.6946 83.8115 91.129 84.3676C91.5634 84.9238 91.8802 85.5624 92.06 86.2448C92.3344 88.1095 90.7172 89.0671 88.9411 89.2994C88.0814 89.4143 87.2076 89.3635 86.367 89.1498C84.8505 88.6937 83.2428 88.6309 81.6954 88.9674C80.148 89.304 78.7116 90.0287 77.5215 91.0734C76.1714 92.182 74.5896 93.0209 73.233 91.3781C72.0319 89.9236 72.5832 88.2348 73.7817 86.9346C75.1549 85.3673 76.8518 84.1166 78.7554 83.269C80.659 82.4214 82.7239 81.9971 84.8075 82.0252Z"/>
          <path d="M57.7186 52.5112C61.4295 52.6392 63.7503 55.2876 63.5495 59.1645C63.3893 62.2533 60.9084 64.7434 58.1203 64.6154C54.9698 64.4703 52.4724 61.3206 52.607 57.6582C52.7442 53.9453 54.2853 52.3924 57.7186 52.5112Z"/>
          <path d="M93.575 57.3327C93.5684 54.2361 94.7564 52.8328 97.4244 52.7856C100.873 52.7245 103.039 54.689 102.96 57.8066C102.891 60.4916 100.78 62.7678 98.3 62.8282C95.4672 62.8971 93.5822 60.7024 93.575 57.3327Z"/>
        </svg>
      </button>
      {isOpen && (
        <div className="fixed left-1/2 top-24 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 bg-black/80 backdrop-blur-xl rounded-lg border border-[#262626] shadow-xl md:left-20 md:top-36 md:w-80 md:translate-x-0">
          <div className="p-3 space-y-3">
            {!connected && (
              <div className="p-2 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded">
                Connect your wallet to use the bot
              </div>
            )}
            {connected && (
              <>
                                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-sm text-gray-300">Pixel Agent</label>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      title="Close PixelBot"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              {!file ? (
                <button onClick={() => fileInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 transition-colors">Select Image</button>
              ) : (
                <div className="w-full p-3 border-2 border-gray-600 rounded-lg bg-gray-800/50">
                  <canvas ref={previewRef} width={200} height={200} className="w-full aspect-square rounded border border-gray-600" />
                  <div className="text-center mt-2">
                    <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Remove</button>
                  </div>
                </div>
              )}
            </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-0.5">Grid</label>
                  <select value={grid} onChange={e => setGrid(Number(e.target.value) as GridOption)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                    <option value={4}>4x4</option>
                    <option value={8}>8x8</option>
                    <option value={16}>16x16</option>
                    <option value={32}>32x32</option>
                  </select>
                </div>
                {!selectedPixel && (
                  <div className="p-2 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    Please select a pixel on the board first to set starting position
                  </div>
                )}
                {selectedPixel && (
                  <div className="p-2 text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded">
                    Starting position: ({selectedPixel.x}, {selectedPixel.y})
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-0.5">Start X</label>
                    <input type="number" min={0} max={199} value={startX} onChange={e => setStartX(Number(e.target.value))} className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-0.5">Start Y</label>
                    <input type="number" min={0} max={199} value={startY} onChange={e => setStartY(Number(e.target.value))} className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
                  </div>
                </div>

                <div>
                  <button disabled={!file || !connected || isDrawing} onClick={start} className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded">Start Drawing</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}


