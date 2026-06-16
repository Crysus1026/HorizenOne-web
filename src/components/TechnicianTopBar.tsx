"use client";

import Image from "next/image";

type TechnicianTopBarProps = {
  title?: string;
  subtitle?: string;
};

export default function TechnicianTopBar({
  title = "Technician Portal",
  subtitle,
}: TechnicianTopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-28 items-center justify-between border-b border-cyan-500 bg-black px-4">
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="HorizenOne"
          width={100}
          height={100}
          priority
          className="h-20 w-auto object-contain"
        />
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold text-white">
          {title}
        </p>

        {subtitle && (
          <p className="text-sm text-cyan-400">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}