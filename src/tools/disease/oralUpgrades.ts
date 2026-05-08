/**
 * Comprehensive Disease-to-Oral Pill Upgrades
 *
 * Covers ALL major diseases - not just cancer.
 * Upgrades existing IV/injectable/infusion treatments to oral pills.
 */

/**
 * AUTOIMMUNE DISEASES - IV to Oral Conversions
 */
export const AutoimmuneOralUpgrades = [
  // Rheumatoid Arthritis
  {
    disease: 'Rheumatoid Arthritis',
    currentTx: 'Infliximab (Remicade) IV infusion',
    oralUpgrade: 'Tofacitinib (Xeljanz)',
    mechanism: 'JAK inhibitor',
    status: 'FDA APPROVED',
    dosing: '5mg BID oral',
    efficacy: 'Non-inferior to adalimumab',
  },
  {
    disease: 'Rheumatoid Arthritis',
    currentTx: 'Adalimumab (Humira) injection',
    oralUpgrade: 'Upadacitinib (Rinvoq)',
    mechanism: 'JAK1 selective inhibitor',
    status: 'FDA APPROVED',
    dosing: '15mg QD oral',
    efficacy: 'Superior to adalimumab',
  },
  {
    disease: 'Rheumatoid Arthritis',
    currentTx: 'Tocilizumab (Actemra) IV',
    oralUpgrade: 'Baricitinib (Olumiant)',
    mechanism: 'JAK1/JAK2 inhibitor',
    status: 'FDA APPROVED',
    dosing: '2mg QD oral',
    efficacy: 'Similar efficacy',
  },
  // Psoriasis / Psoriatic Arthritis
  {
    disease: 'Psoriasis',
    currentTx: 'Ustekinumab (Stelara) injection',
    oralUpgrade: 'Deucravacitinib (Sotyktu)',
    mechanism: 'TYK2 inhibitor',
    status: 'FDA APPROVED 2022',
    dosing: '6mg QD oral',
    efficacy: 'Superior to apremilast',
  },
  {
    disease: 'Psoriatic Arthritis',
    currentTx: 'Secukinumab (Cosentyx) injection',
    oralUpgrade: 'Apremilast (Otezla)',
    mechanism: 'PDE4 inhibitor',
    status: 'FDA APPROVED',
    dosing: '30mg BID oral',
    efficacy: 'Moderate efficacy',
  },
  // Ulcerative Colitis / Crohn's
  {
    disease: 'Ulcerative Colitis',
    currentTx: 'Vedolizumab (Entyvio) IV',
    oralUpgrade: 'Ozanimod (Zeposia)',
    mechanism: 'S1P receptor modulator',
    status: 'FDA APPROVED',
    dosing: '0.92mg QD oral',
    efficacy: 'Effective induction/maintenance',
  },
  {
    disease: 'Ulcerative Colitis',
    currentTx: 'Infliximab (Remicade) IV',
    oralUpgrade: 'Tofacitinib (Xeljanz)',
    mechanism: 'JAK inhibitor',
    status: 'FDA APPROVED',
    dosing: '10mg BID induction, 5mg BID maintenance',
    efficacy: 'Rapid onset',
  },
  {
    disease: "Crohn's Disease",
    currentTx: 'Adalimumab (Humira) injection',
    oralUpgrade: 'Upadacitinib (Rinvoq)',
    mechanism: 'JAK1 inhibitor',
    status: 'FDA APPROVED 2023',
    dosing: '45mg QD induction, 15-30mg maintenance',
    efficacy: 'High remission rates',
  },
  // Lupus
  {
    disease: 'Systemic Lupus Erythematosus',
    currentTx: 'Belimumab (Benlysta) IV',
    oralUpgrade: 'Anifrolumab oral (in development)',
    mechanism: 'Type I IFN receptor antagonist',
    status: 'Phase II',
    dosing: 'TBD',
    efficacy: 'Under investigation',
  },
  // Multiple Sclerosis
  {
    disease: 'Multiple Sclerosis',
    currentTx: 'Natalizumab (Tysabri) IV',
    oralUpgrade: 'Fingolimod (Gilenya)',
    mechanism: 'S1P receptor modulator',
    status: 'FDA APPROVED',
    dosing: '0.5mg QD oral',
    efficacy: 'Highly effective',
  },
  {
    disease: 'Multiple Sclerosis',
    currentTx: 'Ocrelizumab (Ocrevus) IV',
    oralUpgrade: 'Siponimod (Mayzent)',
    mechanism: 'S1P1/S1P5 modulator',
    status: 'FDA APPROVED',
    dosing: '2mg QD oral',
    efficacy: 'Effective for SPMS',
  },
  {
    disease: 'Multiple Sclerosis',
    currentTx: 'Interferon beta injections',
    oralUpgrade: 'Dimethyl fumarate (Tecfidera)',
    mechanism: 'Nrf2 pathway activator',
    status: 'FDA APPROVED',
    dosing: '240mg BID oral',
    efficacy: 'Reduces relapses 50%',
  },
];

