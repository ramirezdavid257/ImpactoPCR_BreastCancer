"use client"

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"

/* ===== Types ===== */
interface Patient {
    id: string
    patient_identifier: string
    date_of_birth: string
    age_at_diagnosis: number
    menopausal_status: string
    lateralidad: string
    histological_type: string
    tumor_grade: string
    c_t: string
    c_n: string
    clinical_stage: string
    er_percent: number
    pr_percent: number
    her2: string
    fish: string | null
    ki67_percent: number
    molecular_subtype: string
    lymphovascular_invasion: string
    neoadjuvant_scheme: string
    directed_therapy: string | null
    completed_cycles: number
    toxicity_suspension: boolean
    toxicity_reason: string | null
    surgery_type: string
    axillary_management: string
    yp_t: string
    yp_n: string
    pcr_achieved: boolean
    rcb_class: string
    surgery_date: string
    adjuvant_treatment: string | null
    current_status: string
    last_contact_date: string | null
    recurrence_date: string | null
    death_date: string | null
    cause_of_death: string | null
    created_at: string
}

/* ===== Styles ===== */
const glassPanel: React.CSSProperties = {
    background: "rgba(252, 228, 236, 0.4)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
    borderRadius: "1rem",
    padding: "1.5rem",
}

const thStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#8d405b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "2px solid rgba(228, 118, 154, 0.3)",
    whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
    padding: "0.625rem 1rem",
    fontSize: "0.8125rem",
    color: "#444",
    borderBottom: "1px solid rgba(228, 118, 154, 0.1)",
    whiteSpace: "nowrap",
}

const btnStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #e4769a, #c6587c)",
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.5rem 1.25rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(228,118,154,0.3)",
}

const btnOutlineStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.6)",
    color: "#8d405b",
    border: "1px solid rgba(228,118,154,0.4)",
    borderRadius: "0.5rem",
    padding: "0.5rem 1.25rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
}

const selectFilterStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.8125rem",
    color: "#555",
    cursor: "pointer",
    outline: "none",
}

const MOLECULAR_SUBTYPES = [
    "Luminal A-like",
    "Luminal B-like (HER2 negativo)",
    "Luminal B-like (HER2 positivo)",
    "HER2-enriquecido (RE/RP negativo)",
    "Triple Negativo",
]

const TABLE_COLUMNS = [
    { key: "patient_identifier", label: "ID" },
    { key: "age_at_diagnosis", label: "Edad" },
    { key: "menopausal_status", label: "Menopausia" },
    { key: "lateralidad", label: "Lateralidad" },
    { key: "histological_type", label: "Histología" },
    { key: "tumor_grade", label: "Grado" },
    { key: "clinical_stage", label: "Estadio" },
    { key: "molecular_subtype", label: "Subtipo Molecular" },
    { key: "lymphovascular_invasion", label: "Invasión Linfovascular" },
    { key: "her2", label: "HER2" },
    { key: "ki67_percent", label: "Ki-67%" },
    { key: "neoadjuvant_scheme", label: "Esquema Neo" },
    { key: "pcr_achieved", label: "pCR" },
    { key: "rcb_class", label: "RCB" },
    { key: "current_status", label: "Estado" },
    { key: "surgery_date", label: "F. Cirugía" },
    { key: "actions", label: "Acciones" },
]

