import { AuthProvider } from "./hooks/useAuth";
import "./globals.css";

export const metadata = {
  title: "Smart Backpack | Cuide de sua saúde com tecnologia",
  description: "Smart BackPack",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@800&family=Roboto:wght@100;300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