/**
 * CARDIOVASCULAR DISEASES - Injectable to Oral
 */
export const CardiovascularOralUpgrades = [
  // Anticoagulation
  {
    disease: 'Atrial Fibrillation / VTE',
    currentTx: 'Heparin / Enoxaparin injection',
    oralUpgrade: 'Apixaban (Eliquis)',
    mechanism: 'Factor Xa inhibitor',
    status: 'FDA APPROVED',
    dosing: '5mg BID oral',
    efficacy: 'Superior to warfarin, no monitoring',
  },
  {
    disease: 'VTE Prevention',
    currentTx: 'Enoxaparin (Lovenox) injection',
    oralUpgrade: 'Rivaroxaban (Xarelto)',
    mechanism: 'Factor Xa inhibitor',
    status: 'FDA APPROVED',
    dosing: '10-20mg QD oral',
    efficacy: 'Non-inferior, more convenient',
  },
  // Heart Failure
  {
    disease: 'Heart Failure (HFrEF)',
    currentTx: 'IV diuretics + inotropes',
    oralUpgrade: 'Sacubitril/Valsartan (Entresto)',
    mechanism: 'ARNI (neprilysin inhibitor)',
    status: 'FDA APPROVED',
    dosing: '97/103mg BID oral',
    efficacy: '20% mortality reduction',
  },
  {
    disease: 'Heart Failure',
    currentTx: 'Standard therapy',
    oralUpgrade: 'Dapagliflozin (Farxiga)',
    mechanism: 'SGLT2 inhibitor',
    status: 'FDA APPROVED',
    dosing: '10mg QD oral',
    efficacy: 'Reduces hospitalization 26%',
  },
  // Pulmonary Hypertension
  {
    disease: 'Pulmonary Arterial Hypertension',
    currentTx: 'Epoprostenol (Flolan) IV continuous',
    oralUpgrade: 'Selexipag (Uptravi)',
    mechanism: 'Prostacyclin receptor agonist',
    status: 'FDA APPROVED',
    dosing: '200-1600mcg BID oral',
    efficacy: 'Reduces disease progression',
  },
  {
    disease: 'Pulmonary Arterial Hypertension',
    currentTx: 'Treprostinil SC/IV',
    oralUpgrade: 'Treprostinil extended-release (Orenitram)',
    mechanism: 'Prostacyclin analog',
    status: 'FDA APPROVED',
    dosing: 'Titrated TID oral',
    efficacy: 'Improves exercise capacity',
  },
  // Hyperlipidemia
  {
    disease: 'Familial Hypercholesterolemia',
    currentTx: 'Evolocumab (Repatha) injection',
    oralUpgrade: 'Bempedoic acid (Nexletol)',
    mechanism: 'ACL inhibitor',
    status: 'FDA APPROVED',
    dosing: '180mg QD oral',
    efficacy: 'Adds to statin effect',
  },
  {
    disease: 'High Triglycerides',
    currentTx: 'Omega-3 IV (rare)',
    oralUpgrade: 'Icosapent ethyl (Vascepa)',
    mechanism: 'Pure EPA omega-3',
    status: 'FDA APPROVED',
    dosing: '2g BID oral',
    efficacy: '25% CV risk reduction',
  },
];

