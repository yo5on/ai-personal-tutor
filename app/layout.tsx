import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const heading = Source_Serif_4({ variable: "--font-heading", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: "AI Personal Tutor", template: "%s · AI Personal Tutor" },
  description: "Learn at your own pace with a personal tutor, your own study materials, quizzes and progress tracking.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-[15px]">{children}</body>
    </html>
  );
}
