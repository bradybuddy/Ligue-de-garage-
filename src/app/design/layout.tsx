import { notFound } from "next/navigation";

// Galerie des composantes : outil de développement, pas une page publique.
export const metadata = { robots: { index: false } };

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") notFound();
  return children;
}