/**
 * INFECTIOUS DISEASES - IV to Oral
 */
export const InfectiousOralUpgrades = [
  // HIV
  {
    disease: 'HIV',
    currentTx: 'Multiple daily pills',
    oralUpgrade: 'Biktarvy (BIC/FTC/TAF)',
    mechanism: 'Single-tablet regimen',
    status: 'FDA APPROVED',
    dosing: '1 tablet QD',
    efficacy: 'Undetectable viral load',
  },
  {
    disease: 'HIV Prevention (PrEP)',
    currentTx: 'Daily Truvada',
    oralUpgrade: 'Lenacapavir (Sunlenca)',
    mechanism: 'Capsid inhibitor (twice yearly)',
    status: 'FDA APPROVED 2022',
    dosing: '927mg every 6 months (oral loading)',
    efficacy: '100% prevention in trials',
  },
  // Hepatitis C
  {
    disease: 'Hepatitis C',
    currentTx: 'Interferon + Ribavirin injections',
    oralUpgrade: 'Sofosbuvir/Velpatasvir (Epclusa)',
    mechanism: 'Pan-genotypic DAA',
    status: 'FDA APPROVED',
    dosing: '1 tablet QD x 12 weeks',
    efficacy: '95-99% cure rate',
  },
  {
    disease: 'Hepatitis C',
    currentTx: 'Peginterferon injections',
    oralUpgrade: 'Glecaprevir/Pibrentasvir (Mavyret)',
    mechanism: 'NS3/NS5A inhibitor combo',
    status: 'FDA APPROVED',
    dosing: '3 tablets QD x 8 weeks',
    efficacy: '97-99% cure rate',
  },
  // Hepatitis B
  {
    disease: 'Hepatitis B',
    currentTx: 'Peginterferon alfa injection',
    oralUpgrade: 'Tenofovir alafenamide (Vemlidy)',
    mechanism: 'Nucleotide analog',
    status: 'FDA APPROVED',
    dosing: '25mg QD oral',
    efficacy: 'Viral suppression, less bone/renal toxicity',
  },
  // Bacterial Infections
  {
    disease: 'MRSA Skin Infection',
    currentTx: 'Vancomycin IV',
    oralUpgrade: 'Linezolid (Zyvox)',
    mechanism: 'Oxazolidinone antibiotic',
    status: 'FDA APPROVED',
    dosing: '600mg BID oral',
    efficacy: 'Equivalent to IV vancomycin',
  },
  {
    disease: 'Osteomyelitis',
    currentTx: '6 weeks IV antibiotics',
    oralUpgrade: 'Oral step-down therapy',
    mechanism: 'Fluoroquinolone + rifampin',
    status: 'OVIVA trial proven',
    dosing: 'Oral after initial IV',
    efficacy: 'Non-inferior to all-IV',
  },
  {
    disease: 'C. difficile Infection',
    currentTx: 'IV metronidazole',
    oralUpgrade: 'Fidaxomicin (Dificid)',
    mechanism: 'Macrocyclic antibiotic',
    status: 'FDA APPROVED',
    dosing: '200mg BID x 10 days oral',
    efficacy: 'Lower recurrence rate',
  },
  // Fungal Infections
  {
    disease: 'Invasive Aspergillosis',
    currentTx: 'Amphotericin B IV',
    oralUpgrade: 'Voriconazole (Vfend)',
    mechanism: 'Azole antifungal',
    status: 'FDA APPROVED',
    dosing: '200mg BID oral',
    efficacy: 'Superior survival',
  },
  {
    disease: 'Candidiasis',
    currentTx: 'Caspofungin IV',
    oralUpgrade: 'Ibrexafungerp (Brexafemme)',
    mechanism: 'Glucan synthase inhibitor',
    status: 'FDA APPROVED 2021',
    dosing: '300mg BID x 1 day oral',
    efficacy: 'First oral glucan synthase inhibitor',
  },
];

