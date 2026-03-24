import os
from datetime import date, datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, conint, field_validator
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI App
app = FastAPI(
    title="Impacto pCR API",
    description="Backend para aplicación médica de investigación en Cáncer de Mama",
    version="1.0.0"
)

# CORS configurations (for Vercel Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Client Setup
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials not found in environment variables.")
    supabase: Optional[Client] = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Pydantic Schemas (Server-side validation)
class PatientBase(BaseModel):
    # 1. Identificación
    patient_identifier: str
    date_of_birth: date
    age_at_diagnosis: conint(ge=18, le=120)
    menopausal_status: str # 'Pre-menopáusico', 'Post-menopáusica'

    # 2. Características del Tumor
    lateralidad: str # 'Izquierda', 'Derecha', 'Bilateral'
    histological_type: str # 'Ductal Infiltrante', 'Lobulillar Infiltrante', 'Otros'
    tumor_grade: str # 'G1', 'G2', 'G3'
    c_t: str # 'T1', 'T2', 'T3', 'T4'
    c_n: str # 'N0', 'N1', 'N2', 'N3'
    clinical_stage: str # 'I', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC'
    lymphovascular_invasion: str # 'Sí', 'No', 'No evaluable'

    # 3. Perfil Biológico
    er_percent: conint(ge=0, le=100)
    pr_percent: conint(ge=0, le=100)
    her2: str # '0', '1+', '2+', '3+'
    fish: Optional[str] = None # 'Amplificado', 'No amplificado'
    ki67_percent: conint(ge=0, le=100)
    molecular_subtype: str # 'Luminal A-like', 'Luminal B-like (HER2 negativo)', etc

    # 4. Tratamiento Neoadyuvante
    neoadjuvant_scheme: str # 'Antraciclinas + Taxanos', 'Solo Taxanos', 'Otros'
    neoadjuvant_completion_date: Optional[date] = None
    directed_therapy: Optional[str] = None
    completed_cycles: int
    toxicity_suspension: bool = False
    toxicity_reason: Optional[str] = None

    # 5. Evaluación Quirúrgica
    surgery_type: str # 'Conservadora', 'Mastectomía'
    axillary_management: str # 'Ganglio Centinela', 'Disección Axilar'
    yp_t: str # 'T0', 'Tis', 'T1', 'T2', 'T3', 'T4'
    yp_n: str # 'N0', 'N1', 'N2', 'N3'
    pcr_achieved: bool
    rcb_class: str # 'Clase 0', 'Clase I', 'Clase II', 'Clase III'

    # 6. Seguimiento
    surgery_date: date
    adjuvant_treatment: Optional[str] = None
    current_status: str # 'Vivo sin enfermedad', 'Vivo con recurrencia', 'Fallecido'
    last_contact_date: Optional[date] = None
    recurrence_date: Optional[date] = None
    death_date: Optional[date] = None
    cause_of_death: Optional[str] = None

    @field_validator('fish')
    def validate_fish(cls, v, values):
        if 'her2' in values.data and values.data['her2'] == '2+' and not v:
            raise ValueError('FISH es obligatorio cuando HER2 es 2+')
        return v

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str
    created_at: datetime
    updated_at: datetime


# Routes
@app.get("/")
def read_root():
    return {"message": "Impacto pCR API Operational"}

@app.post("/patients/", response_model=PatientResponse)
def create_patient(patient: PatientCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not configured")
    
    # Convert dates to ISO format string for JSON serialization
    patient_data = patient.model_dump()
    for key, value in patient_data.items():
        if isinstance(value, date):
            patient_data[key] = value.isoformat()

    try:
        response = supabase.table("patients").insert(patient_data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create registry")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/patients/", response_model=List[PatientResponse])
def get_patients(molecular_subtype: Optional[str] = Query(None, description="Filtrar por subtipo molecular")):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not configured")
    
    try:
        query = supabase.table("patients").select("*")
        if molecular_subtype:
            query = query.eq("molecular_subtype", molecular_subtype)
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
