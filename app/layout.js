import "./globals.css";

export const metadata = {
  title: "El Pela | Playa Brava Jose Ignacio 360",
  description: "Interactive 360 panorama viewer for Playa Brava Jose Ignacio.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