/**
 * NEUROLOGICAL DISEASES - Injectable to Oral
 */
export const NeurologicalOralUpgrades = [
  // Migraine
  {
    disease: 'Chronic Migraine',
    currentTx: 'Erenumab (Aimovig) injection monthly',
    oralUpgrade: 'Atogepant (Qulipta)',
    mechanism: 'CGRP receptor antagonist',
    status: 'FDA APPROVED 2021',
    dosing: '60mg QD oral',
    efficacy: 'Similar efficacy to injectables',
  },
  {
    disease: 'Episodic Migraine',
    currentTx: 'Fremanezumab (Ajovy) injection',
    oralUpgrade: 'Rimegepant (Nurtec)',
    mechanism: 'CGRP antagonist',
    status: 'FDA APPROVED',
    dosing: '75mg every other day oral',
    efficacy: 'Acute + preventive',
  },
  // Parkinson's Disease
  {
    disease: "Parkinson's Disease",
    currentTx: 'Apomorphine SC injection',
    oralUpgrade: 'Apomorphine sublingual (Kynmobi)',
    mechanism: 'Dopamine agonist',
    status: 'FDA APPROVED 2020',
    dosing: '10-30mg sublingual PRN',
    efficacy: 'Rapid OFF episode relief',
  },
  {
    disease: "Parkinson's OFF Episodes",
    currentTx: 'Levodopa/carbidopa intestinal gel',
    oralUpgrade: 'Istradefylline (Nourianz)',
    mechanism: 'Adenosine A2A antagonist',
    status: 'FDA APPROVED 2019',
    dosing: '20-40mg QD oral',
    efficacy: 'Reduces OFF time',
  },
  // Epilepsy
  {
    disease: 'Epilepsy (Status Epilepticus prevention)',
    currentTx: 'IV benzodiazepines',
    oralUpgrade: 'Cenobamate (Xcopri)',
    mechanism: 'Sodium channel modulator',
    status: 'FDA APPROVED 2019',
    dosing: '200-400mg QD oral',
    efficacy: '28% seizure-free rate',
  },
  // ALS
  {
    disease: 'ALS',
    currentTx: 'Edaravone (Radicava) IV',
    oralUpgrade: 'Edaravone oral suspension',
    mechanism: 'Free radical scavenger',
    status: 'FDA APPROVED 2022',
    dosing: '105mg QD oral x 10-14 days/month',
    efficacy: 'Same as IV, more convenient',
  },
  // Spinal Muscular Atrophy
  {
    disease: 'Spinal Muscular Atrophy',
    currentTx: 'Nusinersen (Spinraza) intrathecal',
    oralUpgrade: 'Risdiplam (Evrysdi)',
    mechanism: 'SMN2 splicing modifier',
    status: 'FDA APPROVED 2020',
    dosing: '5mg QD oral (adults)',
    efficacy: 'Significant motor improvement',
  },
];

/**
 * METABOLIC / ENDOCRINE DISEASES
 */
