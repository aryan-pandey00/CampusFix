import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/** Two faces, two jobs. */
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Ticket numbers, timestamps in columns, anything that must line up. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusFix",
  description:
    "Report a campus maintenance issue, track it to a fix, and confirm it yourself.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} antialiased`}
    >
      {/* Height comes from `min-height: 100dvh` on body in globals.css, not
          from a percentage chain — see the note there. */}
      <body>{children}</body>
    </html>
  );
}
