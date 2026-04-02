
-- ===========================================================================
-- PART 1: Industry Segments — add 3 new, set codes on 2 existing
-- ===========================================================================

INSERT INTO public.industry_segments (code, name, description, display_order)
VALUES
  ('fmcg_consumer', 'FMCG / Consumer Goods', 'Food & beverage, personal care, household products, and FMCG distribution', 9),
  ('electronics_hightech', 'Electronics & High-Tech', 'Semiconductor, consumer electronics, telecom equipment, and PCB assembly', 10),
  ('travel_hospitality', 'Travel, Tourism & Hospitality', 'Airlines, hotels, OTAs, restaurants, and destination management', 11)
ON CONFLICT (code) DO NOTHING;

UPDATE public.industry_segments SET code = 'manufacturing_auto_components'
WHERE id = 'a333531e-8a60-4682-87df-a9fdc617a232' AND code IS DISTINCT FROM 'manufacturing_auto_components';

UPDATE public.industry_segments SET code = 'technology_india_it'
WHERE id = 'b1a248ce-15b9-4733-a035-a904a786fe30' AND code IS DISTINCT FROM 'technology_india_it';

-- ===========================================================================
-- PART 2: Create industry_knowledge_packs table
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.industry_knowledge_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code TEXT NOT NULL,
  industry_name TEXT NOT NULL,
  industry_overview TEXT,
  regulatory_landscape JSONB DEFAULT '{}',
  technology_landscape TEXT,
  common_kpis TEXT[] DEFAULT '{}',
  common_frameworks TEXT[] DEFAULT '{}',
  common_certifications TEXT[] DEFAULT '{}',
  typical_budget_ranges JSONB DEFAULT '{}',
  typical_timelines JSONB DEFAULT '{}',
  preferred_analyst_sources TEXT[] DEFAULT '{}',
  section_hints JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(industry_code)
);

ALTER TABLE public.industry_knowledge_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_ikp" ON public.industry_knowledge_packs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_ikp" ON public.industry_knowledge_packs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed 13 industry knowledge packs

INSERT INTO public.industry_knowledge_packs (industry_code, industry_name, industry_overview, regulatory_landscape, technology_landscape, common_kpis, common_frameworks, common_certifications, typical_budget_ranges, typical_timelines, preferred_analyst_sources, section_hints)
VALUES

-- 1. Finance
('finance', 'Banking, Insurance & Financial Services',
 'Encompasses retail banking, corporate banking, insurance (life, general, health), asset management, payments, lending, and wealth management. Highly regulated with strict compliance requirements across jurisdictions. Digital transformation driven by fintech competition, open banking mandates, and changing customer expectations. Real-time processing, fraud prevention, and regulatory reporting are perennial challenges. Legacy core banking systems create integration complexity.',
 '{"global":["Basel III/IV","AML/KYC","PCI DSS","IFRS 9/17"],"us":["SOX","Dodd-Frank","GLBA","CCPA","OCC Guidelines"],"eu":["PSD2/PSD3","MiFID II","DORA","Solvency II","GDPR"],"india":["RBI DPSS","RBI Digital Lending Guidelines","SEBI","IRDAI","DPDPA","UPI Guidelines"],"uk":["FCA regulations","PRA","Open Banking (OBIE)","UK GDPR"],"middle_east":["CBUAE","SAMA (Saudi)","QCB","DIFC/ADGM frameworks"],"singapore":["MAS Guidelines","PS Act","PDPA","Project Ubin"],"australia":["APRA","ASIC","CDR/Open Banking","Privacy Act"]}'::jsonb,
 'Core banking modernization (Temenos, Finastra, TCS BaNCS), API banking platforms, real-time payments (UPI, SEPA Instant, FedNow), cloud adoption (AWS/Azure financial services), AI for credit scoring and fraud detection, blockchain for trade finance, RPA for back-office operations, low-code platforms for customer journeys.',
 ARRAY['NPA Ratio','Cost-to-Income Ratio','Net Interest Margin','Customer Acquisition Cost','Loan Processing Time','Fraud Detection Rate','AML Alert False Positive Rate','Digital Adoption Rate','Claims Processing Time','NPS'],
 ARRAY['TOGAF','COBIT 2019','ISO 27001/27002','PCI DSS','Basel Framework'],
 ARRAY['CFA','FRM','AWS ML Specialty','Azure AI Engineer'],
 '{"blueprint":"$10K-$50K","poc":"$30K-$150K","pilot":"$100K-$500K"}'::jsonb,
 '{"blueprint":"4-8 weeks","poc":"10-20 weeks","pilot":"20-40 weeks"}'::jsonb,
 ARRAY['Gartner Financial Services','McKinsey Banking','BCG Financial Institutions','Forrester','IDC Financial Insights'],
 '{
   "deliverables":{"hint":"Financial services deliverables must address: regulatory compliance testing, data security and encryption standards, integration with core banking/insurance systems, audit trail requirements, and disaster recovery specifications. Real-time processing requirements must specify latency SLAs.","anti_patterns":["Never store PII in plain text even in POC","Do not assume single-region deployment — financial services often require multi-region","Do not skip regulatory compliance even for Blueprint-level challenges"],"example_good":"D1: Credit scoring ML model achieving >0.85 AUC-ROC on provided portfolio data, with model explainability report (SHAP values per feature), bias testing across protected characteristics, and model validation documentation."},
   "solver_expertise":{"hint":"Financial services challenges should require: understanding of financial regulations (specify which), experience with financial data (time series, transaction data, market data), and knowledge of model risk management. For {{geography}}: reference local financial regulatory body and payment infrastructure standards.","typical_certifications":["CFA","FRM","AWS ML Specialty","Azure AI Engineer"],"typical_experience":"5-8 years for POC, 8-15 years for Pilot"},
   "evaluation_criteria":{"hint":"Financial services evaluation must include: model accuracy AND explainability (not just accuracy), regulatory compliance assessment, security audit results, scalability under peak transaction loads (specify TPS), and fair lending / bias testing.","must_include_criteria":["Regulatory compliance","Model explainability","Security assessment","Bias and fairness testing"]},
   "success_metrics_kpis":{"hint":"Financial KPIs must be measurable with available data. Always include risk-adjusted metrics, not just performance metrics."},
   "reward_structure":{"hint":"Financial services challenges command premium pricing due to regulatory complexity and data sensitivity. POC prizes typically $30K-$150K."},
   "context_and_background":{"hint":"Financial services context should cover: institution type (bank/NBFC/insurer/fintech), regulatory jurisdiction, current technology stack (core banking system, middleware), scale (AUM, transaction volumes, customer base), and specific regulatory pressures driving the challenge."}
 }'::jsonb),

