import Image from "next/image";

/** Le logo Buddy & Beer (public/brand). Décoratif : le nom est toujours écrit à côté. */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  const src = size <= 48 ? "/brand/logo-96.png" : "/brand/logo-192.png";
  return <Image src={src} alt="" width={size} height={size} className={className} style={{ width: size, height: size }} priority />;
}
