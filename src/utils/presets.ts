export interface DemoPreset {
  id: string;
  label: string;
  category: string;
  taskInstruction: string;
  rawInput: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'contract',
    label: 'Confidential Client Contract',
    category: 'Legal & M&A',
    taskInstruction:
      'Find legal loopholes, liability risks, and draft a firm counter-offer clause.',
    rawInput: `CONFIDENTIAL MASTER SERVICES AGREEMENT
Between Kestrel Freight Logistics Pvt. Ltd. ("Client") and Vertex Cloud Partners LLC ("Vendor").

1. Primary Contacts & Signatories:
Client Representative: Zainab Raza (zainab.raza@kestrelfreight.pk, +92 300 8451920)
Vendor Lead Counsel: Marcus Vance (m.vance@vertexcloud.io, +1 (415) 890-3341)

2. Financial & Penalty Terms:
Total retainer fee is PKR 4,850,000 (equivalent to USD 17,500) payable within 5 business days.
Late payment incurs a compounding penalty of USD 850 per day with zero grace period.

3. Liability & IP Ownership:
Vendor assumes unlimited consequential liability for customs delays, while Client grants Vendor a perpetual, irrevocable, royalty-free license to all proprietary route-optimization data and customer manifests. Either party may terminate only with 180 days written notice, except Vendor may suspend API access immediately without notice.`,
  },
  {
    id: 'code',
    label: 'Production Code + Live API Keys',
    category: 'DevSecOps',
    taskInstruction:
      'Identify the Node.js async race condition / unhandled rejection bug and return a hardened fix.',
    rawInput: `// Production Payment & Telemetry Worker
// Maintainer: Bilal Qureshi <bilal.qureshi@paybridge.pk> | On-Call: +92 321 7740112

const STRIPE_SECRET = "sk-live-99887766554433221100aabbccdd";
const GEMINI_BACKUP_KEY = "AIzaSyD98xK2mPqR4vT7wZ1nB6cF3hJ5kL0mN2p";
const GITHUB_DEPLOY_TOKEN = "ghp_9xK2mPqR4vT7wZ1nB6cF3hJ5kL0mN2pQ8rS4";

async function settleMerchantPayouts(batchOrders) {
  const results = [];
  batchOrders.forEach(async (order) => {
    const receipt = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${STRIPE_SECRET}\`,
      },
      body: JSON.stringify({ amount: order.amount, account: order.merchantId }),
    });
    const data = await receipt.json();
    results.push(data);
  });
  return results; // BUG: returns empty array before transfers settle!
}`,
  },
  {
    id: 'hr-medical',
    label: 'Private HR & Medical Note',
    category: 'People Ops & HIPAA',
    taskInstruction:
      'Summarize accommodation obligations and draft a compliant, empathetic HR response memo.',
    rawInput: `STRICTLY CONFIDENTIAL — HR & MEDICAL ACCOMMODATION RECORD
Employee Name: Dr. Nadia Farooq
Employee ID: EMP-40921 | National ID: 35202-8841209-4
Direct Contact: nadia.farooq@crescenthealth.org | +92 333 9124408
Department: Clinical Telemetry, Crescent BioHealth Systems Ltd.

Compensation & Leave Context:
Current Annual Salary: PKR 6,240,000 (USD 22,400)
Requested Medical Accommodation: 6 weeks reduced shift schedule following Post-Operative Cardiac Recovery and ongoing management of Type 2 Diabetes.

HR Action Needed:
Confirm protected medical leave eligibility without salary reduction, designate temporary shift coverage under Atlas Medical Group guidelines, and ensure zero clinical details are shared with project managers.`,
  },
];