-- 2. Healthcare
('healthcare', 'Healthcare, Pharma & Medical Devices',
 'Covers hospitals, clinics, pharmaceutical manufacturing, drug discovery, medical device development, health insurance, clinical trials, and health-tech. Extremely regulated with patient safety as paramount. Data sensitivity (PHI) requires strict access controls. Clinical workflows are complex, evidence-based, and change-resistant. Long validation cycles for anything patient-facing.',
 '{"global":["ISO 13485","ICH GCP","WHO GMP"],"us":["HIPAA","FDA 21 CFR Part 11","FDA SaMD Guidelines","FTC Health"],"eu":["GDPR","EU MDR/IVDR","EMA Guidelines","CE Marking"],"india":["DPDPA","CDSCO","NABH/NABL","ABDM/ABHA","Drugs & Cosmetics Act"],"uk":["NHS Digital Standards","MHRA","UK GDPR"],"middle_east":["DHA (Dubai)","HAAD (Abu Dhabi)","SFDA (Saudi)","MOH regulations"],"singapore":["HSA","PDPA","MOH licensing"],"australia":["TGA","AHPRA","My Health Records Act","Privacy Act"]}'::jsonb,
 'EHR systems (Epic, Cerner, HIS), PACS/DICOM imaging, HL7 FHIR interoperability, clinical trial management (Medidata, Veeva), pharma manufacturing (MES, LIMS), AI for diagnostics and drug discovery, telemedicine platforms, wearable health devices, health data lakes.',
 ARRAY['Patient Outcomes','Readmission Rate','Length of Stay','Clinical Decision Accuracy','Time to Diagnosis','Drug Discovery Cycle Time','Manufacturing Yield','Adverse Event Rate','Patient Satisfaction (HCAHPS)','Claims Denial Rate'],
 ARRAY['FHIR','DICOM','IHE Profiles','HIMSS EMRAM','GxP','ICH E6(R2)','ISO 13485','OMOP CDM'],
 ARRAY['HIMSS CPHIMS','HL7 FHIR Certification','HITRUST','Clinical Informatics Board Certification','Six Sigma for Healthcare'],
 '{"blueprint":"$10K-$40K","poc":"$25K-$150K","pilot":"$100K-$500K"}'::jsonb,
 '{"blueprint":"4-8 weeks","poc":"10-20 weeks","pilot":"20-40 weeks"}'::jsonb,
 ARRAY['WHO','NEJM','The Lancet','FDA Guidance Documents','KLAS Research','Gartner Healthcare','McKinsey Health'],
 '{
   "deliverables":{"hint":"Healthcare deliverables must address: patient data privacy (PHI handling), clinical validation methodology, regulatory pathway, integration with EHR/PACS systems, and clinician usability. Never skip IRB/Ethics committee considerations for patient data.","anti_patterns":["Never use real patient data in POC without IRB approval","Do not claim diagnostic accuracy without specifying validation dataset and methodology","Do not skip accessibility requirements (WCAG) for patient-facing solutions"],"example_good":"D1: Chest X-ray triage model achieving >0.90 AUC on CheXpert benchmark, with per-pathology sensitivity/specificity table, Grad-CAM explainability overlays, and DICOM-SR structured reporting output compatible with any PACS viewer."},
   "solver_expertise":{"hint":"Healthcare AI challenges require: clinical domain knowledge (specify specialty), understanding of healthcare data standards (HL7 FHIR, DICOM), regulatory awareness, and clinical validation experience. For {{geography}}: reference local health data regulations and digital health standards.","typical_certifications":["HIMSS","HL7 FHIR","Clinical Informatics","AWS HealthLake"],"typical_experience":"5-10 years for POC (must include clinical domain), 10+ years for Pilot."},
   "evaluation_criteria":{"hint":"Healthcare evaluation must include: clinical accuracy (sensitivity, specificity, PPV, NPV — not just overall accuracy), regulatory compliance readiness, interoperability with existing systems, patient safety risk assessment, and clinician acceptance/usability.","must_include_criteria":["Clinical accuracy metrics","Patient safety assessment","Regulatory readiness","EHR/PACS interoperability"]},
   "success_metrics_kpis":{"hint":"Healthcare KPIs must distinguish between technical metrics and clinical outcomes."}
 }'::jsonb),

