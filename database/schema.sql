-- ============================================
-- IMPACTO pCR - Schema para Supabase
-- ============================================
-- Ejecutar este SQL en el SQL Editor de Supabase
-- (Settings > SQL Editor > New Query > pegar > Run)

-- Tipos definidos (Enums) para asegurar consistencia de datos médicos
CREATE TYPE menopausal_status AS ENUM ('Pre-menopáusico', 'Post-menopáusica');
CREATE TYPE tumor_laterality AS ENUM ('Izquierda', 'Derecha', 'Bilateral');
CREATE TYPE histological_type AS ENUM ('Ductal Infiltrante', 'Lobulillar Infiltrante', 'Otros');
CREATE TYPE tumor_grade AS ENUM ('G1', 'G2', 'G3');
CREATE TYPE her2_status AS ENUM ('0', '1+', '2+', '3+');
CREATE TYPE fish_status AS ENUM ('Amplificado', 'No amplificado');
CREATE TYPE molecular_subtype AS ENUM ('Luminal A-like', 'Luminal B-like (HER2 negativo)', 'Luminal B-like (HER2 positivo)', 'HER2-enriquecido (RE/RP negativo)', 'Triple Negativo');
CREATE TYPE rcb_class AS ENUM ('Clase 0', 'Clase I', 'Clase II', 'Clase III');
CREATE TYPE current_status AS ENUM ('Vivo sin enfermedad', 'Vivo con recurrencia', 'Fallecido');
CREATE TYPE cause_of_death AS ENUM ('Relacionada al Cáncer de Mama', 'Otra causa', 'Desconocida', 'No aplica');
CREATE TYPE clinical_stage AS ENUM ('I', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC');
CREATE TYPE tumor_c_t AS ENUM ('T1', 'T2', 'T3', 'T4');
CREATE TYPE tumor_c_n AS ENUM ('N0', 'N1', 'N2', 'N3');
CREATE TYPE tumor_yp_t AS ENUM ('T0', 'Tis', 'T1', 'T2', 'T3', 'T4');
CREATE TYPE surgery_type AS ENUM ('Conservadora', 'Mastectomía');
CREATE TYPE axillary_management AS ENUM ('Ganglio Centinela', 'Disección Axilar');
CREATE TYPE neoadjuvant_scheme AS ENUM ('Antraciclinas + Taxanos', 'Solo Taxanos', 'Otros');

-- Tabla principal de pacientes del estudio
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 1. Datos de Identificación
    patient_identifier VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    age_at_diagnosis INT CHECK (age_at_diagnosis >= 18 AND age_at_diagnosis <= 120) NOT NULL,
    menopausal_status menopausal_status NOT NULL,
    
    -- 2. Características del Tumor (Basales)
    lateralidad tumor_laterality NOT NULL,
    histological_type histological_type NOT NULL,
    tumor_grade tumor_grade NOT NULL,
    c_t tumor_c_t NOT NULL,
    c_n tumor_c_n NOT NULL,
    clinical_stage clinical_stage NOT NULL,
    
    -- 3. Perfil Biológico
    er_percent INT CHECK (er_percent >= 0 AND er_percent <= 100) NOT NULL,
    pr_percent INT CHECK (pr_percent >= 0 AND pr_percent <= 100) NOT NULL,
    her2 her2_status NOT NULL,
    fish fish_status,
    ki67_percent INT CHECK (ki67_percent >= 0 AND ki67_percent <= 100) NOT NULL,
    molecular_subtype molecular_subtype NOT NULL,
    
    -- 4. Tratamiento Neoadyuvante
    neoadjuvant_scheme neoadjuvant_scheme NOT NULL,
    neoadjuvant_completion_date DATE,
    directed_therapy VARCHAR(255),
    completed_cycles INT NOT NULL,
    toxicity_suspension BOOLEAN DEFAULT FALSE,
    toxicity_reason VARCHAR(255),
    
    -- 5. Evaluación Quirúrgica
    surgery_type surgery_type NOT NULL,
    axillary_management axillary_management NOT NULL,
    yp_t tumor_yp_t NOT NULL,
    yp_n tumor_c_n NOT NULL,
    pcr_achieved BOOLEAN NOT NULL,
    rcb_class rcb_class NOT NULL,
    
    -- 6. Seguimiento
    surgery_date DATE NOT NULL,
    adjuvant_treatment VARCHAR(255),
    current_status current_status NOT NULL,
    last_contact_date DATE,
    recurrence_date DATE,
    death_date DATE,
    cause_of_death cause_of_death,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Política: Acceso público con anon key (aplicación de investigación interna)
CREATE POLICY "Allow read for anon" ON patients
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert for anon" ON patients
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update for anon" ON patients
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow delete for anon" ON patients
    FOR DELETE TO anon USING (true);
