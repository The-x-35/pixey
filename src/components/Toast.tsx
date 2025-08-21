'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { Toast as ToastType } from '@/types';

const ToastIcon = ({ type }: { type: ToastType['type'] }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };
  
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
};

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { removeToast } = useGameStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);
    
    // Auto-remove after duration
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => removeToast(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const baseClasses = "relative flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm border-2 transform transition-all duration-300 ease-out max-w-sm";
  
  const typeClasses = {
    success: "bg-green-500/20 border-green-400 text-green-100",
    error: "bg-red-500/20 border-red-400 text-red-100",
    info: "bg-blue-500/20 border-blue-400 text-blue-100",
    warning: "bg-yellow-500/20 border-yellow-400 text-yellow-100",
  };

  const animationClasses = cn(
    "transition-all duration-300 ease-out",
    {
      "translate-x-full opacity-0 scale-95": !isVisible || isExiting,
      "translate-x-0 opacity-100 scale-100": isVisible && !isExiting,
    }
  );

  return (
    <div className={cn(baseClasses, typeClasses[toast.type], animationClasses)}>
      <div className="flex-shrink-0">
        <ToastIcon type={toast.type} />
      </div>
      
      <div className="flex-1 text-center text-sm font-medium flex items-center justify-center">
        {toast.message}
      </div>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function ToastContainer() {
  const { toasts } = useGameStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