-- 3. Retail
('retail', 'Retail & E-Commerce',
 'Covers physical retail, e-commerce, omnichannel operations, marketplace platforms, direct-to-consumer brands. Fast-moving, data-rich, customer-centric. Key challenges include demand forecasting, inventory optimization, personalization, last-mile delivery, and customer retention. Thin margins drive efficiency focus. Seasonal peaks require scalable solutions.',
 '{"global":["PCI DSS","Consumer protection"],"us":["FTC","CCPA","ADA accessibility"],"eu":["GDPR","EU Consumer Rights Directive","Digital Services Act","Omnibus Directive"],"india":["Consumer Protection Act 2019","DPDPA","BIS standards","FSSAI (food)","Legal Metrology Act"],"uk":["UK GDPR","Consumer Rights Act 2015"],"middle_east":["UAE Consumer Protection","Saudi Commerce Ministry"],"singapore":["PDPA","Consumer Protection (Fair Trading) Act"],"australia":["Australian Consumer Law","Privacy Act","Competition and Consumer Act"]}'::jsonb,
 'E-commerce platforms (Shopify, Magento, Salesforce Commerce), ERP (SAP Retail, Oracle), WMS (Manhattan, Blue Yonder), POS systems, recommendation engines, CDP/CRM (Salesforce, Adobe), A/B testing platforms, last-mile logistics tech, RFID/IoT for inventory.',
 ARRAY['Conversion Rate','Average Order Value','Customer Lifetime Value','Inventory Turnover','Stockout Rate','Cart Abandonment Rate','Forecast Accuracy (WMAPE)','Return Rate','NPS'],
 ARRAY['Customer Journey Mapping','RFM Analysis','Category Management','Demand-Driven MRP','SCOR Model','Omnichannel Maturity Model'],
 ARRAY['Google Analytics','Salesforce Commerce Cloud','AWS Retail Competency','APICS CPIM'],
 '{"blueprint":"$5K-$25K","poc":"$15K-$80K","pilot":"$50K-$300K"}'::jsonb,
 '{"blueprint":"3-6 weeks","poc":"8-14 weeks","pilot":"14-26 weeks"}'::jsonb,
 ARRAY['Gartner Retail','Forrester','NRF','McKinsey Retail','Euromonitor'],
 '{
   "deliverables":{"hint":"Retail deliverables should address: integration with existing e-commerce/ERP platforms, real-time processing during peak seasons, A/B testing methodology for measuring impact, and scalability from pilot stores to full chain.","anti_patterns":["Do not assume uniform data quality across all stores/channels","Do not ignore seasonal patterns in demand forecasting","Do not design for desktop-only — 70%+ of retail traffic is mobile"],"example_good":"D1: Demand forecasting model achieving <12% WMAPE at SKU-store-week level, with automated retraining pipeline, integration API for Blue Yonder WMS, and performance dashboard showing forecast vs actual by category."},
   "success_metrics_kpis":{"hint":"Retail KPIs should be measured at granular level: SKU-level, store-level, channel-level. Always include financial impact translation."}
 }'::jsonb),

-- 4. FMCG Consumer
('fmcg_consumer', 'FMCG / Consumer Goods',
 'Fast-Moving Consumer Goods covering food & beverage, personal care, household products, tobacco, and OTC pharmaceuticals. Characterized by high volumes, low margins, complex distribution networks, and short product lifecycles. Trade promotion optimization, route-to-market efficiency, and demand sensing are critical challenges. Multi-tier distribution creates data visibility gaps.',
 '{"global":["FDA food safety","Codex Alimentarius","GS1 standards"],"us":["FDA","FTC","CPSC"],"eu":["EU Food Safety","REACH","EU Consumer Rights"],"india":["FSSAI","BIS","Legal Metrology","ASCI advertising","EPR (packaging)"],"uk":["FSA","UK GDPR","CMA"],"middle_east":["Municipality standards","Halal certification","ESMA"],"singapore":["SFA","NEA","PDPA"],"australia":["FSANZ","ACCC","TGA (OTC)"]}'::jsonb,
 'ERP (SAP S/4HANA, Oracle), DMS (Distribution Management Systems), SFA (Sales Force Automation), TPM (Trade Promotion Management), demand planning (Kinaxis, o9 Solutions), CRM, direct-to-consumer platforms, IoT for cold chain monitoring.',
 ARRAY['Revenue Growth','Market Share','Distribution Reach','Trade Spend ROI','Demand Forecast Accuracy','Fill Rate','Days of Inventory','SKU Rationalization','Promotion Lift','Secondary Sales Growth'],
 ARRAY['Nielsen Retail Measurement','GS1 Standards','DSD Model','Route-to-Market','Category Captain','TPO','S&OP'],
 ARRAY['APICS CPIM/CSCP','Demand Planning Certification','SAP SCM','Nielsen Certified'],
 '{"blueprint":"$5K-$30K","poc":"$15K-$80K","pilot":"$50K-$250K"}'::jsonb,
 '{"blueprint":"3-6 weeks","poc":"8-14 weeks","pilot":"14-26 weeks"}'::jsonb,
 ARRAY['Nielsen','Circana/IRI','Kantar','McKinsey Consumer','BCG Consumer Products','Euromonitor'],
 '{
   "deliverables":{"hint":"FMCG deliverables should address: multi-tier distribution data integration (primary/secondary/tertiary sales), seasonal and promotional demand patterns, SKU proliferation management, and cold chain requirements where applicable. Solutions must work with inconsistent data from fragmented retail channels.","anti_patterns":["Do not assume clean POS data — most markets have fragmented retail with limited POS coverage","Do not ignore unorganized/general trade which dominates in many {{geography}} markets","Do not design for modern trade only"],"example_good":"D1: Demand sensing model combining primary sales (DMS), secondary sales (SFA), and external signals (weather, events) to produce SKU-depot weekly forecasts with <18% MAPE, including a cannibalization matrix for NPD launches."},
   "context_and_background":{"hint":"FMCG context must cover: distribution model (direct/indirect, # of distributors, geographic spread), channel mix (modern trade vs general trade %), current planning systems, NPD frequency, promotional calendar, and seasonality patterns."}
 }'::jsonb),