export const MetabolicOralUpgrades = [
  // Diabetes
  {
    disease: 'Type 2 Diabetes',
    currentTx: 'Insulin injections',
    oralUpgrade: 'Semaglutide oral (Rybelsus)',
    mechanism: 'GLP-1 receptor agonist',
    status: 'FDA APPROVED 2019',
    dosing: '7-14mg QD oral',
    efficacy: 'A1c reduction 1.0-1.4%',
  },
  {
    disease: 'Type 2 Diabetes',
    currentTx: 'Dulaglutide (Trulicity) injection',
    oralUpgrade: 'Tirzepatide oral (in development)',
    mechanism: 'GIP/GLP-1 dual agonist',
    status: 'Phase III',
    dosing: 'TBD',
    efficacy: 'Expected similar to injectable',
  },
  // Obesity
  {
    disease: 'Obesity',
    currentTx: 'Semaglutide (Wegovy) injection',
    oralUpgrade: 'Oral semaglutide (higher dose)',
    mechanism: 'GLP-1 agonist',
    status: 'Phase III for obesity',
    dosing: '50mg QD oral',
    efficacy: '15-17% weight loss expected',
  },
  {
    disease: 'Obesity',
    currentTx: 'Tirzepatide (Zepbound) injection',
    oralUpgrade: 'Orforglipron',
    mechanism: 'Non-peptide GLP-1 agonist',
    status: 'Phase III',
    dosing: '36-45mg QD oral',
    efficacy: '14% weight loss at 36 weeks',
  },
  // Osteoporosis
  {
    disease: 'Osteoporosis',
    currentTx: 'Denosumab (Prolia) injection q6mo',
    oralUpgrade: 'Alendronate (Fosamax)',
    mechanism: 'Bisphosphonate',
    status: 'FDA APPROVED',
    dosing: '70mg weekly oral',
    efficacy: 'Reduces fractures 50%',
  },
  {
    disease: 'Severe Osteoporosis',
    currentTx: 'Teriparatide (Forteo) daily injection',
    oralUpgrade: 'Abaloparatide oral (in development)',
    mechanism: 'PTHrP analog',
    status: 'Phase II',
    dosing: 'TBD',
    efficacy: 'Under investigation',
  },
  // Thyroid
  {
    disease: 'Hypothyroidism',
    currentTx: 'Levothyroxine (already oral)',
    oralUpgrade: 'Tiratricol (T3 analog)',
    mechanism: 'T3 receptor agonist',
    status: 'FDA APPROVED (orphan)',
    dosing: 'Variable oral',
    efficacy: 'For resistant cases',
  },
  // Gout
  {
    disease: 'Chronic Gout',
    currentTx: 'Pegloticase (Krystexxa) IV',
    oralUpgrade: 'Febuxostat (Uloric)',
    mechanism: 'Xanthine oxidase inhibitor',
    status: 'FDA APPROVED',
    dosing: '40-80mg QD oral',
    efficacy: 'Lower urate than allopurinol',
  },
];

/**
 * HEMATOLOGIC DISEASES
 */
export const HematologicOralUpgrades = [
  // Sickle Cell Disease
  {
    disease: 'Sickle Cell Disease',
    currentTx: 'Blood transfusions',
    oralUpgrade: 'Voxelotor (Oxbryta)',
    mechanism: 'HbS polymerization inhibitor',
    status: 'FDA APPROVED 2019',
    dosing: '1500mg QD oral',
    efficacy: 'Increases hemoglobin 1g/dL',
  },
  {
    disease: 'Sickle Cell Disease',
    currentTx: 'Hydroxyurea',
    oralUpgrade: 'Crizanlizumab oral (in development)',
    mechanism: 'P-selectin inhibitor',
    status: 'Phase II',
    dosing: 'TBD',
    efficacy: 'Reduces vaso-occlusive crises',
  },
  // Hemophilia
  {
    disease: 'Hemophilia A',
    currentTx: 'Factor VIII IV infusions',
    oralUpgrade: 'Fitusiran (siRNA)',
    mechanism: 'Antithrombin knockdown',
    status: 'FDA APPROVED 2023',
    dosing: 'Monthly SC (oral in development)',
    efficacy: '90% reduction in bleeds',
  },
  // ITP
  {
    disease: 'Immune Thrombocytopenia',
    currentTx: 'Romiplostim (Nplate) SC',
    oralUpgrade: 'Eltrombopag (Promacta)',
    mechanism: 'TPO receptor agonist',
    status: 'FDA APPROVED',
    dosing: '25-75mg QD oral',
    efficacy: 'Raises platelets in 80%',
  },
  // PNH
  {
    disease: 'Paroxysmal Nocturnal Hemoglobinuria',
    currentTx: 'Eculizumab (Soliris) IV q2wk',
    oralUpgrade: 'Danicopan (Voydeya)',
    mechanism: 'Factor D inhibitor',
    status: 'FDA APPROVED 2024',
    dosing: '150mg TID oral',
    efficacy: 'Add-on to improve anemia',
  },
  {
    disease: 'PNH',
    currentTx: 'Ravulizumab (Ultomiris) IV',
    oralUpgrade: 'Iptacopan (Fabhalta)',
    mechanism: 'Factor B inhibitor',
    status: 'FDA APPROVED 2023',
    dosing: '200mg BID oral',
    efficacy: 'Oral monotherapy option',
  },
];

