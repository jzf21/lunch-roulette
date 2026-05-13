import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Caprasimo, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: "400",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "What's for lunch?! · Kochi office",
  description: "A living wishlist of every place the team has put up on the wall.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${caprasimo.variable} ${dmSerifDisplay.variable}`}>
      <body style={{ fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