-- 5. Manufacturing
('manufacturing', 'Automotive & Industrial Manufacturing',
 'Covers automotive OEMs, tier-1/2/3 suppliers, industrial equipment manufacturing, aerospace components, steel, chemicals, and heavy engineering. Characterized by complex supply chains, quality criticality (zero-defect targets), capital-intensive operations, and Industry 4.0 transformation. OT/IT convergence, predictive maintenance, and quality inspection are key AI adoption areas.',
 '{"global":["ISO 9001","IATF 16949","ISO 14001","ISO 45001"],"us":["OSHA","EPA","NHTSA","CAFE standards"],"eu":["CE Marking","REACH/RoHS","Euro 7 emissions","EU Machinery Directive"],"india":["BIS standards","Factory Act","BS-VI emissions","Make in India"],"uk":["UK REACH","HSE regulations","UKCA marking"],"middle_east":["ESMA","Civil Defence","Municipality standards"],"singapore":["WSH Act","NEA","Spring Singapore standards"],"australia":["Safe Work Australia","ADR vehicle standards","NATA accreditation"]}'::jsonb,
 'MES (Siemens, Rockwell, AVEVA), SCADA/PLC systems, ERP (SAP S/4HANA), PLM (Siemens Teamcenter, PTC Windchill), CAD/CAM, industrial IoT platforms (Siemens MindSphere, PTC ThingWorx, AWS IoT Greengrass), machine vision systems (Cognex, Keyence), robotics (Fanuc, KUKA).',
 ARRAY['OEE','First Pass Yield','PPM Defects','MTBF/MTTR','Scrap Rate','Unplanned Downtime %','Cycle Time','On-Time Delivery','Supplier Quality Index','Energy per Unit'],
 ARRAY['Lean Six Sigma','TPM','ISA-95/ISA-88','Industry 4.0 Maturity','APQP/PPAP','FMEA','SPC'],
 ARRAY['Six Sigma Green/Black Belt','PMP','AWS IoT Specialty','Siemens MindSphere','CMRP','CQE'],
 '{"blueprint":"$5K-$30K","poc":"$15K-$100K","pilot":"$50K-$400K"}'::jsonb,
 '{"blueprint":"4-6 weeks","poc":"8-16 weeks","pilot":"16-32 weeks"}'::jsonb,
 ARRAY['McKinsey Manufacturing','BCG Operations','ISA','WEF Manufacturing','Gartner Supply Chain','Deloitte Industry 4.0'],
 '{
   "deliverables":{"hint":"Manufacturing deliverables must address: OT/IT integration (SCADA, PLC, MES connectivity), edge deployment constraints (latency, connectivity, compute), production data validation (not just lab data), operator usability (shopfloor literacy levels), and integration with existing quality management systems.","anti_patterns":["Do not suggest cloud-only solutions without addressing OT network isolation and data sovereignty","Do not assume all plants have uniform automation levels","Do not ignore operator training and change management requirements","Do not propose solutions requiring >500ms latency for real-time inspection"],"example_good":"D1: Defect classification model (TensorFlow Lite, ONNX export) achieving >95% accuracy on 4 defect types, validated on production-line images under varying lighting. Includes edge deployment package for Cognex InSight 7000, integration spec for SAP PM alert pipeline, and model card with performance by steel grade and shift."},
   "solver_expertise":{"hint":"Manufacturing AI challenges should require: industrial IoT experience with OT protocols (OPC-UA, MQTT, Modbus), familiarity with MES/SCADA integration, edge computing experience for constrained environments, and domain knowledge of the specific manufacturing process. For {{geography}}: reference local manufacturing standards and government initiatives.","typical_certifications":["AWS IoT","Azure IoT","Six Sigma Black Belt","Siemens MindSphere","CMRP"],"typical_experience":"3-7 years for POC, 7-15 years for Pilot."},
   "evaluation_criteria":{"hint":"Manufacturing challenges must evaluate: accuracy on PRODUCTION data (not just test data), inference latency for real-time use cases, robustness under real-world conditions (lighting, vibration, temperature), integration complexity with existing OT systems, and total cost of ownership including edge hardware.","must_include_criteria":["Production data accuracy","Inference latency","OT integration complexity","Robustness under operating conditions"]},
   "success_metrics_kpis":{"hint":"Manufacturing KPIs should always benchmark against industry standards. OEE improvement of 5-10% is realistic for first deployment."},
   "data_resources_provided":{"hint":"Manufacturing data resources should specify: sensor types and sampling rates, image resolution and capture conditions, historical data volume and time range, data labeling methodology and quality, access method (on-premise only vs cloud-shareable), and any confidentiality constraints."},
   "context_and_background":{"hint":"Manufacturing context must cover: plant locations, production volumes (units/day), current automation level (manual/semi/fully), existing MES/SCADA/PLC systems with versions, data availability and collection methods, workforce digital literacy, and network infrastructure (air-gapped OT networks, bandwidth constraints)."}
 }'::jsonb),

-- 6. Technology (India IT)
('technology_india_it', 'Technology (India IT Services)',
 'India IT services industry covering TCS, Infosys, Wipro, HCLTech, Tech Mahindra, and thousands of mid-tier firms. Offshore/nearshore delivery models, digital transformation services, cloud migration, enterprise application management. Industry-specific challenges: talent retention, margin pressure, AI-driven automation of traditional services, shift from staff augmentation to outcome-based models.',
 '{"global":["SOC 2","ISO 27001","OWASP","CMMI"],"us":["CCPA","FedRAMP","Section 508","ITAR (defense)"],"eu":["GDPR","NIS2","EU AI Act","WCAG 2.1"],"india":["DPDPA","IT Act 2000","CERT-In guidelines","STQC","SEZ/STPI regulations","NASSCOM guidelines"],"uk":["UK GDPR","Cyber Essentials","G-Cloud"],"middle_east":["NESA (UAE)","NCA (Saudi)","ADHICS"],"singapore":["PDPA","Cybersecurity Act","IMDA"],"australia":["Privacy Act","Essential Eight","ASD guidelines"]}'::jsonb,
 'Offshore delivery centers, cloud platforms (AWS, Azure, GCP), DevOps/SRE practices, enterprise applications (SAP, Oracle, Salesforce), low-code (OutSystems, Mendix), AI/ML platforms, API management, microservices, containerization (Kubernetes). India-specific: NASSCOM ecosystem, GIC/captive centers, startup partnerships.',
 ARRAY['Revenue Growth','EBITDA Margin','Utilization Rate','Employee Attrition','Revenue per Employee','Client Concentration','Deal Win Rate','Delivery SLA Adherence','CSAT/NPS','Digital Revenue %'],
 ARRAY['SAFe','Scrum/Kanban','TOGAF','ITIL 4','CMMI','12-Factor App','Well-Architected Framework','DORA Metrics','SRE','FinOps'],
 ARRAY['AWS Solutions Architect','Azure Solutions Architect','GCP Professional','CKA/CKAD','TOGAF','PMP','Scrum Master','ITIL Foundation','SAFe Agilist'],
 '{"blueprint":"$5K-$25K","poc":"$10K-$75K","pilot":"$40K-$250K"}'::jsonb,
 '{"blueprint":"3-6 weeks","poc":"6-12 weeks","pilot":"12-24 weeks"}'::jsonb,
 ARRAY['NASSCOM','Gartner IT Services','Forrester','Everest Group','HFS Research','ISG','Zinnov'],
 '{
   "deliverables":{"hint":"India IT services deliverables should address: offshore delivery model (onsite-offshore ratio), knowledge transfer plan, SLA/KPI framework for managed services, transition methodology (ADMS), and IP ownership clarity. For digital transformation: specify cloud migration approach (6R strategy), modernization patterns, and testing strategy.","anti_patterns":["Do not assume onsite-only delivery — India IT typically uses 20-30% onsite, 70-80% offshore","Do not ignore knowledge transition plan for ongoing engagements","Do not propose enterprise-wide transformation without phased approach"],"example_good":"D1: Cloud migration assessment for 45 SAP workloads with 6R classification, TCO analysis (on-prem vs cloud), migration runbook for top-10 priority workloads, and landing zone architecture (AWS Control Tower) with security guardrails."},
   "solver_expertise":{"hint":"India IT challenges should specify: delivery model experience (offshore, nearshore, hybrid), client industry domain knowledge, and certifications relevant to the engagement type. India has deep talent in Java, .NET, SAP, Oracle, cloud, and increasingly AI/ML.","typical_certifications":["AWS/Azure/GCP Professional","SAFe Agilist","PMP","ITIL","TOGAF"],"typical_experience":"5-8 years for POC, 10-15 years for Pilot (delivery leadership)"},
   "evaluation_criteria":{"hint":"India IT evaluations should include: technical depth, delivery methodology maturity, transition/knowledge transfer plan quality, commercial viability (rate card competitiveness), and references from similar engagements.","must_include_criteria":["Technical architecture quality","Delivery methodology","Transition plan","Commercial model","Reference clients"]},
   "success_metrics_kpis":{"hint":"IT services KPIs should span both delivery metrics (SLA adherence, defect density, velocity) and business outcomes (cost savings, time-to-market improvement, digital adoption)."}
 }'::jsonb),