/* ===== CSV Export ===== */
function exportToCSV(patients: Patient[]) {
    if (patients.length === 0) return

    const allKeys = Object.keys(patients[0]) as (keyof Patient)[]
    const headerRow = allKeys.join(",")

    const dataRows = patients.map((p) =>
        allKeys
            .map((key) => {
                const val = p[key]
                if (val === null || val === undefined) return ""
                if (typeof val === "boolean") return val ? "Sí" : "No"
                const str = String(val)
                // Escape commas and quotes for CSV
                if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                    return `"${str.replace(/"/g, '""')}"`
                }
                return str
            })
            .join(",")
    )

    const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n") // BOM for Excel
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `impacto_pcr_datos_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

/* ===== DASHBOARD COMPONENT ===== */
export default function Dashboard() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterSubtype, setFilterSubtype] = useState<string>("")
    const [searchText, setSearchText] = useState<string>("")

    async function fetchPatients() {
        setLoading(true)
        setError(null)
        try {
            let query = supabase.from("patients").select("*").order("created_at", { ascending: false })
            if (filterSubtype) {
                query = query.eq("molecular_subtype", filterSubtype)
            }
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            setPatients(data || [])
        } catch (err: unknown) {
            console.error("Error fetching patients:", err)
            setError(err instanceof Error ? err.message : "Error al cargar datos")
            setPatients(getDemoData())
        } finally {
            setLoading(false)
        }
    }

    // Fetch patients
    useEffect(() => {
        fetchPatients()
    }, [filterSubtype])

    async function handleDelete(id: string) {
        if (!confirm("¿Está seguro de que desea eliminar este registro?")) return

        try {
            const { error } = await supabase.from("patients").delete().eq("id", id)
            if (error) throw error
            setPatients(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            console.error("Error deleting patient:", err)
            alert("Error al eliminar el registro")
        }
    }

    // Filter by search text
    const filteredPatients = useMemo(() => {
        if (!searchText.trim()) return patients
        const q = searchText.toLowerCase()
        return patients.filter(
            (p) =>
                p.patient_identifier.toLowerCase().includes(q) ||
                p.molecular_subtype.toLowerCase().includes(q) ||
                p.current_status.toLowerCase().includes(q)
        )
    }, [patients, searchText])

    // Stats
    const stats = useMemo(() => {
        const total = patients.length
        const pcrYes = patients.filter((p) => p.pcr_achieved).length
        const pcrRate = total > 0 ? ((pcrYes / total) * 100).toFixed(1) : "0"
        const subtypeCounts: Record<string, number> = {}
        patients.forEach((p) => {
            subtypeCounts[p.molecular_subtype] = (subtypeCounts[p.molecular_subtype] || 0) + 1
        })
        return { total, pcrYes, pcrRate, subtypeCounts }
    }, [patients])

    return (
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2rem 1rem" }}>
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8d405b" }}>
                    Dashboard de Registros
                </h2>
                <p style={{ color: "#a05b75", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    Consulta de pacientes registrados en el estudio
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={glassPanel}>
                    <p style={{ fontSize: "0.75rem", color: "#a05b75", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Total Pacientes</p>
                    <p style={{ fontSize: "2rem", fontWeight: 800, color: "#8d405b", marginTop: "0.25rem" }}>{stats.total}</p>
                </div>
                <div style={glassPanel}>
                    <p style={{ fontSize: "0.75rem", color: "#a05b75", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>pCR Alcanzada</p>
                    <p style={{ fontSize: "2rem", fontWeight: 800, color: "#8d405b", marginTop: "0.25rem" }}>{stats.pcrYes}</p>
                    <p style={{ fontSize: "0.75rem", color: "#999" }}>Tasa: {stats.pcrRate}%</p>
                </div>
                <div style={glassPanel}>
                    <p style={{ fontSize: "0.75rem", color: "#a05b75", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Subtipos Registrados</p>
                    <p style={{ fontSize: "2rem", fontWeight: 800, color: "#8d405b", marginTop: "0.25rem" }}>{Object.keys(stats.subtypeCounts).length}</p>
                </div>
            </div>

            {/* Filters & Actions Bar */}
            <div style={{
                ...glassPanel,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "1.5rem",
            }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                        value={filterSubtype}
                        onChange={(e) => setFilterSubtype(e.target.value)}
                        style={selectFilterStyle}
                    >
                        <option value="">Todos los subtipos</option>
                        {MOLECULAR_SUBTYPES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Buscar ID, subtipo, estado..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{
                            ...selectFilterStyle,
                            minWidth: "220px",
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        onClick={() => exportToCSV(filteredPatients)}
                        style={btnStyle}
                        onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.03)" }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)" }}
                    >
                        ⬇ Exportar CSV
                    </button>
                    <a href="/" style={{ textDecoration: "none" }}>
                        <button type="button" style={btnOutlineStyle}>
                            + Nuevo Registro
                        </button>
                    </a>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{
                    background: "rgba(252,228,236,0.6)",
                    border: "1px solid #e4769a",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "1rem",
                    fontSize: "0.8125rem",
                    color: "#8d405b",
                }}>
                    ⚠ {error}. Mostrando datos de demostración.
                </div>
            )}

            {/* Table */}
            <div style={{
                ...glassPanel,
                padding: 0,
                overflow: "hidden",
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "rgba(252,228,236,0.3)" }}>
                                {TABLE_COLUMNS.map((col) => (
                                    <th key={col.key} style={thStyle}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} style={{ ...tdStyle, textAlign: "center", padding: "3rem", color: "#999" }}>
                                        Cargando registros...
                                    </td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} style={{ ...tdStyle, textAlign: "center", padding: "3rem", color: "#999" }}>
                                        No hay registros {filterSubtype && `para subtipo "${filterSubtype}"`}
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient, i) => (
                                    <tr
                                        key={patient.id}
                                        style={{
                                            background: i % 2 === 0 ? "rgba(255,255,255,0.3)" : "rgba(252,228,236,0.15)",
                                            transition: "background 0.15s ease",
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(228,118,154,0.1)" }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.3)" : "rgba(252,228,236,0.15)" }}
                                    >
                                        {TABLE_COLUMNS.map((col) => {
                                            const value = patient[col.key as keyof Patient]
                                            return (
                                                <td key={col.key} style={tdStyle}>
                                                    {col.key === "pcr_achieved" ? (
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "0.125rem 0.5rem",
                                                            borderRadius: "9999px",
                                                            fontSize: "0.75rem",
                                                            fontWeight: 600,
                                                            background: value ? "rgba(72,187,120,0.15)" : "rgba(245,101,101,0.15)",
                                                            color: value ? "#276749" : "#9b2c2c",
                                                        }}>
                                                            {value ? "SÍ" : "NO"}
                                                        </span>
                                                    ) : col.key === "current_status" ? (
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "0.125rem 0.5rem",
                                                            borderRadius: "9999px",
                                                            fontSize: "0.75rem",
                                                            fontWeight: 500,
                                                            background:
                                                                value === "Vivo sin enfermedad" ? "rgba(72,187,120,0.15)" :
                                                                    value === "Fallecido" ? "rgba(245,101,101,0.15)" :
                                                                        "rgba(237,137,54,0.15)",
                                                            color:
                                                                value === "Vivo sin enfermedad" ? "#276749" :
                                                                    value === "Fallecido" ? "#9b2c2c" :
                                                                        "#9c4221",
                                                        }}>
                                                            {String(value)}
                                                        </span>
                                                    ) : col.key === "actions" ? (
                                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                                            <button
                                                                onClick={() => window.location.href = `/?id=${patient.id}`}
                                                                style={{
                                                                    ...btnOutlineStyle,
                                                                    padding: "0.25rem 0.625rem",
                                                                    fontSize: "0.75rem",
                                                                    borderColor: "rgba(74, 144, 226, 0.4)",
                                                                    color: "#4a90e2"
                                                                }}
                                                            >
                                                                ✎ Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(patient.id)}
                                                                style={{
                                                                    ...btnOutlineStyle,
                                                                    padding: "0.25rem 0.625rem",
                                                                    fontSize: "0.75rem",
                                                                    borderColor: "rgba(245, 101, 101, 0.4)",
                                                                    color: "#f56565"
                                                                }}
                                                            >
                                                                🗑 Borrar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        String(value ?? "—")
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                <div style={{
                    padding: "0.75rem 1rem",
                    borderTop: "1px solid rgba(228,118,154,0.15)",
                    fontSize: "0.75rem",
                    color: "#999",
                    display: "flex",
                    justifyContent: "space-between",
                }}>
                    <span>Mostrando {filteredPatients.length} de {patients.length} registros</span>
                    <span>Exportación CSV compatible con Excel y SPSS</span>
                </div>
            </div>
        </div>
    )
}

/* ===== DEMO DATA ===== */
function getDemoData(): Patient[] {
    return [
        {
            id: "demo-1",
            patient_identifier: "HC-00123",
            date_of_birth: "1975-06-15",
            age_at_diagnosis: 48,
            menopausal_status: "Post-menopáusica",
            lateralidad: "Izquierda",
            histological_type: "Ductal Infiltrante",
            tumor_grade: "G2",
            c_t: "T2", c_n: "N1",
            clinical_stage: "IIB",
            er_percent: 85, pr_percent: 60,
            her2: "1+", fish: null,
            ki67_percent: 25,
            molecular_subtype: "Luminal B-like (HER2 negativo)",
            lymphovascular_invasion: "No",
            neoadjuvant_scheme: "Antraciclinas + Taxanos",
            directed_therapy: null,
            completed_cycles: 6,
            toxicity_suspension: false, toxicity_reason: null,
            surgery_type: "Mastectomía",
            axillary_management: "Disección Axilar",
            yp_t: "T1", yp_n: "N0",
            pcr_achieved: false,
            rcb_class: "Clase II",
            surgery_date: "2025-09-20",
            adjuvant_treatment: "Radioterapia, Hormonoterapia",
            current_status: "Vivo sin enfermedad",
            last_contact_date: "2026-02-15",
            recurrence_date: null, death_date: null, cause_of_death: null,
            created_at: "2025-10-01T10:00:00Z",
        },
        {
            id: "demo-2",
            patient_identifier: "HC-00456",
            date_of_birth: "1968-03-22",
            age_at_diagnosis: 55,
            menopausal_status: "Post-menopáusica",
            lateralidad: "Derecha",
            histological_type: "Ductal Infiltrante",
            tumor_grade: "G3",
            c_t: "T3", c_n: "N2",
            clinical_stage: "IIIA",
            er_percent: 0, pr_percent: 0,
            her2: "3+", fish: null,
            ki67_percent: 70,
            molecular_subtype: "HER2-enriquecido (RE/RP negativo)",
            lymphovascular_invasion: "Sí",
            neoadjuvant_scheme: "Antraciclinas + Taxanos",
            directed_therapy: "Trastuzumab",
            completed_cycles: 6,
            toxicity_suspension: false, toxicity_reason: null,
            surgery_type: "Mastectomía",
            axillary_management: "Disección Axilar",
            yp_t: "T0", yp_n: "N0",
            pcr_achieved: true,
            rcb_class: "Clase 0",
            surgery_date: "2025-08-10",
            adjuvant_treatment: "Radioterapia",
            current_status: "Vivo sin enfermedad",
            last_contact_date: "2026-01-20",
            recurrence_date: null, death_date: null, cause_of_death: null,
            created_at: "2025-08-15T10:00:00Z",
        },
        {
            id: "demo-3",
            patient_identifier: "HC-00789",
            date_of_birth: "1982-11-08",
            age_at_diagnosis: 41,
            menopausal_status: "Pre-menopáusico",
            lateralidad: "Izquierda",
            histological_type: "Ductal Infiltrante",
            tumor_grade: "G3",
            c_t: "T2", c_n: "N1",
            clinical_stage: "IIB",
            er_percent: 0, pr_percent: 0,
            her2: "0", fish: null,
            ki67_percent: 80,
            molecular_subtype: "Triple Negativo",
            lymphovascular_invasion: "No",
            neoadjuvant_scheme: "Antraciclinas + Taxanos",
            directed_therapy: "Inmunoterapia",
            completed_cycles: 8,
            toxicity_suspension: true, toxicity_reason: "Neutropenia severa",
            surgery_type: "Conservadora",
            axillary_management: "Ganglio Centinela",
            yp_t: "T0", yp_n: "N0",
            pcr_achieved: true,
            rcb_class: "Clase 0",
            surgery_date: "2025-11-05",
            adjuvant_treatment: "Radioterapia",
            current_status: "Vivo sin enfermedad",
            last_contact_date: "2026-03-01",
            recurrence_date: null, death_date: null, cause_of_death: null,
            created_at: "2025-11-10T10:00:00Z",
        },
        {
            id: "demo-4",
            patient_identifier: "HC-01012",
            date_of_birth: "1960-07-30",
            age_at_diagnosis: 63,
            menopausal_status: "Post-menopáusica",
            lateralidad: "Bilateral",
            histological_type: "Lobulillar Infiltrante",
            tumor_grade: "G2",
            c_t: "T3", c_n: "N1",
            clinical_stage: "IIIA",
            er_percent: 90, pr_percent: 70,
            her2: "0", fish: null,
            ki67_percent: 15,
            molecular_subtype: "Luminal A-like",
            lymphovascular_invasion: "No evaluable",
            neoadjuvant_scheme: "Antraciclinas + Taxanos",
            directed_therapy: null,
            completed_cycles: 4,
            toxicity_suspension: true, toxicity_reason: "Cardiotoxicidad",
            surgery_type: "Mastectomía",
            axillary_management: "Disección Axilar",
            yp_t: "T2", yp_n: "N1",
            pcr_achieved: false,
            rcb_class: "Clase III",
            surgery_date: "2025-07-15",
            adjuvant_treatment: "Hormonoterapia",
            current_status: "Vivo con recurrencia",
            last_contact_date: "2026-02-28",
            recurrence_date: "2026-01-10", death_date: null, cause_of_death: null,
            created_at: "2025-07-20T10:00:00Z",
        },
    ]
}
