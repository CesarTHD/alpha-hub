import Image from "next/image";

// Proporção real do arquivo public/logo-alpha.png (130x138).
const LOGO_ASPECT = 138 / 130;

export function AlphaLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Image src="/logo-alpha.png" alt="" width={60} height={Math.round(60 * LOGO_ASPECT)} />
      <div className="flex flex-col leading-none">
        <span className="text-xl font-bold tracking-tight text-white">Alpha</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          assessoria
        </span>
      </div>
    </div>
  );
}

export function AlphaMarkImage({ size = 80 }: { size?: number }) {
  return <Image src="/logo-alpha.png" alt="" width={size} height={Math.round(size * LOGO_ASPECT)} />;
}
