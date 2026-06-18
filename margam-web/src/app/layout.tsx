import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Inter, Open_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const openSans = Open_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Margam — Institution Portal",
  description: "Digital Backbone of Institutions",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("margam_theme")?.value;
  let themeStyles = {} as React.CSSProperties;

  if (themeCookie) {
    try {
      const themeData = JSON.parse(decodeURIComponent(themeCookie));
      
      const getFontVar = (fontName: string | undefined, fallback: string) => {
        if (!fontName) return `var(--font-${fallback})`;
        const normalized = fontName.toLowerCase().replace(/\s+/g, "");
        if (normalized === "poppins") return "var(--font-poppins)";
        if (normalized === "inter") return "var(--font-inter)";
        if (normalized === "opensans" || normalized === "open-sans") return "var(--font-open-sans)";
        return `var(--font-${fallback})`;
      };

      themeStyles = {
        "--primary": themeData.colors?.primary ?? "#0D1B2A",
        "--primary-alt": themeData.colors?.primaryAlt ?? "#162A56",
        "--secondary": themeData.colors?.secondary ?? "#D4AF37",
        "--secondary-light": themeData.colors?.secondaryLight ?? "#F2C14E",
        "--charcoal": themeData.colors?.charcoal ?? "#333333",
        "--steel-gray": themeData.colors?.steelGray ?? "#6B7280",
        "--light-gray": themeData.colors?.lightGray ?? "#E5E7EB",
        "--cream": themeData.colors?.cream ?? "#F7F3EB",
        "--white": themeData.colors?.white ?? "#FFFFFF",
        "--success": themeData.colors?.success ?? "#22C55E",
        "--warning": themeData.colors?.warning ?? "#EAB308",
        "--danger": themeData.colors?.danger ?? "#EF4444",

        "--font-heading": getFontVar(themeData.fonts?.heading, "poppins"),
        "--font-body": getFontVar(themeData.fonts?.body, "inter"),
        "--font-caption": getFontVar(themeData.fonts?.caption, "open-sans"),
      } as React.CSSProperties;
    } catch (e) {
      console.error("Error parsing theme cookie in RootLayout:", e);
    }
  }

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} ${openSans.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyles}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}

