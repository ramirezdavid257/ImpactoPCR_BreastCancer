"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import React, { useState, useRef, useEffect } from "react"

/* ===== HELPERS ===== */
const requiredEnum = (values: readonly [string, ...string[]], label: string) =>
    z.enum(values, {
        errorMap: () => ({ message: `Seleccione ${label}` }),
    })

const optionalDate = z.preprocess((val) => {
    if (!val || val === "" || (val instanceof Date && isNaN(val.getTime()))) return null;
    return val;
}, z.coerce.date().nullable().optional());

/* ===== ZOD SCHEMA ===== */
const formSchema = z.object({
    id: z.string().optional(),
    patient_identifier: z.string().min(1, "Ingrese el ID del paciente"),
    date_of_birth: z.date({
        required_error: "Ingrese la fecha de nacimiento",
        invalid_type_error: "Fecha inválida",
    }),
    age_at_diagnosis: z.coerce
        .number({ invalid_type_error: "Ingrese la edad" })
        .min(18, "Mínimo 18 años")
        .max(120, "Máximo 120 años"),
    menopausal_status: requiredEnum(["Pre-menopáusico", "Post-menopáusica"], "el estado menopáusico"),
    lateralidad: requiredEnum(["Izquierda", "Derecha", "Bilateral"], "la lateralidad"),
    histological_type: requiredEnum(["Ductal Infiltrante", "Lobulillar Infiltrante", "Otros"], "el tipo histológico"),
    tumor_grade: requiredEnum(["G1", "G2", "G3"], "el grado histológico"),
    c_t: requiredEnum(["T1", "T2", "T3", "T4"], "el cT"),
    c_n: requiredEnum(["N0", "N1", "N2", "N3"], "el cN"),
    clinical_stage: requiredEnum(["I", "IIA", "IIB", "IIIA", "IIIB", "IIIC"], "el estadio clínico"),
    er_percent: z.coerce
        .number({ invalid_type_error: "Ingrese el porcentaje" })
        .min(0, "Mínimo 0%")
        .max(100, "Máximo 100%"),
    pr_percent: z.coerce
        .number({ invalid_type_error: "Ingrese el porcentaje" })
        .min(0, "Mínimo 0%")
        .max(100, "Máximo 100%"),
    her2: requiredEnum(["0", "1+", "2+", "3+"], "el HER2"),
    fish: z.enum(["Amplificado", "No amplificado"], {
        errorMap: () => ({ message: "Seleccione el resultado FISH" }),
    }).optional().nullable(),
    ki67_percent: z.coerce
        .number({ invalid_type_error: "Ingrese el porcentaje" })
        .min(0, "Mínimo 0%")
        .max(100, "Máximo 100%"),
    molecular_subtype: requiredEnum(
        ["Luminal A-like", "Luminal B-like (HER2 negativo)", "Luminal B-like (HER2 positivo)", "HER2-enriquecido (RE/RP negativo)", "Triple Negativo"],
        "el subtipo molecular"
    ),
    neoadjuvant_scheme: requiredEnum(["Antraciclinas + Taxanos", "Solo Taxanos", "Otros"], "el esquema"),
    neoadjuvant_completion_date: optionalDate,
    directed_therapy: z.string().optional(),
    completed_cycles: z.coerce
        .number({ invalid_type_error: "Ingrese el número de ciclos" })
        .min(1, "Mínimo 1 ciclo"),
    toxicity_suspension: z.boolean().default(false),
    toxicity_reason: z.string().optional(),
    surgery_type: requiredEnum(["Conservadora", "Mastectomía"], "el tipo de cirugía"),
    axillary_management: requiredEnum(["Ganglio Centinela", "Disección Axilar"], "el manejo axilar"),
    yp_t: requiredEnum(["T0", "Tis", "T1", "T2", "T3", "T4"], "el ypT"),
    yp_n: requiredEnum(["N0", "N1", "N2", "N3"], "el ypN"),
    pcr_achieved: z.boolean(),
    rcb_class: requiredEnum(["Clase 0", "Clase I", "Clase II", "Clase III"], "la clase RCB"),
    surgery_date: z.date({
        required_error: "Ingrese la fecha de cirugía",
        invalid_type_error: "Fecha inválida",
    }),
    adjuvant_treatment: z.string().optional(),
    current_status: requiredEnum(
        ["Vivo sin enfermedad", "Vivo con recurrencia", "Fallecido"],
        "el estado actual"
    ),
    last_contact_date: optionalDate,
    recurrence_date: optionalDate,
    death_date: optionalDate,
    cause_of_death: z.enum(["Relacionada al Cáncer de Mama", "Otra causa", "Desconocida", "No aplica"], {
        errorMap: () => ({ message: "Seleccione una opción" }),
    }).optional().nullable(),
    lymphovascular_invasion: requiredEnum(["No", "Sí", "No evaluable"], "la invasión linfovascular"),
}).superRefine((data, ctx) => {
    if (data.her2 === "2+" && !data.fish) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "FISH es requerido cuando HER2 es 2+", path: ["fish"] })
    }
    if (data.toxicity_suspension && !data.toxicity_reason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Especifique cuál toxicidad causó suspensión", path: ["toxicity_reason"] })
    }
})

