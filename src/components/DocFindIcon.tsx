"use client";

// Premium abstract DocFind icon - no text, no words, no letters.
// Design: five-petal organic bloom representing wellness/care, with a center orb.
// Brand colors: #36d1cf (teal), #1a8f8d (deep teal), white.

export function DocFindIcon({
  size = 64,
  className = "",
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={animated ? { animation: "icon-bloom-pulse 3s ease-in-out infinite" } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`df-bg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#36d1cf" />
          <stop offset="100%" stopColor="#1a8f8d" />
        </linearGradient>
        <linearGradient id={`df-petal-${size}`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.70" />
        </linearGradient>
        <radialGradient id={`df-center-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e6faf9" />
          <stop offset="100%" stopColor="#36d1cf" />
        </radialGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="512" height="512" rx="112" fill={`url(#df-bg-${size})`} />
      <g transform="translate(256,256)">
        {/* Five petals at 72° intervals */}
        {[0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path
              d="M0,-150 C30,-150 52,-128 52,-98 C52,-68 30,-46 0,-46 C-30,-46 -52,-68 -52,-98 C-52,-128 -30,-150 0,-150 Z"
              fill={`url(#df-petal-${size})`}
            />
          </g>
        ))}
        {/* Center orb */}
        <circle cx="0" cy="0" r="42" fill={`url(#df-center-${size})`} />
        <circle cx="0" cy="0" r="18" fill="#1a8f8d" opacity="0.85" />
      </g>
    </svg>
  );
}

// Splash-screen variant — extra keyframe classes injected inline by SplashScreen
export function DocFindSplashIcon({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: "df-bloom 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="df-splash-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#36d1cf" />
          <stop offset="100%" stopColor="#1a8f8d" />
        </linearGradient>
        <linearGradient id="df-splash-petal" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.70" />
        </linearGradient>
        <radialGradient id="df-splash-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e6faf9" />
          <stop offset="100%" stopColor="#36d1cf" />
        </radialGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="512" height="512" rx="112" fill="url(#df-splash-bg)" />
      <g transform="translate(256,256)">
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <g
            key={deg}
            transform={`rotate(${deg})`}
            style={{
              opacity: 0,
              animation: `df-petal-in 0.3s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + i * 0.04}s forwards`,
            }}
          >
            <path
              d="M0,-150 C30,-150 52,-128 52,-98 C52,-68 30,-46 0,-46 C-30,-46 -52,-68 -52,-98 C-52,-128 -30,-150 0,-150 Z"
              fill="url(#df-splash-petal)"
            />
          </g>
        ))}
        <g style={{ opacity: 0, animation: "df-center-in 0.3s ease-out 0.3s forwards" }}>
          <circle cx="0" cy="0" r="42" fill="url(#df-splash-center)" />
          <circle cx="0" cy="0" r="18" fill="#1a8f8d" opacity="0.85" />
        </g>
      </g>
    </svg>
  );
}
