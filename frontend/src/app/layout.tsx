import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Impacto pCR — Registro de Pacientes",
  description: "Sistema de recolección de datos para el estudio de impacto de Respuesta Patológica Completa en Cáncer de Mama según Subtipo Molecular.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen" style={{ backgroundColor: "#F9F8F4" }}>
        {/* ===== HEADER ===== */}
        <header
          className="w-full sticky top-0 z-50"
          style={{
            background: "rgba(252, 228, 236, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 30px rgba(31, 38, 135, 0.06)",
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-5 text-center">
            {/* Ribbon Image */}
            <div className="flex justify-center mb-2">
              <img
                src="/ribbon.png"
                alt="Pink Ribbon - Breast Cancer Awareness"
                className="h-14 w-auto object-contain drop-shadow-sm"
              />
            </div>
            {/* Project Title */}
            <h1
              className="text-lg md:text-xl font-extrabold tracking-tight leading-tight"
              style={{ color: "#8d405b" }}
            >
              IMPACTO DE LA RESPUESTA PATOLÓGICA COMPLETA (pCR) EN LA SUPERVIVENCIA GLOBAL (OS) TRAS QUIMIOTERAPIA NEOADYUVANTE EN CÁNCER DE MAMA SEGÚN EL SUBTIPO MOLECULAR
            </h1>
            {/* Authors */}
            <p className="mt-1 text-sm font-normal" style={{ color: "#a05b75" }}>
              Dra. Alejandra Zavala · Dra. Sujeidy Gómez
            </p>
          </div>
          {/* Navigation */}
          <NavBar />
        </header>

        <main>{children}</main>

        {/* ===== FOOTER ===== */}
        <footer className="text-center py-6 text-xs" style={{ color: "#c6a0af" }}>
          © 2026 · Instrumento digital de recolección de datos
        </footer>
      </body>
    </html>
  );
}
