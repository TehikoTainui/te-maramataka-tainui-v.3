import { useEffect, useRef } from 'react';

interface Props {
  illumination: number;  // 0–100
  phase: string;
  size?: number;
}

export default function MoonCanvas({ illumination, phase, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.44;

    ctx.clearRect(0, 0, size, size);

    // Glow effect
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.4);
    glow.addColorStop(0, 'rgba(245,230,180,0.18)');
    glow.addColorStop(1, 'rgba(245,230,180,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Dark side (moon disk background)
    const darkGrad = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r);
    darkGrad.addColorStop(0, '#1a2030');
    darkGrad.addColorStop(1, '#0a0f1a');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = darkGrad;
    ctx.fill();

    // Draw illuminated portion
    if (illumination > 0) {
      ctx.save();
      // Clip to moon circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const isWaxing = phase.includes('waxing') || phase === 'new' || phase === 'full';
      const litFrac = illumination / 100;

      // The lit half is always drawn as a full semicircle on one side,
      // then an ellipse terminates the boundary
      ctx.beginPath();

      if (isWaxing) {
        // Lit on right (waxing)
        ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
        // Terminator ellipse: x-radius varies 0..r based on illumination
        const tx = r * (1 - 2 * litFrac); // ranges r → -r as illum 0→1
        ctx.bezierCurveTo(cx + tx, cy - r, cx + tx, cy + r, cx, cy + r);
      } else {
        // Lit on left (waning)
        ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
        const tx = r * (2 * litFrac - 1);
        ctx.bezierCurveTo(cx + tx, cy + r, cx + tx, cy - r, cx, cy - r);
      }
      ctx.closePath();

      const litGrad = ctx.createRadialGradient(cx + (isWaxing ? r * 0.2 : -r * 0.2), cy - r * 0.1, 0, cx, cy, r);
      litGrad.addColorStop(0, '#FFF8E7');
      litGrad.addColorStop(0.4, '#F5E6A3');
      litGrad.addColorStop(0.8, '#D4B86A');
      litGrad.addColorStop(1, '#9A7D3A');
      ctx.fillStyle = litGrad;
      ctx.fill();

      ctx.restore();
    }

    // Moon rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = illumination > 5 ? 'rgba(245,230,180,0.3)' : 'rgba(100,120,160,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Craters (decorative, subtle)
    if (illumination > 0) {
      const craters = [
        { x: 0.18, y: -0.1, r: 0.07 },
        { x: -0.2, y: 0.25, r: 0.05 },
        { x: 0.05, y: 0.3, r: 0.04 },
        { x: -0.1, y: -0.3, r: 0.06 },
      ];
      craters.forEach((c) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx + c.x * r * 2, cy + c.y * r * 2, c.r * r, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(cx + c.x * r * 2, cy + c.y * r * 2, c.r * r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fill();
        ctx.restore();
      });
    }
  }, [illumination, phase, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
