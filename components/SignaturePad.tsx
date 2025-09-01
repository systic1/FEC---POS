
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Button from './ui/Button';

interface SignaturePadProps {
  onSignatureEnd: (signature: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d');
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = getContext();
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [getContext]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = getContext();
    if (ctx) {
      const pos = getMousePos(event);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (ctx) {
      const pos = getMousePos(event);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const ctx = getContext();
    if (ctx) {
      ctx.closePath();
      setIsDrawing(false);
      if (canvasRef.current) {
        onSignatureEnd(canvasRef.current.toDataURL());
      }
    }
  };

  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if (window.TouchEvent && event.nativeEvent instanceof TouchEvent) {
       return {
        x: event.nativeEvent.touches[0].clientX - rect.left,
        y: event.nativeEvent.touches[0].clientY - rect.top
      };
    } else if (event.nativeEvent instanceof MouseEvent) {
        return {
            x: event.nativeEvent.clientX - rect.left,
            y: event.nativeEvent.clientY - rect.top
        };
    }
    return {x: 0, y: 0};
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onSignatureEnd('');
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="border border-gray-300 rounded-md cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="mt-2">
        <Button type="button" variant="secondary" onClick={clearCanvas}>Clear Signature</Button>
      </div>
    </div>
  );
};

export default SignaturePad;