type FormData = z.infer<typeof formSchema>

/* ===== REUSABLE COMPONENTS ===== */
const glassPanel: React.CSSProperties = {
    background: "rgba(252, 228, 236, 0.4)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
    borderRadius: "1rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    transition: "all 0.3s ease",
}

const baseInputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    width: "100%",
    height: "2.5rem",
    outline: "none",
    color: "#333",
    transition: "all 0.2s ease",
}

const errorInputBorder: React.CSSProperties = {
    borderColor: "#e53e3e",
    boxShadow: "0 0 0 2px rgba(229, 62, 62, 0.15)",
}

const getInputStyle = (hasError: boolean): React.CSSProperties => ({
    ...baseInputStyle,
    ...(hasError ? errorInputBorder : {}),
})

const getSelectStyle = (hasError: boolean): React.CSSProperties => ({
    ...baseInputStyle,
    cursor: "pointer",
    appearance: "auto" as const,
    ...(hasError ? errorInputBorder : {}),
})

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#6b5c60",
    marginBottom: "0.375rem",
}

const sectionTitleStyle: React.CSSProperties = {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#8d405b",
    marginBottom: "1.25rem",
    display: "flex",
    alignItems: "center",
}

const numberBadge: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.75rem",
    height: "1.75rem",
    background: "linear-gradient(135deg, #e4769a, #c6587c)",
    color: "#fff",
    borderRadius: "50%",
    fontSize: "0.8rem",
    fontWeight: 700,
    marginRight: "0.625rem",
    flexShrink: 0,
}

const errorTextStyle: React.CSSProperties = {
    color: "#e53e3e",
    fontSize: "0.75rem",
    marginTop: "0.25rem",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
}

/* ===== FIELD COMPONENT ===== */
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label style={labelStyle}>
                {label}
                {required && <span style={{ color: "#e4769a", marginLeft: "0.2rem" }}>*</span>}
            </label>
            {children}
            {error && (
                <p style={errorTextStyle} className="animate-fade-in-error">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="6" cy="6" r="6" fill="#e53e3e" />
                        <text x="6" y="9" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">!</text>
                    </svg>
                    {error}
                </p>
            )}
        </div>
    )
}

