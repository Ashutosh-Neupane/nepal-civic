
export function CivicHeroIllustration({
  className = '',
  size = 380,
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 1. Main Circular City & Pin Illustration */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }}
          className="drop-shadow-[0_12px_28px_rgba(14,165,233,0.18)]"
        >
          <defs>
            <linearGradient id="ringGrad" x1="40" y1="40" x2="360" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            <linearGradient id="skyGrad" x1="200" y1="40" x2="200" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="60%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#ccfbf1" />
            </linearGradient>
            <linearGradient id="pinGrad" x1="170" y1="120" x2="230" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
            <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
            <clipPath id="circleClip">
              <circle cx="200" cy="200" r="160" />
            </clipPath>
          </defs>

          {/* Outer Gradient Ring */}
          <circle cx="200" cy="200" r="168" stroke="url(#ringGrad)" strokeWidth="18" strokeLinecap="round" />

          {/* Clipped Inner Artwork */}
          <g clipPath="url(#circleClip)">
            {/* Background Sky */}
            <rect x="20" y="20" width="360" height="360" fill="url(#skyGrad)" />

            {/* Clouds */}
            <path d="M 80 140 Q 100 120 130 125 Q 160 115 180 135 Q 190 150 170 160 L 75 160 Z" fill="#ffffff" opacity="0.6" />
            <path d="M 230 110 Q 250 90 280 95 Q 310 85 330 105 Q 340 120 320 130 L 225 130 Z" fill="#ffffff" opacity="0.5" />

            {/* Background Mountains / Green Hills */}
            <path d="M 30 260 Q 120 190 220 230 Q 320 180 370 250 L 370 380 L 30 380 Z" fill="#86efac" opacity="0.45" />
            <path d="M 30 280 Q 150 210 270 260 Q 340 230 370 290 L 370 380 L 30 380 Z" fill="#bbf7d0" opacity="0.6" />

            {/* City Skyline Buildings */}
            {/* Left Building */}
            <rect x="100" y="160" width="48" height="120" rx="3" fill="#7dd3fc" />
            {/* Left building windows */}
            <rect x="110" y="172" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="122" y="172" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="134" y="172" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="110" y="190" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="122" y="190" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="134" y="190" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="110" y="208" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="122" y="208" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="134" y="208" width="6" height="8" fill="#ffffff" opacity="0.9" />

            {/* Center Tallest Skyscraper */}
            <path d="M 145 140 L 175 105 L 205 140 L 205 280 L 145 280 Z" fill="#38bdf8" />
            <path d="M 175 105 L 205 140 L 205 280 L 175 280 Z" fill="#0284c7" opacity="0.25" />
            {/* Center windows */}
            <rect x="155" y="155" width="7" height="12" fill="#ffffff" opacity="0.9" />
            <rect x="168" y="155" width="7" height="12" fill="#ffffff" opacity="0.9" />
            <rect x="182" y="155" width="7" height="12" fill="#ffffff" opacity="0.9" />
            <rect x="155" y="178" width="7" height="12" fill="#ffffff" opacity="0.9" />
            <rect x="168" y="178" width="7" height="12" fill="#ffffff" opacity="0.9" />
            <rect x="182" y="178" width="7" height="12" fill="#ffffff" opacity="0.9" />

            {/* Right Building */}
            <rect x="205" y="150" width="45" height="130" rx="3" fill="#5eead4" />
            <rect x="215" y="165" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="227" y="165" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="238" y="165" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="215" y="182" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="227" y="182" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="238" y="182" width="6" height="8" fill="#ffffff" opacity="0.9" />

            {/* Far Right Building */}
            <rect x="250" y="180" width="35" height="100" rx="2" fill="#93c5fd" />

            {/* Foreground Green Lawn & House */}
            <path d="M 30 280 Q 100 240 200 260 Q 300 240 370 280 L 370 380 L 30 380 Z" fill="#4ade80" />

            {/* Tree */}
            <rect x="82" y="235" width="6" height="20" fill="#92400e" rx="1" />
            <circle cx="85" cy="225" r="16" fill="#22c55e" />
            <circle cx="78" cy="220" r="10" fill="#4ade80" />

            {/* Little House */}
            <rect x="100" y="235" width="28" height="22" fill="#e0f2fe" />
            <polygon points="96,235 114,218 132,235" fill="#38bdf8" />
            <rect x="108" y="244" width="8" height="13" fill="#0284c7" />

            {/* Winding Highway Road */}
            <path
              d="M 200 250 C 240 270 260 290 230 320 C 190 360 120 370 100 400 L 260 400 C 280 370 340 330 280 290 C 250 270 220 250 200 250 Z"
              fill="#64748b"
            />
            {/* Center Road Dashes */}
            <path
              d="M 205 255 C 245 285 240 310 200 345 C 170 370 145 385 130 400"
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="10 8"
              fill="none"
            />

            {/* Large Location Pin at Road Apex */}
            <g transform="translate(200, 205)" filter="url(#pinShadow)">
              <path
                d="M 0 -48 C -26 -48 -46 -26 -46 0 C -46 32 0 74 0 74 C 0 74 46 32 46 0 C 46 -26 26 -48 0 -48 Z"
                fill="url(#pinGrad)"
              />
              <circle cx="0" cy="-6" r="16" fill="#ffffff" />
            </g>
          </g>
        </svg>
      </div>

      {/* 2. Wordmark */}
      <div className="mt-5 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span className="text-[#002045]">Nepal </span>
          <span className="text-[#c8102e]">Civic</span>
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#002045]/80">नागरिक गुनासो सेवा</p>

        {/* 3. Sub-title Bullets */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs sm:text-sm font-bold text-[#002045]">
          <span>Report</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8102e]" />
          <span>Track</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8102e]" />
          <span>Resolve</span>
        </div>

        {/* 4. Bottom Tagline with Lines */}
        <div className="flex items-center justify-center gap-2 mt-2.5 text-xs text-slate-500 font-medium">
          <span className="w-6 h-[1.5px] bg-slate-300" />
          <span>Ward · Palika · District · Province</span>
          <span className="w-6 h-[1.5px] bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

interface CivicEmblemProps {
  size?: number | string;
  className?: string;
  variant?: 'color' | 'monochrome' | 'watermark';
}

export function CivicEmblem({
  size = 40,
  className = '',
  variant = 'color',
}: CivicEmblemProps) {
  const isWatermark = variant === 'watermark';
  const isMono = variant === 'monochrome';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }}
      className={`select-none flex-shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="emblemGradPrimary" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMono ? 'currentColor' : '#002045'} />
          <stop offset="60%" stopColor={isMono ? 'currentColor' : '#1960a3'} />
          <stop offset="100%" stopColor={isMono ? 'currentColor' : '#00477f'} />
        </linearGradient>
        <linearGradient id="emblemGradAccent" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMono ? 'currentColor' : '#1960a3'} />
          <stop offset="100%" stopColor={isMono ? 'currentColor' : '#7db6ff'} />
        </linearGradient>
      </defs>

      {/* Decorative Outer Rings for Watermark & Ambient Branding */}
      {isWatermark && (
        <>
          <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
        </>
      )}

      {/* Central Interlinked Arc (C-Shaped Connectivity Network) */}
      <path
        d="M 64 34 C 57 27 43 27 36 34 C 28 42 28 58 36 66 C 44 74 56 74 64 66"
        stroke={isMono ? 'currentColor' : 'url(#emblemGradPrimary)'}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Apex Location Marker */}
      <g transform="translate(50, 22)">
        <path
          d="M 0 -7 C -4.2 -7 -7 -4.2 -7 0 C -7 5.2 0 11.5 0 11.5 C 0 11.5 7 5.2 7 0 C 7 -4.2 4.2 -7 0 -7 Z"
          fill={isMono ? 'currentColor' : '#002045'}
        />
        <circle cx="0" cy="-1.5" r="2.2" fill="#ffffff" />
      </g>

      {/* Interconnected Network Nodes */}
      <circle cx="36" cy="34" r="3.8" fill={isMono ? 'currentColor' : '#1960a3'} stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="36" cy="66" r="3.8" fill={isMono ? 'currentColor' : '#1960a3'} stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="64" cy="66" r="4.8" fill={isMono ? 'currentColor' : '#002045'} stroke="#ffffff" strokeWidth="1.4" />
      <circle cx="68" cy="48" r="3.2" fill={isMono ? 'currentColor' : '#7db6ff'} stroke="#ffffff" strokeWidth="1" />

      {/* Network Bridge Link */}
      <line
        x1="64"
        y1="66"
        x2="68"
        y2="48"
        stroke={isMono ? 'currentColor' : '#1960a3'}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  variant?: 'light' | 'dark';
  subtitle?: string;
}

export function BrandLogo({
  size = 'md',
  showText = true,
  textClassName = 'text-on-surface',
  variant = 'dark',
  subtitle = 'नागरिक गुनासो सेवा',
}: BrandLogoProps) {
  const sizeMap = {
    sm: { px: 28, text: 'text-base', subText: 'text-[9px]' },
    md: { px: 36, text: 'text-lg', subText: 'text-[10px]' },
    lg: { px: 48, text: 'text-2xl', subText: 'text-xs' },
    xl: { px: 64, text: 'text-3xl', subText: 'text-sm' },
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`rounded-2xl ${
          variant === 'light'
            ? 'bg-surface-container-lowest shadow-sm border border-outline-variant/60'
            : 'bg-primary/10 border border-primary/20'
        } p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <CivicEmblem size={sizeMap[size].px} variant={variant === 'light' ? 'color' : 'color'} />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className={`font-bold tracking-tight ${sizeMap[size].text} ${textClassName}`}>
              Nepal <span className="text-[#c8102e] font-extrabold">Civic</span>
            </span>
          </div>
          <span className={`uppercase tracking-wider text-on-surface-variant font-medium mt-0.5 ${sizeMap[size].subText}`}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
