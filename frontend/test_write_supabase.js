const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oaqzzadqxduvypaiwauc.supabase.co';
const supabaseKey = 'sb_publishable_oMvOMbO1Xr8xp5upn-Pcow_1TG8LrDi';
const supabase = createClient(supabaseUrl, supabaseKey);

const testPatient = {
    patient_identifier: "DEBUG-TEST-01",
    date_of_birth: "1980-01-01",
    age_at_diagnosis: 44,
    menopausal_status: "Pre-menopáusica",
    lateralidad: "Derecha",
    histological_type: "Ductal Infiltrante",
    tumor_grade: "G2",
    c_t: "T2",
    c_n: "N0",
    clinical_stage: "IIA",
    lymphovascular_invasion: "No",
    er_percent: 90,
    pr_percent: 80,
    her2: "0",
    fish: null,
    ki67_percent: 20,
    molecular_subtype: "Luminal A-like",
    neoadjuvant_scheme: "Antraciclinas + Taxanos",
    neoadjuvant_completion_date: "2024-02-01",
    directed_therapy: null,
    completed_cycles: 8,
    toxicity_suspension: false,
    toxicity_reason: null,
    surgery_type: "Conservadora",
    axillary_management: "Ganglio Centinela",
    yp_t: "ypT0",
    yp_n: "ypN0",
    pcr_achieved: true,
    rcb_class: "RCB 0 (pCR)",
    surgery_date: "2024-03-01",
    adjuvant_treatment: null,
    current_status: "Vivo sin enfermedad",
    last_contact_date: "2024-03-01",
    recurrence_date: null,
    death_date: null,
    cause_of_death: null
};

async function testWrite() {
  console.log('Attempting to write a test record to Supabase...');
  try {
    const { data, error } = await supabase.from('patients').insert([testPatient]).select();
    if (error) {
      console.error('Error writing to Supabase:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      process.exit(1);
    }
    console.log('Successfully wrote to Supabase!');
    console.log('Inserted data:', data);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}

testWrite();