/* ===== MAIN FORM ===== */
export default function FormularioPCR() {
    const router = useRouter()
    const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [submitMessage, setSubmitMessage] = useState("")
    const formRef = useRef<HTMLFormElement>(null)

    const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitted } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            toxicity_suspension: false,
            pcr_achieved: false,
            lymphovascular_invasion: "No evaluable",
        },
    })

    const [isEdit, setIsEdit] = useState(false)

    // Check for ID in query params for editing
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const id = urlParams.get("id")
        if (id) {
            setIsEdit(true)
            fetchPatient(id)
        }
    }, [])

    async function fetchPatient(id: string) {
        try {
            const { data, error } = await supabase.from("patients").select("*").eq("id", id).single()
            if (error) throw error
            if (data) {
                const formData = {
                    ...data,
                    date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
                    neoadjuvant_completion_date: data.neoadjuvant_completion_date ? new Date(data.neoadjuvant_completion_date) : null,
                    surgery_date: data.surgery_date ? new Date(data.surgery_date) : undefined,
                    last_contact_date: data.last_contact_date ? new Date(data.last_contact_date) : null,
                    recurrence_date: data.recurrence_date ? new Date(data.recurrence_date) : null,
                    death_date: data.death_date ? new Date(data.death_date) : null,
                }
                reset(formData)
            }
        } catch (err) {
            console.error("Error fetching patient for edit:", err)
        }
    }

    const her2Value = watch("her2")
    const toxicitySuspension = watch("toxicity_suspension")
    const pcrAchieved = watch("pcr_achieved")

    // ===== TEST DATA FILL =====
    function fillTestData() {
        const randomId = `TEST-${Math.floor(Math.random() * 90000) + 10000}`

        // Date strings in YYYY-MM-DD format for HTML date inputs
        const dateOfBirth = "1985-06-15"
        const neoDate = "2025-01-15"
        const surgDate = "2025-03-01"
        const contactDate = "2025-12-01"

        // Reset non-date fields first (dates set as any for the reset call)
        const testValues = {
            patient_identifier: randomId,
            date_of_birth: dateOfBirth as any,
            age_at_diagnosis: 39,
            menopausal_status: "Pre-menopáusico" as const,
            lateralidad: "Derecha" as const,
            histological_type: "Ductal Infiltrante" as const,
            tumor_grade: "G2" as const,
            c_t: "T2" as const,
            c_n: "N1" as const,
            clinical_stage: "IIB" as const,
            lymphovascular_invasion: "Sí" as const,
            er_percent: 85,
            pr_percent: 70,
            her2: "0" as const,
            ki67_percent: 25,
            molecular_subtype: "Luminal A-like" as const,
            neoadjuvant_scheme: "Antraciclinas + Taxanos" as const,
            neoadjuvant_completion_date: neoDate as any,
            directed_therapy: "",
            completed_cycles: 6,
            toxicity_suspension: false,
            surgery_type: "Conservadora" as const,
            axillary_management: "Ganglio Centinela" as const,
            yp_t: "T1" as const,
            yp_n: "N0" as const,
            pcr_achieved: false,
            rcb_class: "Clase II" as const,
            surgery_date: surgDate as any,
            adjuvant_treatment: "Radioterapia + Hormonoterapia",
            current_status: "Vivo sin enfermedad" as const,
            last_contact_date: contactDate as any,
            cause_of_death: "No aplica" as const,
        }
        // Reset sets display values (strings) for HTML date inputs
        reset(testValues as any)
        // Now set Date objects so Zod validation passes on submit
        setTimeout(() => {
            setValue("date_of_birth", new Date(dateOfBirth + "T12:00:00"))
            setValue("neoadjuvant_completion_date", new Date(neoDate + "T12:00:00"))
            setValue("surgery_date", new Date(surgDate + "T12:00:00"))
            setValue("last_contact_date", new Date(contactDate + "T12:00:00"))
        }, 0)
    }

    // Scroll to first error on submit
    useEffect(() => {
        if (isSubmitted && Object.keys(errors).length > 0 && formRef.current) {
            const firstError = formRef.current.querySelector('[data-field-error="true"]')
            if (firstError) {
                firstError.scrollIntoView({ behavior: "smooth", block: "center" })
            }
        }
    }, [isSubmitted, errors])

    const errorCount = Object.keys(errors).length

    async function onSubmit(values: FormData) {
        setSubmitState("loading")
        setSubmitMessage("")

        const { id, ...rest } = values;
        const payload = {
            ...rest,
            date_of_birth: values.date_of_birth.toISOString().split("T")[0],
            neoadjuvant_completion_date: values.neoadjuvant_completion_date ? values.neoadjuvant_completion_date.toISOString().split("T")[0] : null,
            surgery_date: values.surgery_date.toISOString().split("T")[0],
            last_contact_date: values.last_contact_date ? values.last_contact_date.toISOString().split("T")[0] : null,
            recurrence_date: values.recurrence_date ? values.recurrence_date.toISOString().split("T")[0] : null,
            death_date: values.death_date ? values.death_date.toISOString().split("T")[0] : null,
            fish: values.fish || null,
            cause_of_death: values.cause_of_death || null,
            directed_therapy: values.directed_therapy || null,
            adjuvant_treatment: values.adjuvant_treatment || null,
            toxicity_reason: values.toxicity_reason || null,
            lymphovascular_invasion: values.lymphovascular_invasion,
        }

        try {
            let error
            if (values.id) {
                const { error: updateError } = await supabase.from("patients").update(payload).eq("id", values.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase.from("patients").insert([payload])
                error = insertError
            }

            if (error) throw error

            setSubmitState("success")
            setSubmitMessage(isEdit ? "✅ Registro actualizado exitosamente." : "✅ Registro guardado exitosamente. Redirigiendo al dashboard...")
            if (!isEdit) {
                reset()
                setTimeout(() => router.push("/dashboard"), 2000)
            }
        } catch (err: any) {
            console.error("Error saving patient:", err)
            setSubmitState("error")
            const errorMessage = err.message || (typeof err === 'string' ? err : "No se pudo guardar. Verifique la conexión a Supabase.");
            setSubmitMessage(`❌ Error: ${errorMessage}`)
        }
    }

    return (
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
            {/* Toast Banner */}
            {submitMessage && (
                <div style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    background: submitState === "success" ? "rgba(72,187,120,0.15)" : "rgba(245,101,101,0.15)",
                    color: submitState === "success" ? "#276749" : "#9b2c2c",
                    border: `1px solid ${submitState === "success" ? "rgba(72,187,120,0.3)" : "rgba(245,101,101,0.3)"}`,
                    textAlign: "center",
                }}>
                    {submitMessage}
                </div>
            )}

            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8d405b" }}>
                    {isEdit ? "Editar Registro" : "Registro de Paciente"}
                </h2>
                <p style={{ color: "#a05b75", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    {isEdit ? "Modifique los datos necesarios del paciente" : "Complete todos los campos del instrumento de recolección de datos"}
                </p>
                {/* Debug: Fill test data button */}
                {!isEdit && (
                    <button
                        type="button"
                        onClick={fillTestData}
                        style={{
                            marginTop: "0.75rem",
                            padding: "0.5rem 1.25rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#fff",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border: "none",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                            transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)"
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.5)"
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = "scale(1)"
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.3)"
                        }}
                    >
                        🧪 Llenar datos de prueba
                    </button>
                )}
            </div>

            {/* CONCISE ERROR SUMMARY */}
            {isSubmitted && errorCount > 0 && (
                <div
                    className="animate-fade-in-error"
                    style={{
                        padding: "0.875rem 1.25rem",
                        borderRadius: "0.75rem",
                        marginBottom: "1.5rem",
                        fontSize: "0.875rem",
                        background: "rgba(254, 215, 226, 0.8)",
                        border: "1px solid #e4769a",
                        color: "#9b2c2c",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                    }}
                >
                    <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: "#e53e3e",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        flexShrink: 0,
                    }}>
                        {errorCount}
                    </span>
                    <span>
                        <strong>
                            {errorCount === 1 ? "Hay 1 campo por completar." : `Hay ${errorCount} campos por completar.`}
                        </strong>
                        {" "}Revise los campos marcados en rojo antes de guardar.
                    </span>
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>

                {/* ===== SECCIÓN 1: IDENTIFICACIÓN ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>1</span>
                        Datos de Identificación
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.patient_identifier || undefined}>
                            <Field label="ID del Paciente" error={errors.patient_identifier?.message} required>
                                <input {...register("patient_identifier")} placeholder="Ej: HC-12345" style={getInputStyle(!!errors.patient_identifier)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.date_of_birth || undefined}>
                            <Field label="Fecha de Nacimiento" error={errors.date_of_birth?.message} required>
                                <input type="date" {...register("date_of_birth", { valueAsDate: true })} style={getInputStyle(!!errors.date_of_birth)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.age_at_diagnosis || undefined}>
                            <Field label="Edad al Diagnóstico" error={errors.age_at_diagnosis?.message} required>
                                <input type="number" {...register("age_at_diagnosis")} placeholder="Ej: 45" style={getInputStyle(!!errors.age_at_diagnosis)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.menopausal_status || undefined}>
                            <Field label="Estado Menopáusico" error={errors.menopausal_status?.message} required>
                                <select {...register("menopausal_status")} style={getSelectStyle(!!errors.menopausal_status)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Pre-menopáusico">Pre-menopáusico</option>
                                    <option value="Post-menopáusica">Post-menopáusica</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ===== SECCIÓN 2: TUMOR ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>2</span>
                        Características del Tumor (Basales)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.lateralidad || undefined}>
                            <Field label="Lateralidad" error={errors.lateralidad?.message} required>
                                <select {...register("lateralidad")} style={getSelectStyle(!!errors.lateralidad)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Izquierda">Izquierda</option>
                                    <option value="Derecha">Derecha</option>
                                    <option value="Bilateral">Bilateral</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.histological_type || undefined}>
                            <Field label="Tipo Histológico" error={errors.histological_type?.message} required>
                                <select {...register("histological_type")} style={getSelectStyle(!!errors.histological_type)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Ductal Infiltrante">Ductal Infiltrante</option>
                                    <option value="Lobulillar Infiltrante">Lobulillar Infiltrante</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.tumor_grade || undefined}>
                            <Field label="Grado Histológico (SBR)" error={errors.tumor_grade?.message} required>
                                <select {...register("tumor_grade")} style={getSelectStyle(!!errors.tumor_grade)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="G1">G1</option><option value="G2">G2</option><option value="G3">G3</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.c_t || undefined}>
                            <Field label="cT" error={errors.c_t?.message} required>
                                <select {...register("c_t")} style={getSelectStyle(!!errors.c_t)}>
                                    <option value="">Selecc.</option>
                                    <option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option><option value="T4">T4</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.c_n || undefined}>
                            <Field label="cN" error={errors.c_n?.message} required>
                                <select {...register("c_n")} style={getSelectStyle(!!errors.c_n)}>
                                    <option value="">Selecc.</option>
                                    <option value="N0">N0</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.clinical_stage || undefined}>
                            <Field label="Estadio Clínico Agrupado" error={errors.clinical_stage?.message} required>
                                <select {...register("clinical_stage")} style={getSelectStyle(!!errors.clinical_stage)}>
                                    <option value="">Selecc.</option>
                                    <option value="I">I</option><option value="IIA">IIA</option><option value="IIB">IIB</option>
                                    <option value="IIIA">IIIA</option><option value="IIIB">IIIB</option><option value="IIIC">IIIC</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.lymphovascular_invasion || undefined}>
                            <Field label="Invasión Linfovascular" error={errors.lymphovascular_invasion?.message} required>
                                <select {...register("lymphovascular_invasion")} style={getSelectStyle(!!errors.lymphovascular_invasion)}>
                                    <option value="No evaluable">No evaluable</option>
                                    <option value="Sí">Sí</option>
                                    <option value="No">No</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ===== SECCIÓN 3: PERFIL BIOLÓGICO ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>3</span>
                        Perfil Biológico (Inmunohistoquímica)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.er_percent || undefined}>
                            <Field label="RE (%)" error={errors.er_percent?.message} required>
                                <input type="number" {...register("er_percent")} placeholder="0-100" style={getInputStyle(!!errors.er_percent)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.pr_percent || undefined}>
                            <Field label="RP (%)" error={errors.pr_percent?.message} required>
                                <input type="number" {...register("pr_percent")} placeholder="0-100" style={getInputStyle(!!errors.pr_percent)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.ki67_percent || undefined}>
                            <Field label="Ki-67 (%)" error={errors.ki67_percent?.message} required>
                                <input type="number" {...register("ki67_percent")} placeholder="0-100" style={getInputStyle(!!errors.ki67_percent)} />
                            </Field>
                        </div>
                        <div data-field-error={!!errors.her2 || undefined}>
                            <Field label="HER2" error={errors.her2?.message} required>
                                <select {...register("her2")} style={getSelectStyle(!!errors.her2)}>
                                    <option value="">Selecc.</option>
                                    <option value="0">0</option><option value="1+">1+</option><option value="2+">2+</option><option value="3+">3+</option>
                                </select>
                            </Field>
                        </div>

                        {her2Value === "2+" && (
                            <div data-field-error={!!errors.fish || undefined}>
                                <Field label="FISH (requerido por HER2 2+)" error={errors.fish?.message} required>
                                    <select {...register("fish")} style={{ ...getSelectStyle(!!errors.fish), borderColor: errors.fish ? "#e53e3e" : "#e4769a" }}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Amplificado">Amplificado</option>
                                        <option value="No amplificado">No amplificado</option>
                                    </select>
                                </Field>
                            </div>
                        )}

                        <div data-field-error={!!errors.molecular_subtype || undefined}>
                            <Field label="Subtipo Molecular" error={errors.molecular_subtype?.message} required>
                                <select {...register("molecular_subtype")} style={getSelectStyle(!!errors.molecular_subtype)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Luminal A-like">Luminal A-like</option>
                                    <option value="Luminal B-like (HER2 negativo)">Luminal B-like (HER2 neg)</option>
                                    <option value="Luminal B-like (HER2 positivo)">Luminal B-like (HER2 pos)</option>
                                    <option value="HER2-enriquecido (RE/RP negativo)">HER2-enriquecido</option>
                                    <option value="Triple Negativo">Triple Negativo</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ===== SECCIÓN 4: TRATAMIENTO ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>4</span>
                        Tratamiento Neoadyuvante
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.neoadjuvant_scheme || undefined}>
                            <Field label="Esquema Utilizado" error={errors.neoadjuvant_scheme?.message} required>
                                <select {...register("neoadjuvant_scheme")} style={getSelectStyle(!!errors.neoadjuvant_scheme)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Antraciclinas + Taxanos">Antraciclinas + Taxanos</option>
                                    <option value="Solo Taxanos">Solo Taxanos</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </Field>
                        </div>
                        <Field label="Fecha de Fin Neoadyuvancia" error={errors.neoadjuvant_completion_date?.message}>
                            <input type="date" {...register("neoadjuvant_completion_date", { valueAsDate: true })} style={getInputStyle(!!errors.neoadjuvant_completion_date)} />
                        </Field>
                        <Field label="Terapia Dirigida (si aplica)">
                            <input {...register("directed_therapy")} placeholder="Trastuzumab, Pertuzumab, Inmunoterapia..." style={getInputStyle(false)} />
                        </Field>
                        <div data-field-error={!!errors.completed_cycles || undefined}>
                            <Field label="Ciclos Completados" error={errors.completed_cycles?.message} required>
                                <input type="number" {...register("completed_cycles")} placeholder="Ej: 6" style={getInputStyle(!!errors.completed_cycles)} />
                            </Field>
                        </div>
                    </div>
                    <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", color: "#555" }}>
                            <input type="checkbox" {...register("toxicity_suspension")}
                                style={{ width: "1.1rem", height: "1.1rem", accentColor: "#e4769a" }}
                            />
                            Hubo toxicidad relevante que causó suspensión
                        </label>
                        {toxicitySuspension && (
                            <div data-field-error={!!errors.toxicity_reason || undefined}>
                                <Field label="¿Cuál?" error={errors.toxicity_reason?.message} required>
                                    <input {...register("toxicity_reason")} placeholder="Especifique la toxicidad..." style={{ ...getInputStyle(!!errors.toxicity_reason), width: "250px" }} />
                                </Field>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== SECCIÓN 5: EVALUACIÓN QUIRÚRGICA ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>5</span>
                        Evaluación Quirúrgica (Post-neoadyuvancia)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.surgery_type || undefined}>
                            <Field label="Tipo de Cirugía" error={errors.surgery_type?.message} required>
                                <select {...register("surgery_type")} style={getSelectStyle(!!errors.surgery_type)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Conservadora">Conservadora</option>
                                    <option value="Mastectomía">Mastectomía</option>
                                </select>
                            </Field>
                        </div>
                        <div data-field-error={!!errors.axillary_management || undefined}>
                            <Field label="Manejo Axilar" error={errors.axillary_management?.message} required>
                                <select {...register("axillary_management")} style={getSelectStyle(!!errors.axillary_management)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Ganglio Centinela">Ganglio Centinela</option>
                                    <option value="Disección Axilar">Disección Axilar</option>
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* pCR Sub-section */}
                    <div style={{
                        marginTop: "1.25rem",
                        padding: "1rem",
                        background: "rgba(255,255,255,0.25)",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(255,255,255,0.4)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#8d405b" }}>Respuesta Patológica Completa (pCR)</span>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.8125rem", color: "#555" }}>
                                <input type="checkbox"
                                    checked={pcrAchieved}
                                    onChange={(e) => {
                                        setValue("pcr_achieved", e.target.checked)
                                        if (e.target.checked) {
                                            setValue("yp_t", "T0")
                                            setValue("yp_n", "N0")
                                        }
                                    }}
                                    style={{ width: "1.1rem", height: "1.1rem", accentColor: "#e4769a" }}
                                />
                                SÍ (auto-asigna ypT0/is ypN0)
                            </label>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                            <div data-field-error={!!errors.yp_t || undefined}>
                                <Field label="ypT" error={errors.yp_t?.message} required>
                                    <select {...register("yp_t")} style={getSelectStyle(!!errors.yp_t)}>
                                        <option value="">Selecc.</option>
                                        <option value="T0">T0</option><option value="Tis">Tis</option><option value="T1">T1</option>
                                        <option value="T2">T2</option><option value="T3">T3</option><option value="T4">T4</option>
                                    </select>
                                </Field>
                            </div>
                            <div data-field-error={!!errors.yp_n || undefined}>
                                <Field label="ypN" error={errors.yp_n?.message} required>
                                    <select {...register("yp_n")} style={getSelectStyle(!!errors.yp_n)}>
                                        <option value="">Selecc.</option>
                                        <option value="N0">N0</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                                    </select>
                                </Field>
                            </div>
                            <div data-field-error={!!errors.rcb_class || undefined}>
                                <Field label="Clase RCB" error={errors.rcb_class?.message} required>
                                    <select {...register("rcb_class")} style={getSelectStyle(!!errors.rcb_class)}>
                                        <option value="">Selecc.</option>
                                        <option value="Clase 0">Clase 0</option><option value="Clase I">Clase I</option>
                                        <option value="Clase II">Clase II</option><option value="Clase III">Clase III</option>
                                    </select>
                                </Field>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== SECCIÓN 6: SEGUIMIENTO ===== */}
                <div style={glassPanel} className="animate-fade-in-up">
                    <div style={sectionTitleStyle}>
                        <span style={numberBadge}>6</span>
                        Seguimiento y Desenlaces
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                        <div data-field-error={!!errors.surgery_date || undefined}>
                            <Field label="Fecha de la Cirugía" error={errors.surgery_date?.message} required>
                                <input type="date" {...register("surgery_date", { valueAsDate: true })} style={getInputStyle(!!errors.surgery_date)} />
                            </Field>
                        </div>
                        <Field label="Tratamiento Adyuvante Recibido">
                            <input {...register("adjuvant_treatment")} placeholder="Radioterapia, Hormonoterapia..." style={getInputStyle(false)} />
                        </Field>
                    </div>

                    <div style={{ marginTop: "1.25rem" }}>
                        <label style={{ ...labelStyle, marginBottom: "0.5rem" }}>
                            Estado Actual del Paciente <span style={{ color: "#e4769a" }}>*</span>
                        </label>
                        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                            {(["Vivo sin enfermedad", "Vivo con recurrencia", "Fallecido"] as const).map((opt) => (
                                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.875rem", color: "#555" }}>
                                    <input type="radio" value={opt} {...register("current_status")}
                                        style={{ width: "1rem", height: "1rem", accentColor: "#e4769a" }}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                        {errors.current_status && (
                            <p style={errorTextStyle} className="animate-fade-in-error">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                    <circle cx="6" cy="6" r="6" fill="#e53e3e" />
                                    <text x="6" y="9" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">!</text>
                                </svg>
                                {errors.current_status.message}
                            </p>
                        )}
                    </div>

                    <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                        <Field label="Fecha de Último Contacto">
                            <input type="date" {...register("last_contact_date", { valueAsDate: true })} style={getInputStyle(false)} />
                        </Field>
                        <Field label="Fecha de Recurrencia (si aplica)">
                            <input type="date" {...register("recurrence_date", { valueAsDate: true })} style={getInputStyle(false)} />
                        </Field>
                        <Field label="Fecha de Defunción (si aplica)">
                            <input type="date" {...register("death_date", { valueAsDate: true })} style={getInputStyle(false)} />
                        </Field>
                        <Field label="Causa de Muerte" error={errors.cause_of_death?.message}>
                            <select {...register("cause_of_death")} style={getSelectStyle(!!errors.cause_of_death)}>
                                <option value="">Seleccionar...</option>
                                <option value="Relacionada al Cáncer de Mama">Relacionada al Cáncer de Mama</option>
                                <option value="Otra causa">Otra causa</option>
                                <option value="Desconocida">Desconocida</option>
                                <option value="No aplica">No aplica</option>
                            </select>
                        </Field>
                    </div>
                </div>

                {/* ===== SUBMIT ===== */}
                <div style={{ display: "flex", justifyContent: "center", paddingTop: "1rem", paddingBottom: "3rem" }}>
                    <button
                        type="submit"
                        disabled={submitState === "loading"}
                        style={{
                            background: submitState === "loading" ? "#ccc" : "linear-gradient(135deg, #e4769a, #c6587c)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.75rem",
                            padding: "0.875rem 2.5rem",
                            fontSize: "1rem",
                            fontWeight: 600,
                            cursor: submitState === "loading" ? "not-allowed" : "pointer",
                            boxShadow: "0 4px 15px rgba(228, 118, 154, 0.4)",
                            transition: "all 0.25s ease",
                        }}
                        onMouseOver={(e) => {
                            if (submitState !== "loading") {
                                e.currentTarget.style.transform = "scale(1.05)"
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(228, 118, 154, 0.6)"
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = "scale(1)"
                            e.currentTarget.style.boxShadow = "0 4px 15px rgba(228, 118, 154, 0.4)"
                        }}
                    >
                        {submitState === "loading" ? "Guardando..." : isEdit ? "Actualizar Registro" : "Guardar Registro de Paciente"}
                    </button>
                </div>
            </form>
        </div>
    )
}
