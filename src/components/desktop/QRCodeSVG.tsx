import { useMemo } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export function QRCodeSVG({
  value,
  size = 200,
  fgColor = '#E8E4DB',
  bgColor = '#161410',
  className = '',
}: QRCodeSVGProps) {
  const qrData = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'http://localhost:5006/', {
        errorCorrectionLevel: 'M',
      });
      const matrixSize = qr.modules.size;
      const matrix: boolean[][] = [];
      for (let r = 0; r < matrixSize; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < matrixSize; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }
        matrix.push(row);
      }
      return { matrix, matrixSize };
    } catch (err) {
      console.error('QR Generation Error:', err);
      return null;
    }
  }, [value]);

  if (!qrData) {
    return null;
  }

  const { matrix, matrixSize } = qrData;
  const padding = 1.5;
  const totalGrid = matrixSize + padding * 2;
  const cellSize = size / totalGrid;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md border border-secondary/30 bg-surface shadow-2xl"
      >
        <rect width={size} height={size} fill={bgColor} rx={4} />
        <g transform={`translate(${cellSize * padding}, ${cellSize * padding})`}>
          {matrix.map((row, r) =>
            row.map((cell, c) =>
              cell ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.3}
                  height={cellSize + 0.3}
                  fill={
                    // Highlight corner finder patterns with spotlight orange
                    (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)
                      ? '#FF6B1A'
                      : fgColor
                  }
                  rx={0.3}
                />
              ) : null
            )
          )}
        </g>
      </svg>
      {/* Corner bracket film-festival crosshairs */}
      <span className="absolute -top-1.5 -left-1.5 font-mono text-[11px] font-bold text-tertiary">+</span>
      <span className="absolute -top-1.5 -right-1.5 font-mono text-[11px] font-bold text-tertiary">+</span>
      <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[11px] font-bold text-tertiary">+</span>
      <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[11px] font-bold text-tertiary">+</span>
    </div>
  );
}
