"use client";

import { DocFindIcon } from "./DocFindIcon";

interface DocFindLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

export default function DocFindLogo({ size = "md", showText = true, className = "", animated = false }: DocFindLogoProps) {
  const sizes = {
    sm: 24,
    md: 36,
    lg: 48,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <DocFindIcon size={sizes[size]} animated={animated} />
      {showText && (
        <span className={`${textSizes[size]} font-bold text-gray-900`}>
          Doc<span style={{ color: "#36d1cf" }}>Find</span>
        </span>
      )}
    </div>
  );
}