-- 7. Energy
('energy', 'Energy & Utilities',
 'Covers power generation, T&D, renewables, oil & gas, utilities. Capital-intensive, safety-critical, decarbonization focused. Asset management, predictive maintenance, grid modernization.',
 '{"global":["ISO 55001","IEC 61850","ESG standards"],"us":["NERC","EPA","FERC"],"eu":["EU Green Deal","EU ETS","Energy Efficiency Directive"],"india":["CERC/SERC","CEA","PNGRB","MNRE","AERB"],"uk":["Ofgem","Climate Change Act","UK ETS"],"middle_east":["DEWA (Dubai)","SEC (Saudi)","ADNOC HSE"],"singapore":["EMA","NEA"],"australia":["AEMO","AER","Clean Energy Regulator"]}'::jsonb,
 'SCADA/DCS, EMS/ADMS, GIS, asset management (IBM Maximo, SAP PM), DERMS, smart metering (AMI), drone inspection, digital twins, energy trading.',
 ARRAY['Plant Load Factor','T&D Losses','SAIDI/SAIFI','LCOE','Carbon Intensity','Equipment Availability','HSE Incident Rate','Renewable Mix %'],
 ARRAY['ISO 55001','IEC 61850','NERC CIP','ESG Reporting'],
 ARRAY['PMP','Six Sigma','AWS Energy','CMRP'],
 '{"blueprint":"$10K-$40K","poc":"$25K-$150K","pilot":"$100K-$500K"}'::jsonb,
 '{"blueprint":"4-8 weeks","poc":"10-20 weeks","pilot":"20-40 weeks"}'::jsonb,
 ARRAY['IEA','McKinsey Energy','BCG Energy','Wood Mackenzie','BloombergNEF'],
 '{}'::jsonb),

-- 8. Education
('education', 'Education & EdTech',
 'Covers K-12, higher education, vocational training, corporate L&D, ed-tech, certifications. Outcome-focused, accessibility-conscious, hybrid/online shift.',
 '{"global":["UNESCO standards","WCAG accessibility"],"us":["FERPA","COPPA","ADA/Section 508"],"eu":["GDPR","EU Accessibility Act","Bologna Process"],"india":["NEP 2020","UGC/AICTE","DPDPA"],"uk":["UK GDPR","Ofsted","QAA"],"middle_east":["KHDA (Dubai)","MOE regulations"],"singapore":["MOE","SkillsFuture","PDPA"],"australia":["TEQSA","ESOS Act","ACARA standards"]}'::jsonb,
 'LMS (Canvas, Moodle, Blackboard), SIS, assessment platforms, adaptive learning, content authoring, learning analytics.',
 ARRAY['Completion Rate','Learning Outcome Achievement','Student Satisfaction','Time to Proficiency','Dropout Rate','Placement Rate'],
 ARRAY['Blooms Taxonomy','ADDIE','Kirkpatrick Model','UDL','OBE'],
 ARRAY['Google Certified Educator','Microsoft Innovative Educator','Instructional Design Certificate'],
 '{"blueprint":"$3K-$15K","poc":"$8K-$50K","pilot":"$25K-$150K"}'::jsonb,
 '{"blueprint":"3-5 weeks","poc":"6-10 weeks","pilot":"10-20 weeks"}'::jsonb,
 ARRAY['UNESCO','World Bank Education','EdSurge','EDUCAUSE','HolonIQ'],
 '{}'::jsonb),

