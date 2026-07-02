import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: copy.site.title,
  description: copy.site.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
