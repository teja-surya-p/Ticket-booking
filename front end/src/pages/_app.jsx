import { Manrope, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "./_app.module.css";
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});
export default function App({
  Component,
  pageProps
}) {
  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className={[manrope.variable, spaceGrotesk.variable, "app-root"].filter(Boolean).join(" ")}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>;
}
