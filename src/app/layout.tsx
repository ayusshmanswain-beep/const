import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CONSTRUCT360 | Enterprise GPS Attendance & PostGIS Geofence Engine",
  description:
    "Enterprise Multi-Tenant Construction Operations & Precision PostGIS Geofence Attendance Engine",
  icons: [{ rel: "icon", url: "/icon.svg" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