/**
 * RARE / GENETIC DISEASES
 */
export const RareGeneticOralUpgrades = [
  // Cystic Fibrosis
  {
    disease: 'Cystic Fibrosis',
    currentTx: 'Inhaled medications + IV antibiotics',
    oralUpgrade: 'Elexacaftor/Tezacaftor/Ivacaftor (Trikafta)',
    mechanism: 'CFTR modulator triple combo',
    status: 'FDA APPROVED 2019',
    dosing: '2 tabs AM + 1 tab PM oral',
    efficacy: '14% FEV1 improvement, 90% of CF patients eligible',
  },
  // Fabry Disease
  {
    disease: 'Fabry Disease',
    currentTx: 'Agalsidase beta (Fabrazyme) IV q2wk',
    oralUpgrade: 'Migalastat (Galafold)',
    mechanism: 'Pharmacological chaperone',
    status: 'FDA APPROVED 2018',
    dosing: '123mg every other day oral',
    efficacy: 'For amenable mutations (~35-50%)',
  },
  // Gaucher Disease
  {
    disease: 'Gaucher Disease Type 1',
    currentTx: 'Imiglucerase (Cerezyme) IV',
    oralUpgrade: 'Eliglustat (Cerdelga)',
    mechanism: 'Substrate reduction therapy',
    status: 'FDA APPROVED 2014',
    dosing: '84mg BID oral',
    efficacy: 'Non-inferior to ERT',
  },
  // PKU
  {
    disease: 'Phenylketonuria (PKU)',
    currentTx: 'Strict diet + medical foods',
    oralUpgrade: 'Pegvaliase → Sapropterin (Kuvan)',
    mechanism: 'BH4 cofactor',
    status: 'FDA APPROVED',
    dosing: '5-20 mg/kg/day oral',
    efficacy: 'Reduces Phe in responders (~30%)',
  },
  // Hereditary Angioedema
  {
    disease: 'Hereditary Angioedema',
    currentTx: 'C1-INH concentrate IV',
    oralUpgrade: 'Berotralstat (Orladeyo)',
    mechanism: 'Plasma kallikrein inhibitor',
    status: 'FDA APPROVED 2020',
    dosing: '150mg QD oral',
    efficacy: '44% attack reduction',
  },
  // Transthyretin Amyloidosis
  {
    disease: 'Transthyretin Amyloidosis (hATTR)',
    currentTx: 'Patisiran (Onpattro) IV q3wk',
    oralUpgrade: 'Tafamidis (Vyndaqel)',
    mechanism: 'TTR stabilizer',
    status: 'FDA APPROVED 2019',
    dosing: '80mg QD oral',
    efficacy: '30% reduction in mortality',
  },
  {
    disease: 'hATTR Polyneuropathy',
    currentTx: 'Inotersen SC weekly',
    oralUpgrade: 'Diflunisal (off-label)',
    mechanism: 'TTR stabilizer',
    status: 'Off-label use',
    dosing: '250mg BID oral',
    efficacy: 'Slows progression',
  },
  // Alpha-1 Antitrypsin Deficiency
  {
    disease: 'Alpha-1 Antitrypsin Deficiency',
    currentTx: 'AAT augmentation IV weekly',
    oralUpgrade: 'Fazirsiran (siRNA)',
    mechanism: 'Liver-directed siRNA',
    status: 'Phase III',
    dosing: 'SC (oral in development)',
    efficacy: '90% reduction in Z-AAT',
  },
];

