/**
 * Proficiency Taxonomy data for Manufacturing (Auto Components) industry segment
 * This file contains the complete taxonomy structure for all 4 expertise levels
 */

export interface TaxonomySpeciality {
  name: string;
  displayOrder: number;
}

export interface TaxonomySubDomain {
  name: string;
  displayOrder: number;
  specialities: TaxonomySpeciality[];
}

export interface TaxonomyArea {
  name: string;
  subDomains: TaxonomySubDomain[];
}

export interface TaxonomyLevel {
  levelNumber: number;
  label: string;
  areas: TaxonomyArea[];
}

export const manufacturingAutoComponentsTaxonomy: TaxonomyLevel[] = [
  {
    levelNumber: 1,
    label: "Emerging Digital Problem Solver",
    areas: [
      {
        name: "Future & Business Blueprint",
        subDomains: [
          {
            name: "Strategic Basics",
            displayOrder: 1,
            specialities: [
              { name: "Vision & mission articulation (support)", displayOrder: 1 },
              { name: "Strategic goal alignment (support)", displayOrder: 2 },
              { name: "Industry benchmarking (auto components)", displayOrder: 3 },
            ],
          },
          {
            name: "Business Understanding",
            displayOrder: 2,
            specialities: [
              { name: "Auto components value chain mapping", displayOrder: 1 },
              { name: "Cost driver identification (materials, labour, overheads)", displayOrder: 2 },
              { name: "Margin lever mapping (yield, scrap, uptime, mix)", displayOrder: 3 },
            ],
          },
          {
            name: "Outcome Framing",
            displayOrder: 3,
            specialities: [
              { name: "KPI definition (support)", displayOrder: 1 },
              { name: "Baseline assessment (current-state performance)", displayOrder: 2 },
              { name: "Reporting structures & scorecard setup (support)", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Product & Service Innovation",
        subDomains: [
          {
            name: "Product Understanding",
            displayOrder: 1,
            specialities: [
              { name: "Product portfolio mapping", displayOrder: 1 },
              { name: "BOM understanding & documentation", displayOrder: 2 },
              { name: "Variant complexity mapping", displayOrder: 3 },
            ],
          },
          {
            name: "Customer Touchpoints",
            displayOrder: 2,
            specialities: [
              { name: "OEM / Tier-1 interaction mapping", displayOrder: 1 },
              { name: "Order-to-delivery journey mapping", displayOrder: 2 },
              { name: "Complaint-to-resolution flow mapping", displayOrder: 3 },
            ],
          },
          {
            name: "Value Basics",
            displayOrder: 3,
            specialities: [
              { name: "Feature vs cost mapping", displayOrder: 1 },
              { name: "Quality & delivery value drivers mapping", displayOrder: 2 },
              { name: "Basic value proposition articulation (support)", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Business & Operational Excellence",
        subDomains: [
          {
            name: "Process Mapping",
            displayOrder: 1,
            specialities: [
              { name: "AS-IS process documentation", displayOrder: 1 },
              { name: "SOP / work-instruction drafting", displayOrder: 2 },
              { name: "Process compliance tracking (support)", displayOrder: 3 },
            ],
          },
          {
            name: "Shopfloor Basics",
            displayOrder: 2,
            specialities: [
              { name: "Line flow mapping", displayOrder: 1 },
              { name: "Takt time & throughput awareness mapping", displayOrder: 2 },
              { name: "Workstation layout observation & documentation", displayOrder: 3 },
            ],
          },
          {
            name: "Execution Support",
            displayOrder: 3,
            specialities: [
              { name: "Issue tracking & coordination support", displayOrder: 1 },
              { name: "Daily performance reporting support", displayOrder: 2 },
              { name: "Action register maintenance", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Digital & Technology Blueprint",
        subDomains: [
          {
            name: "Digital Awareness",
            displayOrder: 1,
            specialities: [
              { name: "ERP / MES basics mapping", displayOrder: 1 },
              { name: "Manufacturing IT landscape documentation", displayOrder: 2 },
              { name: "OT vs IT boundaries understanding", displayOrder: 3 },
            ],
          },
          {
            name: "Data Basics",
            displayOrder: 2,
            specialities: [
              { name: "Master data understanding (material, routing, work centers)", displayOrder: 1 },
              { name: "Basic dashboards support (OEE, scrap, downtime)", displayOrder: 2 },
              { name: "Data quality checks support", displayOrder: 3 },
            ],
          },
          {
            name: "Technology Support",
            displayOrder: 3,
            specialities: [
              { name: "Application configuration support", displayOrder: 1 },
              { name: "UAT coordination support", displayOrder: 2 },
              { name: "User documentation & training material support", displayOrder: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    levelNumber: 2,
    label: "Domain Specialist & Workstream Lead",
    areas: [
      {
        name: "Future & Business Blueprint",
        subDomains: [
          {
            name: "Strategy Translation",
            displayOrder: 1,
            specialities: [
              { name: "Strategic goals to initiatives translation", displayOrder: 1 },
              { name: "Workstream-level roadmap creation", displayOrder: 2 },
              { name: "Initiative prioritization support", displayOrder: 3 },
            ],
          },
          {
            name: "Business Model Optimization",
            displayOrder: 2,
            specialities: [
              { name: "Cost-to-serve analysis (OEM / Tier-1)", displayOrder: 1 },
              { name: "Make-vs-buy analysis support", displayOrder: 2 },
              { name: "Capacity & footprint planning support", displayOrder: 3 },
            ],
          },
          {
            name: "Performance Architecture",
            displayOrder: 3,
            specialities: [
              { name: "KPI trees & metric hierarchies", displayOrder: 1 },
              { name: "Plant scorecards design", displayOrder: 2 },
              { name: "Business performance review cadence setup", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Product & Service Innovation",
        subDomains: [
          {
            name: "Product Strategy",
            displayOrder: 1,
            specialities: [
              { name: "Modularization support", displayOrder: 1 },
              { name: "Platform strategy support", displayOrder: 2 },
              { name: "Customization control mechanisms", displayOrder: 3 },
            ],
          },
          {
            name: "Service Constructs",
            displayOrder: 2,
            specialities: [
              { name: "Aftermarket service design", displayOrder: 1 },
              { name: "Warranty & claims improvement", displayOrder: 2 },
              { name: "Lifecycle service packaging", displayOrder: 3 },
            ],
          },
          {
            name: "Customer Experience",
            displayOrder: 3,
            specialities: [
              { name: "OEM collaboration model improvement", displayOrder: 1 },
              { name: "Demand visibility improvement (forecast sharing, EDI)", displayOrder: 2 },
              { name: "Supplier performance experience improvement", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Business & Operational Excellence",
        subDomains: [
          {
            name: "Process Excellence",
            displayOrder: 1,
            specialities: [
              { name: "Lean waste elimination", displayOrder: 1 },
              { name: "Six Sigma (DMAIC) facilitation", displayOrder: 2 },
              { name: "Bottleneck removal & line balancing", displayOrder: 3 },
            ],
          },
          {
            name: "Operating Model",
            displayOrder: 2,
            specialities: [
              { name: "Plant role clarity (RACI) design", displayOrder: 1 },
              { name: "Decision rights & escalation models", displayOrder: 2 },
              { name: "Cross-functional governance routines", displayOrder: 3 },
            ],
          },
          {
            name: "Workforce Enablement",
            displayOrder: 3,
            specialities: [
              { name: "Skills mapping for shopfloor roles", displayOrder: 1 },
              { name: "Digital work instructions enablement", displayOrder: 2 },
              { name: "Training & adoption planning", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Digital & Technology Blueprint",
        subDomains: [
          {
            name: "Technology Enablement",
            displayOrder: 1,
            specialities: [
              { name: "ERP–MES integration design support", displayOrder: 1 },
              { name: "Shopfloor digitization (Andon, eLogs, eChecklists)", displayOrder: 2 },
              { name: "Traceability system implementation support", displayOrder: 3 },
            ],
          },
          {
            name: "Data Foundations",
            displayOrder: 2,
            specialities: [
              { name: "Operational analytics design (OEE, scrap, downtime)", displayOrder: 1 },
              { name: "KPI dashboards & alerts", displayOrder: 2 },
              { name: "Data pipelines for production reporting", displayOrder: 3 },
            ],
          },
          {
            name: "Governance Basics",
            displayOrder: 3,
            specialities: [
              { name: "Data ownership & stewardship setup", displayOrder: 1 },
              { name: "Role-based access controls (RBAC)", displayOrder: 2 },
              { name: "Change control & release governance support", displayOrder: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    levelNumber: 3,
    label: "Cross-Domain Solution Designer",
    areas: [
      {
        name: "Future & Business Blueprint",
        subDomains: [
          {
            name: "Enterprise Strategy Design",
            displayOrder: 1,
            specialities: [
              { name: "Growth strategy & market expansion design", displayOrder: 1 },
              { name: "Diversification strategy (customers, products, regions)", displayOrder: 2 },
              { name: "Resilience planning (supply, capacity, risk)", displayOrder: 3 },
            ],
          },
          {
            name: "Outcome Architecture",
            displayOrder: 2,
            specialities: [
              { name: "Value tree design (cost, cash, service, quality)", displayOrder: 1 },
              { name: "Business case & ROI modeling", displayOrder: 2 },
              { name: "OKR-to-KPI linkage architecture", displayOrder: 3 },
            ],
          },
          {
            name: "Transformation Roadmaps",
            displayOrder: 3,
            specialities: [
              { name: "Multi-year transformation roadmap design", displayOrder: 1 },
              { name: "Capability-based planning", displayOrder: 2 },
              { name: "Portfolio governance model design", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Product & Service Innovation",
        subDomains: [
          {
            name: "Portfolio Engineering",
            displayOrder: 1,
            specialities: [
              { name: "Complexity reduction programs", displayOrder: 1 },
              { name: "Product rationalization & standardization", displayOrder: 2 },
              { name: "Design-to-cost & value engineering linkage", displayOrder: 3 },
            ],
          },
          {
            name: "Digital Products",
            displayOrder: 2,
            specialities: [
              { name: "Connected product concepts (telemetry, diagnostics)", displayOrder: 1 },
              { name: "Digital twin solutions (product / process)", displayOrder: 2 },
              { name: "End-to-end traceability productization", displayOrder: 3 },
            ],
          },
          {
            name: "Experience Design",
            displayOrder: 3,
            specialities: [
              { name: "OEM collaboration platforms design", displayOrder: 1 },
              { name: "Supplier integration & portal design", displayOrder: 2 },
              { name: "Customer experience measurement & feedback loops", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Business & Operational Excellence",
        subDomains: [
          {
            name: "End-to-End Operations Design",
            displayOrder: 1,
            specialities: [
              { name: "Plan–Source–Make–Deliver integration design", displayOrder: 1 },
              { name: "E2E process architecture & controls", displayOrder: 2 },
              { name: "Cross-plant harmonization design", displayOrder: 3 },
            ],
          },
          {
            name: "Intelligent Operations",
            displayOrder: 2,
            specialities: [
              { name: "Predictive maintenance operating model", displayOrder: 1 },
              { name: "Quality analytics & inline quality design", displayOrder: 2 },
              { name: "Real-time exception management design", displayOrder: 3 },
            ],
          },
          {
            name: "Organizational Design",
            displayOrder: 3,
            specialities: [
              { name: "Cross-functional team design", displayOrder: 1 },
              { name: "Center of Excellence (CoE) operating model", displayOrder: 2 },
              { name: "Decision forums & governance architecture", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Digital & Technology Blueprint",
        subDomains: [
          {
            name: "Architecture Design",
            displayOrder: 1,
            specialities: [
              { name: "Enterprise architecture (business, data, app, tech)", displayOrder: 1 },
              { name: "Platform strategy (data, integration, MES)", displayOrder: 2 },
              { name: "Integration architecture (API, EDI, event-driven)", displayOrder: 3 },
            ],
          },
          {
            name: "Data & AI Foundations",
            displayOrder: 2,
            specialities: [
              { name: "Demand forecasting & planning AI", displayOrder: 1 },
              { name: "Quality AI & anomaly detection", displayOrder: 2 },
              { name: "Scheduling optimization & decision intelligence", displayOrder: 3 },
            ],
          },
          {
            name: "Cyber & Trust",
            displayOrder: 3,
            specialities: [
              { name: "OT security architecture", displayOrder: 1 },
              { name: "Resilience & disaster recovery design", displayOrder: 2 },
              { name: "Compliance readiness (audit, traceability, safety)", displayOrder: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    levelNumber: 4,
    label: "Strategic Co-Creator & Ecosystem Shaper",
    areas: [
      {
        name: "Future & Business Blueprint",
        subDomains: [
          {
            name: "Industry Visioning",
            displayOrder: 1,
            specialities: [
              { name: "5IR manufacturing vision & positioning", displayOrder: 1 },
              { name: "Sustainability-led growth strategy", displayOrder: 2 },
              { name: "AI-augmented enterprise operating philosophy", displayOrder: 3 },
            ],
          },
          {
            name: "Ecosystem Strategy",
            displayOrder: 2,
            specialities: [
              { name: "OEM–supplier–startup–academia ecosystem design", displayOrder: 1 },
              { name: "Strategic partnerships & alliance models", displayOrder: 2 },
              { name: "Innovation portfolio & venture pipeline strategy", displayOrder: 3 },
            ],
          },
          {
            name: "Outcome Governance",
            displayOrder: 3,
            specialities: [
              { name: "Enterprise value governance framework", displayOrder: 1 },
              { name: "Board-level KPI & outcomes stewardship", displayOrder: 2 },
              { name: "Transformation accountability operating rhythm", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Product & Service Innovation",
        subDomains: [
          {
            name: "Business Innovation",
            displayOrder: 1,
            specialities: [
              { name: "Servitization strategy (services-led revenue)", displayOrder: 1 },
              { name: "Outcome-based contracts & pricing models", displayOrder: 2 },
              { name: "New digital revenue streams design", displayOrder: 3 },
            ],
          },
          {
            name: "AI-Native Products",
            displayOrder: 2,
            specialities: [
              { name: "Autonomous quality offerings", displayOrder: 1 },
              { name: "Intelligent supply network offerings", displayOrder: 2 },
              { name: "Digital twin-based value propositions", displayOrder: 3 },
            ],
          },
          {
            name: "Human-Centric Experience",
            displayOrder: 3,
            specialities: [
              { name: "Operator-centric experience design", displayOrder: 1 },
              { name: "Safety-first experience architecture", displayOrder: 2 },
              { name: "Skill augmentation & human-AI collaboration design", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Business & Operational Excellence",
        subDomains: [
          {
            name: "Autonomous Operations",
            displayOrder: 1,
            specialities: [
              { name: "Self-healing process design", displayOrder: 1 },
              { name: "AI-assisted decisioning & control towers", displayOrder: 2 },
              { name: "Closed-loop execution models", displayOrder: 3 },
            ],
          },
          {
            name: "Workforce Transformation",
            displayOrder: 2,
            specialities: [
              { name: "Human–AI collaboration operating model", displayOrder: 1 },
              { name: "Role redesign & career architecture", displayOrder: 2 },
              { name: "Change leadership & adoption at scale", displayOrder: 3 },
            ],
          },
          {
            name: "Scalable Excellence",
            displayOrder: 3,
            specialities: [
              { name: "Multi-plant / global operating model design", displayOrder: 1 },
              { name: "Standardization with local flexibility", displayOrder: 2 },
              { name: "Enterprise-scale continuous improvement systems", displayOrder: 3 },
            ],
          },
        ],
      },
      {
        name: "Digital & Technology Blueprint",
        subDomains: [
          {
            name: "Technology Vision",
            displayOrder: 1,
            specialities: [
              { name: "AI-native enterprise technology vision", displayOrder: 1 },
              { name: "Composable architecture strategy", displayOrder: 2 },
              { name: "Digital thread / digital twin enterprise blueprint", displayOrder: 3 },
            ],
          },
          {
            name: "Governance at Scale",
            displayOrder: 2,
            specialities: [
              { name: "Responsible AI governance & ethics", displayOrder: 1 },
              { name: "Data trust & sovereignty models", displayOrder: 2 },
              { name: "Regulatory alignment & assurance frameworks", displayOrder: 3 },
            ],
          },
          {
            name: "Platform Ecosystems",
            displayOrder: 3,
            specialities: [
              { name: "Agentic AI platforms & orchestration layers", displayOrder: 1 },
              { name: "Digital manufacturing cloud ecosystems", displayOrder: 2 },
              { name: "Marketplace & partner platform strategy", displayOrder: 3 },
            ],
          },
        ],
      },
    ],
  },
];

// Mapping of level numbers to expertise level IDs (from database)
export const levelIdMap: Record<number, string> = {
  1: "7e198535-0774-4f72-a36a-11fa7cb0fc04", // Associate Consultant
  2: "2046b071-dc36-4265-b40d-4f8d62cd408f", // Senior Consultant
  3: "ed937c09-75fd-4a2d-968a-97ebaaf12ea3", // Principal Consultant
  4: "74101a4f-e219-4f2a-a47a-33574c6b35b8", // Partner
};

// Mapping of area names to proficiency area IDs per level (from database)
export const areaIdMap: Record<number, Record<string, string>> = {
  1: {
    "Future & Business Blueprint": "31692133-1856-46cb-8523-2f7724df3279",
    "Product & Service Innovation": "a04c1f73-be0c-46d9-8dc0-33487c20340c",
    "Business & Operational Excellence": "316baaa2-3f0a-4379-8e96-b079e7e1d038",
    "Digital & Technology Blueprint": "c7d82441-b54d-483f-bc7b-5bc25d4b0ce2",
  },
  2: {
    "Future & Business Blueprint": "4e036593-59e2-41cf-a075-71c7285f1d1c",
    "Product & Service Innovation": "0ce566f5-dd5b-4d7c-831a-3ddf6f6570e9",
    "Business & Operational Excellence": "b030e8ed-992b-42c1-be48-6b88f2b36fa7",
    "Digital & Technology Blueprint": "c5487de4-3e60-4763-ae94-ae4b977ea482",
  },
  3: {
    "Future & Business Blueprint": "bbf64d79-311e-4e0f-87ec-b2a23de2f606",
    "Product & Service Innovation": "e745ece8-6a3c-409e-8fd8-1821a50b75b1",
    "Business & Operational Excellence": "2742e916-334f-46cb-b53e-892e3aa1291d",
    "Digital & Technology Blueprint": "1ee529ff-68af-451b-b89d-c3ee9297e6f5",
  },
  4: {
    "Future & Business Blueprint": "4afcf45a-eba4-44cd-a55a-b20a8253ff23",
    "Product & Service Innovation": "cada2189-91ad-4e44-8ea5-a1c68011d0d7",
    "Business & Operational Excellence": "1873b141-a81f-4882-9b15-b1f15f92e108",
    "Digital & Technology Blueprint": "ca5db012-675e-4739-95fd-1711464b5e77",
  },
};