-- 9. Consulting
('consulting', 'Consulting & Advisory',
 'Management consulting, strategy, technology consulting, implementation services. Knowledge-intensive, methodology-driven, client-relationship focused. Being disrupted by AI and platform models.',
 '{"global":["Professional liability","NDA/confidentiality"],"us":["SOX (audit-adjacent)","SEC independence"],"eu":["GDPR","EU Whistleblower Directive"],"india":["Companies Act 2013","ICAI standards"],"uk":["FRC","SRA"],"middle_east":["DIFC regulations","Free zone licensing"],"singapore":["ACRA","Professional services regulations"],"australia":["ASIC","Professional Standards legislation"]}'::jsonb,
 'Knowledge management (SharePoint, Guru), CRM (Salesforce), proposal tools, collaboration (Teams, Slack), BI (Tableau, Power BI), project management.',
 ARRAY['Utilization Rate','Revenue per Partner','Proposal Win Rate','Client NPS','Knowledge Reuse Rate','Repeat Business Rate'],
 ARRAY['McKinsey 7S','Porters Five Forces','BCG Matrix','PESTLE','Balanced Scorecard','OKRs','Value Chain Analysis'],
 ARRAY['PMP','Scrum Master','TOGAF','Six Sigma'],
 '{"blueprint":"$5K-$25K","poc":"$10K-$60K","pilot":"$30K-$150K"}'::jsonb,
 '{"blueprint":"2-4 weeks","poc":"4-8 weeks","pilot":"8-16 weeks"}'::jsonb,
 ARRAY['Gartner','HBR','McKinsey Global Institute','Source Global Research','ALM Intelligence'],
 '{
   "deliverables":{"hint":"Consulting deliverables should be primarily knowledge artifacts: strategy documents, frameworks, playbooks, assessment tools. Focus on actionable recommendations with implementation roadmaps.","example_good":"D1: Market entry strategy document (40-60 pages) including competitive landscape analysis, target segment prioritization (TAM/SAM/SOM), go-to-market playbook with 90-day action plan, and executive presentation deck."}
 }'::jsonb),

-- 10. Electronics & High-Tech
('electronics_hightech', 'Electronics & High-Tech',
 'Covers semiconductor manufacturing, consumer electronics, telecom equipment, embedded systems, PCB assembly, and high-tech R&D. Characterized by rapid innovation cycles, miniaturization, extreme precision requirements, complex global supply chains, and IP-intensive operations. Yield optimization, test automation, and supply chain resilience are key challenges.',
 '{"global":["RoHS","REACH","IPC standards"],"us":["FCC","ITAR/EAR export controls","UL certification"],"eu":["CE marking","WEEE","EU Chips Act","Cyber Resilience Act"],"india":["BIS compulsory registration","WPC (wireless)","IT Act","PLI for electronics"],"uk":["UKCA marking","UK RoHS"],"middle_east":["TRA (UAE telecom)","CITC (Saudi)","ESMA"],"singapore":["IMDA","NEA e-waste","SPRING marks"],"australia":["RCM marking","ACMA","e-waste regulations"]}'::jsonb,
 'EDA tools (Cadence, Synopsys), fab equipment (ASML, Applied Materials), test systems (Keysight, Teradyne), PLM, MES for semiconductor, IoT platforms, embedded RTOS, 5G/6G technologies.',
 ARRAY['Yield Rate','Defect Density','Time to Market','Design Re-spin Rate','Test Coverage','Supply Chain Lead Time','NPI Success Rate','Patent Portfolio Growth'],
 ARRAY['IPC Standards','JEDEC','IEEE','SEMI Standards','Design for Six Sigma'],
 ARRAY['IPC Certification','Embedded Systems Cert','RF Engineering','ISTQB'],
 '{"blueprint":"$10K-$40K","poc":"$25K-$150K","pilot":"$100K-$500K"}'::jsonb,
 '{"blueprint":"4-8 weeks","poc":"10-20 weeks","pilot":"20-40 weeks"}'::jsonb,
 ARRAY['Gartner Semiconductors','IDC','Counterpoint Research','IC Insights','SEMI'],
 '{}'::jsonb),

-- 11. Travel & Hospitality
('travel_hospitality', 'Travel, Tourism & Hospitality',
 'Covers airlines, hotels, OTAs, cruise lines, restaurants, destination management. Highly seasonal, perishable inventory (unsold room/seat = lost revenue), price-sensitive customers. Personalization, dynamic pricing, and guest experience are key differentiators.',
 '{"global":["IATA regulations","PCI DSS","UNWTO standards"],"us":["DOT airline regulations","ADA accessibility","state travel taxes"],"eu":["GDPR","EU Package Travel Directive","EU Passenger Rights"],"india":["DGCA","FSSAI (F&B)","GST for hospitality"],"uk":["CAA","UK GDPR","Package Travel Regulations"],"middle_east":["DCAA (Dubai)","SCTA (Saudi tourism)","Emirates airline regulations"],"singapore":["CAAS","STB licensing","PDPA"],"australia":["CASA","Australian Consumer Law","state tourism regulations"]}'::jsonb,
 'PMS (Opera, Cloudbeds), GDS (Amadeus, Sabre, Travelport), RMS (IDeaS, Duetto), booking engines, CRM/CDP, POS for F&B, IoT for smart rooms, chatbots/virtual concierge, loyalty platforms.',
 ARRAY['RevPAR','ADR','Occupancy Rate','GOPPAR','Guest Satisfaction','Booking Conversion Rate','Cancellation Rate','Loyalty Engagement'],
 ARRAY['Revenue Management','Service Blueprint','Net Promoter System','USALI','Yield Management'],
 ARRAY['CHIA','CHA','IATA Certification','Revenue Management Certification'],
 '{"blueprint":"$5K-$25K","poc":"$15K-$80K","pilot":"$50K-$250K"}'::jsonb,
 '{"blueprint":"3-6 weeks","poc":"8-14 weeks","pilot":"14-26 weeks"}'::jsonb,
 ARRAY['STR Global','Phocuswright','Skift','McKinsey Travel','Deloitte Hospitality'],
 '{
   "deliverables":{"hint":"Deliverables should address: integration with PMS/GDS/RMS, real-time pricing capabilities, seasonal pattern handling, multi-property scalability, and guest data privacy.","anti_patterns":["Do not ignore seasonality — occupancy patterns vary dramatically","Do not assume uniform data quality across properties","Do not design dynamic pricing without competitor rate monitoring"],"example_good":"D1: Dynamic pricing model for 500-room resort achieving 8-12% RevPAR improvement, with PMS integration (Oracle Opera), competitor rate feed, and A/B testing framework."}
 }'::jsonb),

