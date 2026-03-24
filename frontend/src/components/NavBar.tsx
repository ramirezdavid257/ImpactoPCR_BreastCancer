"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
    { href: "/", label: "📋 Nuevo Registro" },
    { href: "/dashboard", label: "📊 Dashboard" },
]

export default function NavBar() {
    const pathname = usePathname()

    return (
        <nav style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.25rem",
            padding: "0 1rem 0.75rem",
        }}>
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            padding: "0.5rem 1.25rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? "#fff" : "#8d405b",
                            background: isActive
                                ? "linear-gradient(135deg, #e4769a, #c6587c)"
                                : "rgba(255,255,255,0.4)",
                            textDecoration: "none",
                            transition: "all 0.2s ease",
                            boxShadow: isActive ? "0 2px 8px rgba(228,118,154,0.3)" : "none",
                        }}
                    >
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
