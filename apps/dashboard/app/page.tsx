'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Pixel art YTAPI logo
const LogoSVG = () => {
  const iconMatrix = [
    [0,0,0,0,1,0,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0],
    [0,0,1,1,0,1,0,1,1,0,0],
    [0,1,1,0,0,0,0,0,1,1,0],
    [1,1,0,0,1,1,1,0,0,1,1],
    [0,1,1,0,1,0,1,0,1,1,0],
    [1,1,0,0,1,1,1,0,0,1,1],
    [0,1,1,0,0,0,0,0,1,1,0],
    [0,0,1,1,0,1,0,1,1,0,0],
    [0,0,0,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,0,1,0,0,0,0]
  ];

  const textMatrix = [
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,1,1,0, 0,0,0,0, 0,1,1,0, 0,1,0,0, 0,1,1,0],
    [1,0,0,1, 0,1,1,1, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,0,0,1, 1,0,0,1, 0,1,1,0, 0,1,0,0, 0,1,1,0],
    [1,0,0,1, 1,0,0,1, 0,0,0,1, 0,1,0,0, 0,0,0,1],
    [0,1,1,0, 0,1,1,1, 1,1,1,0, 0,1,0,0, 1,1,1,0]
  ];

  const pixelSize = 4;
  const iconWidth = iconMatrix[0].length * pixelSize;
  const iconHeight = iconMatrix.length * pixelSize;
  const textWidth = textMatrix[0].length * pixelSize;
  const textHeight = textMatrix.length * pixelSize;

  let svgHTML = `<svg id="logo-svg" width="${iconWidth + textWidth + 16}" height="${Math.max(iconHeight, textHeight)}" viewBox="0 0 ${iconWidth + textWidth + 16} ${Math.max(iconHeight, textHeight)}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Icon
  iconMatrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if(val === 1) {
        svgHTML += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="#FFF" />`;
      }
    });
  });

  // Text
  const textOffsetX = iconWidth + 16;
  const textOffsetY = (iconHeight - textHeight) / 2 + 2;
  textMatrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if(val === 1) {
        svgHTML += `<rect x="${textOffsetX + (x * pixelSize)}" y="${textOffsetY + (y * pixelSize)}" width="${pixelSize}" height="${pixelSize}" fill="#FFF" />`;
      }
    });
  });

  svgHTML += `</svg>`;
  
  return <div dangerouslySetInnerHTML={{ __html: svgHTML }} />;
};

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [bootText, setBootText] = useState<string[]>([]);

  // Boot sequence animation
  useEffect(() => {
    const bootLines = [
      '> SYS.INIT // CORE_01',
      '> LOADING KERNEL...',
      '> MOUNTING FILESYSTEMS...',
      '> INITIALIZING SECURITY PROTOCOLS...',
      '> CHECKING AUTHENTICATION...',
    ];

    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < bootLines.length) {
        setBootText(prev => [...prev, bootLines[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          checkAuth();
        }, 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const adminPassword = localStorage.getItem('ytapi_admin_password');
    if (adminPassword) {
      try {
        const res = await fetch('/api/keys/stats', {
          headers: { 'x-admin-password': adminPassword },
        });
        if (res.ok) {
          window.location.href = '/dashboard';
          return;
        }
      } catch {}
      localStorage.removeItem('ytapi_admin_password');
    }
    setIsChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/keys/stats', {
        headers: { 'x-admin-password': password },
      });

      if (res.ok) {
        localStorage.setItem('ytapi_admin_password', password);
        window.location.href = '/dashboard';
      } else {
        setError('ACCESS DENIED: INVALID PASSWORD');
      }
    } catch {
      setError('CONNECTION FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center scale-150">
            <LogoSVG />
          </div>
          <div className="space-y-1 font-mono text-lg text-fg/80">
            {bootText.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-success">{line}</span>
                {i === bootText.length - 1 && (
                  <span className="blink">_</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      {/* Matrix canvas background */}
      <canvas 
        id="matrix-bg"
        className="fixed inset-0 opacity-20"
        style={{ imageRendering: 'pixelated' }}
      />
      
      <div className="relative z-10 w-full max-w-md">
        {/* System label top */}
        <div className="sys-label absolute -top-8 left-0">
          SYS.INIT // CORE_01
        </div>

        {/* Logo */}
        <div className="mb-12 flex justify-center scale-150">
          <LogoSVG />
        </div>

        {/* Login Form */}
        <div className="terminal-border bg-card/50 p-8">
          <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
            <span className="text-muted">[</span>
            <span className="text-warning">AUTH</span>
            <span className="text-muted">]</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="sys-label mb-2 block">PASSWORD // INPUT</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER PASSWORD"
                className="terminal-input w-full"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="border border-error/50 bg-error/10 p-3 text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="terminal-btn primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  VERIFYING...
                </span>
              ) : (
                <span>AUTHENTICATE</span>
              )}
            </button>
          </form>
        </div>

        {/* System label bottom */}
        <div className="sys-label absolute -bottom-8 left-0">
          V 1.0.0 // TERMINAL_ACCESS
        </div>
        
        <div className="sys-label absolute -bottom-8 right-0 text-right">
          YTAPI // DASHBOARD
        </div>
      </div>
    </div>
  );
}