/**
 * PSYCHIATRIC DISEASES
 */
export const PsychiatricOralUpgrades = [
  // Treatment-Resistant Depression
  {
    disease: 'Treatment-Resistant Depression',
    currentTx: 'Esketamine (Spravato) nasal',
    oralUpgrade: 'Psilocybin (in development)',
    mechanism: '5-HT2A agonist',
    status: 'Phase III (Breakthrough)',
    dosing: 'Single oral dose with therapy',
    efficacy: 'Rapid, sustained response',
  },
  {
    disease: 'Treatment-Resistant Depression',
    currentTx: 'IV ketamine infusions',
    oralUpgrade: 'Oral ketamine compounds',
    mechanism: 'NMDA antagonist',
    status: 'Phase II',
    dosing: 'TBD',
    efficacy: 'Under investigation',
  },
  // Schizophrenia
  {
    disease: 'Schizophrenia',
    currentTx: 'Paliperidone LAI monthly',
    oralUpgrade: 'Lumateperone (Caplyta)',
    mechanism: 'Serotonin/dopamine modulator',
    status: 'FDA APPROVED 2019',
    dosing: '42mg QD oral',
    efficacy: 'Less metabolic effects',
  },
  // ADHD
  {
    disease: 'ADHD',
    currentTx: 'Standard stimulants',
    oralUpgrade: 'Viloxazine ER (Qelbree)',
    mechanism: 'Norepinephrine reuptake inhibitor',
    status: 'FDA APPROVED 2021',
    dosing: '200-600mg QD oral',
    efficacy: 'Non-stimulant option',
  },
];

/**
 * Summary of all disease upgrades
 */
export const AllDiseaseOralUpgrades = [
  ...AutoimmuneOralUpgrades,
  ...CardiovascularOralUpgrades,
  ...InfectiousOralUpgrades,
  ...NeurologicalOralUpgrades,
  ...MetabolicOralUpgrades,
  ...HematologicOralUpgrades,
  ...RareGeneticOralUpgrades,
  ...PsychiatricOralUpgrades,
];

/**
 * Get upgrades by disease category
 */
export function getUpgradesByCategory(category: string) {
  switch (category.toLowerCase()) {
    case 'autoimmune': return AutoimmuneOralUpgrades;
    case 'cardiovascular': return CardiovascularOralUpgrades;
    case 'infectious': return InfectiousOralUpgrades;
    case 'neurological': return NeurologicalOralUpgrades;
    case 'metabolic': return MetabolicOralUpgrades;
    case 'hematologic': return HematologicOralUpgrades;
    case 'rare': return RareGeneticOralUpgrades;
    case 'psychiatric': return PsychiatricOralUpgrades;
    default: return AllDiseaseOralUpgrades;
  }
}

/**
 * Get approved upgrades
 */
export function getApprovedUpgrades() {
  return AllDiseaseOralUpgrades.filter(d =>
    d.status.includes('APPROVED') || d.status.includes('FDA')
  );
}

/**
 * Search for oral upgrade by disease
 */
export function findOralUpgrade(disease: string) {
  return AllDiseaseOralUpgrades.filter(d =>
    d.disease.toLowerCase().includes(disease.toLowerCase())
  );
}
