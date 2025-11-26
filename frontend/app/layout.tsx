import type { Metadata } from "next";
import { Righteous, Exo_2 } from "next/font/google";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css'
import { ReactQueryProvider } from "./react-query-provider";
import AppWalletProvider from "@/components/AppWalletProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import CreateProfileModal from "@/components/CreateProfileModal";
import Header from "@/components/Header";

const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
});

const exo = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-exo",
});

export const metadata: Metadata = {
  title: "Slick - Solana Social dApp",
  description: "A decentralized social platform built on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${righteous.variable} ${exo.variable} antialiased font-body`}
      >
      <ReactQueryProvider>
            <AppWalletProvider>
              <ProfileProvider>
                <Header/>
                {children}
                <CreateProfileModal />
              </ProfileProvider>
            </AppWalletProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