-- 12. Manufacturing Auto Components
('manufacturing_auto_components', 'Manufacturing (Auto Components)',
 'Tier-1/2/3 auto component suppliers covering machining (CNC, VMC), forging, casting, stamping, heat treatment, surface treatment, and assembly. Focused on OEE improvement, zero-defect delivery to OEMs, IATF 16949 compliance, and shopfloor digitalization. Typical challenges: defect reduction, cycle time optimization, SPC implementation, predictive maintenance for CNC machines, and ERP/MES-driven production planning.',
 '{"global":["IATF 16949","ISO 9001","ISO 14001","IMDS"],"us":["OSHA","EPA","NHTSA","PPAP/APQP"],"eu":["CE Marking","REACH/RoHS","Euro 7","VDA standards"],"india":["BIS standards","Factory Act","ACMA guidelines","BS-VI compliance","PLI Auto Components","Make in India"],"uk":["UKCA marking","HSE"],"middle_east":["ESMA","Industrial licensing"],"singapore":["WSH Act","Spring Singapore"],"australia":["ADR vehicle standards","Safe Work Australia"]}'::jsonb,
 'CNC machines (Fanuc, Mazak, DMG Mori), VMC/HMC centers, CMM (Zeiss, Mitutoyo), MES (Siemens, AVEVA), ERP (SAP PP/PM, Oracle Manufacturing), SPC software (Minitab, InfinityQS), machine vision (Cognex, Keyence for gauging), PLC/SCADA for shopfloor, tool management systems.',
 ARRAY['OEE','First Pass Yield','PPM (customer complaints)','CPK/PPK','Scrap Rate','Setup Time (SMED)','Cycle Time','On-Time Delivery to OEM','Machine Availability','Rework %'],
 ARRAY['Lean Six Sigma','TPM','APQP/PPAP','FMEA','SPC','SMED','Kaizen'],
 ARRAY['Six Sigma Black Belt','CQE','IATF 16949 Auditor','CMRP','AWS IoT'],
 '{"blueprint":"$3K-$20K","poc":"$10K-$60K","pilot":"$30K-$200K"}'::jsonb,
 '{"blueprint":"3-5 weeks","poc":"6-12 weeks","pilot":"12-24 weeks"}'::jsonb,
 ARRAY['ACMA India','McKinsey Manufacturing','BCG Operations','Deloitte Industry 4.0'],
 '{
   "deliverables":{"hint":"Auto components deliverables must address: shopfloor-level constraints (CNC/VMC machines, air-gapped networks, operator skill levels), integration with existing SPC/quality systems, real-time inspection at line speed, and OEM customer audit requirements (IATF 16949, PPAP). Edge deployment is critical — most auto component plants have limited cloud connectivity on the shopfloor.","anti_patterns":["Do not assume cloud connectivity on the shopfloor — most plants have air-gapped OT networks","Do not ignore operator training — shopfloor literacy varies widely","Do not propose solutions that disrupt production line rhythm or cycle time","Do not suggest replacing existing SPC systems — integrate with them"],"example_good":"D1: In-line defect detection system for CNC-machined valve bodies using Cognex camera + edge AI (TensorFlow Lite), achieving >97% detection rate for burr, scratch, and dimensional deviations at cycle time of 45 seconds/part. Includes CMM correlation report, integration with existing Minitab SPC charts, and operator tablet interface for defect review."},
   "solver_expertise":{"hint":"Auto components challenges should require: manufacturing process knowledge (machining, forging, assembly), familiarity with automotive quality standards (IATF 16949, PPAP, APQP), SPC/statistical analysis experience, and shopfloor IT integration skills. For {{geography}}: reference local automotive industry standards and OEM requirements.","typical_certifications":["Six Sigma Black Belt","CQE","IATF 16949 Auditor","CMRP","AWS IoT"],"typical_experience":"3-5 years for POC (must include shopfloor experience), 7-10 years for Pilot."},
   "evaluation_criteria":{"hint":"Auto components evaluation must include: detection accuracy on production parts (not lab samples), false positive rate (affects line throughput), cycle time impact (<5% increase acceptable), integration feasibility with existing quality systems, and OEM audit readiness.","must_include_criteria":["Production accuracy","False positive rate","Cycle time impact","SPC integration","OEM audit compliance"]},
   "success_metrics_kpis":{"hint":"Auto components KPIs should reference OEM customer scorecards. PPM targets are set by OEMs and non-negotiable. OEE targets should benchmark against JIPM/TPM standards."},
   "context_and_background":{"hint":"Auto components context must cover: OEM customer names (anonymized if needed), product types (engine parts, transmission, suspension, etc.), production volumes per month, current quality systems (SPC, CMM, visual inspection), machine fleet (CNC types, ages, controllers), and specific OEM quality requirements or audit findings driving the challenge."}
 }'::jsonb),

-- 13. Technology (generic — no pack, placeholder with minimal data)
('technology', 'Technology',
 'General technology sector. For India IT services, use the technology_india_it pack instead.',
 '{}'::jsonb,
 'Cloud platforms (AWS, Azure, GCP), AI/ML, DevOps, microservices, Kubernetes.',
 ARRAY['Revenue Growth','Customer Acquisition Cost','Churn Rate','MRR/ARR','NPS'],
 ARRAY['Agile/Scrum','TOGAF','Well-Architected Framework'],
 ARRAY['AWS SA','Azure SA','GCP Professional'],
 '{"blueprint":"$5K-$25K","poc":"$15K-$80K","pilot":"$50K-$300K"}'::jsonb,
 '{"blueprint":"3-6 weeks","poc":"6-12 weeks","pilot":"12-24 weeks"}'::jsonb,
 ARRAY['Gartner','Forrester','IDC'],
 '{}'::jsonb)

ON CONFLICT (industry_code) DO NOTHING;

-- ===========================================================================
-- PART 3: Create geography_context table
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.geography_context (
  region_code TEXT PRIMARY KEY,
  region_name TEXT NOT NULL,
  data_privacy_laws TEXT[] DEFAULT '{}',
  business_culture TEXT,
  currency_context TEXT,
  talent_market TEXT,
  government_initiatives TEXT[] DEFAULT '{}',
  technology_maturity TEXT,
  country_codes TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.geography_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_geo" ON public.geography_context
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_geo" ON public.geography_context
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.geography_context (region_code, region_name, data_privacy_laws, business_culture, currency_context, talent_market, government_initiatives, technology_maturity, country_codes)
VALUES
('india', 'India',
 ARRAY['DPDPA 2023','IT Act 2000','Aadhaar Act'],
 'Hierarchical decision-making, relationship-driven, price-conscious. Long procurement cycles in government/PSU. Agile adoption strong in IT sector.',
 'INR. $25K USD ≈ ₹20L. Strong prize for Indian talent pool. PPP factor: $1 buys ~3x what it buys in US.',
 'Strong AI/ML and software talent. Competitive salaries $15-40K/yr mid-level. IITs/IIMs produce top talent. Large freelancer ecosystem.',
 ARRAY['Digital India','Make in India','Startup India','PLI Schemes','National AI Strategy'],
 'Mixed: metros are cloud-mature, tier-2/3 cities have infrastructure gaps. Mobile-first market.',
 ARRAY['IN']),

('us', 'United States',
 ARRAY['CCPA/CPRA','HIPAA','FERPA','GLBA','State privacy laws'],
 'Results-oriented, fast-paced, direct communication. Strong IP protection. Litigious environment.',
 'USD. Primary global currency. $25K is a modest POC budget. $100K+ expected for enterprise.',
 'Expensive talent ($100-250K/yr senior). Strong AI/ML but competitive market. H-1B constraints.',
 ARRAY['CHIPS Act','IRA','AI Executive Order','NSF AI Institutes'],
 'Cloud-mature. Enterprise adoption high. Strong startup ecosystem.',
 ARRAY['US']),

('eu', 'European Union',
 ARRAY['GDPR','EU AI Act','NIS2','ePrivacy Directive'],
 'High regulatory awareness. Privacy-by-design culture. Strong industrial base. Consensus-oriented.',
 'EUR. €25K is reasonable POC budget. VAT considerations. Enterprise budgets higher than India, lower than US.',
 'Strong engineering in Germany, Netherlands, Nordics. Eastern Europe offers cost-effective AI talent.',
 ARRAY['Horizon Europe','EU Digital Decade','Green Deal','EU Chips Act'],
 'GDPR compliance is non-negotiable. Strong industrial IoT adoption.',
 ARRAY['DE','FR','IT','ES','NL','BE','SE','PL','AT','IE','PT','FI','DK','CZ','RO','HU']),

('uk', 'United Kingdom',
 ARRAY['UK GDPR','DPA 2018','Investigatory Powers Act'],
 'Professional, process-oriented, strong governance. Post-Brexit regulatory divergence. London is fintech hub.',
 'GBP. £20K is modest POC budget. London costs significantly higher than rest of UK.',
 'Strong AI research (Oxford, Cambridge, DeepMind). Competitive London market.',
 ARRAY['UK AI Strategy','National Data Strategy','Catapult Network','AI Safety Institute'],
 'Cloud-mature. Financial services and health-tech are key verticals.',
 ARRAY['GB']),

('middle_east', 'Middle East',
 ARRAY['DIFC Data Protection','PDPL (Saudi)','Qatar Privacy Law'],
 'Relationship-first, hierarchical, government-linked. Premium budgets. Localization (Arabization) requirements. Vision 2030 driving digital transformation.',
 'USD/AED/SAR. Premium budgets — $50K+ POC common for government. Tax-free environment affects pricing.',
 'Importing talent heavily. Strong demand, limited local AI supply. UAE/Saudi investing heavily in AI.',
 ARRAY['UAE AI Strategy 2031','Saudi Vision 2030','NEOM','Smart Dubai','ADGM/DIFC innovation hubs'],
 'Rapidly modernizing. Government-led digital transformation. Cloud adoption accelerating.',
 ARRAY['AE','SA','QA','BH','KW','OM']),

('singapore', 'Singapore',
 ARRAY['PDPA','Cybersecurity Act'],
 'Efficient, rule-abiding, meritocratic. GLCs are major buyers. Strong IP protection. Smart Nation vision.',
 'SGD. S$30K is reasonable POC budget. High cost of living but strong government grants offset costs.',
 'Small but highly skilled pool. Government invests in AI upskilling. Competing globally for researchers.',
 ARRAY['Smart Nation','AI Singapore (AISG)','National AI Strategy 2.0','SkillsFuture'],
 'Highly mature. Cloud-native adoption high. Strong government digital infrastructure.',
 ARRAY['SG']),

('australia', 'Australia',
 ARRAY['Privacy Act 1988','CDR','My Health Records Act'],
 'Egalitarian, direct. Government procurement is structured and slow. Mining and agriculture drive tech spend.',
 'AUD. A$40K is reasonable POC budget. Higher cost base than Asia but lower than US.',
 'Growing AI talent in Sydney/Melbourne. Universities producing quality graduates. Brain drain concern.',
 ARRAY['National AI Centre','Digital Economy Strategy','Critical Minerals Strategy'],
 'Cloud-mature in enterprise. Strong mining-tech and agri-tech verticals.',
 ARRAY['AU','NZ']),

('apac_other', 'APAC (Other)',
 ARRAY['APPI (Japan)','PIPA (South Korea)','PDPA (Malaysia/Thailand)','GR 71 (Indonesia)'],
 'Varies: Japan (consensus, formal), Korea (hierarchical, fast), SE Asia (relationship-driven). Diverse regulatory environments.',
 'Mixed currencies. Japan/Korea similar to EU. SE Asia closer to India PPP levels.',
 'Japan: aging workforce, strong robotics. Korea: strong AI (Samsung, LG). SE Asia: rapidly growing, cost-effective.',
 ARRAY['Japan AI Strategy','Korean New Deal','Malaysia MyDigital','Thailand 4.0','Indonesia Making 4.0'],
 'Japan/Korea: highly mature. SE Asia: rapidly developing, mobile-first, mixed infrastructure.',
 ARRAY['JP','KR','MY','TH','ID','PH','VN','TW'])

ON CONFLICT (region_code) DO NOTHING;
