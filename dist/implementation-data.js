// Planning assumptions for a single-cluster pilot, not invoices or committed funding.
export const SETUP_COSTS = [
  { label: "Multi-business launch preparation", low: 80000, high: 180000 },
  { label: "Business, accounting and agreement setup", low: 20000, high: 50000 },
  { label: "Initial factory visits and onboarding", low: 20000, high: 40000 },
  { label: "Material checks and expert-labelled sample photos", low: 15000, high: 35000 },
  { label: "Contingency", low: 25000, high: 50000 },
];
export const MONTHLY_COSTS = [
  { label: "Hosting, storage, backups and monitoring", low: 3000, high: 6000, technical: true },
  { label: "Document AI usage allowance", low: 1000, high: 3000, technical: true },
  { label: "Field coordinator", low: 25000, high: 40000 },
  { label: "Part-time technical maintenance", low: 20000, high: 35000, technical: true },
  { label: "Local travel and factory visits", low: 10000, high: 18000 },
  { label: "Accounting and administration", low: 5000, high: 10000 },
  { label: "Communication and support tools", low: 3000, high: 6000 },
];
const total = (rows) => rows.reduce((sum, row) => ({ low: sum.low + row.low, high: sum.high + row.high }), { low: 0, high: 0 });
export const IMPLEMENTATION_BUDGET = (() => {
  const setup = total(SETUP_COSTS), monthly = total(MONTHLY_COSTS);
  const technical = total(MONTHLY_COSTS.filter(row => row.technical));
  const months = 3, orderAllowance = 30, directCostPerOrder = 1500;
  const transactionAllowance = orderAllowance * directCostPerOrder;
  return { setup, monthly, technical, months, orderAllowance, directCostPerOrder, transactionAllowance,
    initial: { low: setup.low + months * monthly.low + transactionAllowance,
               high: setup.high + months * monthly.high + transactionAllowance },
    fundingTarget: { low: 600000, high: 800000 },
  };
})();
export const FUNDING_TARGETS = [
  { name: "College incubation centre", stage: "First conversations", description: "Approach our institution for mentoring, factory introductions and pilot-grant opportunities. Available support depends on the college; no amount is assumed.", url: null, source: null },
  { name: "IIMA Ventures · IIM Ahmedabad", stage: "Early-stage incubation", description: "Seek incubation, business-model support and access to suitable grant or seed programmes. General incubation does not require a registered company; some funding programmes do.", url: "https://iimaventures.com/incubation/", source: "Incubation and eligibility" },
  { name: "NSRCEL · IIM Bangalore", stage: "Student-founder support", description: "Explore Campus Founders if the team meets student-founder eligibility, for structured support and industry connections. This is a programme prospect, not a funding commitment.", url: "https://nsrcel.org/campus-founders/", source: "Campus Founders programme" },
  { name: "Factories, recyclers and cluster associations", stage: "Paid pilot partners", description: "Propose a 90-day pilot to a lead buyer, recycler or industrial association. Seek trial transactions, onboarding access or a negotiated pilot fee. Pilot payments are customer revenue, not equity investment.", url: null, source: null },
  { name: "Climate Angels", stage: "After transaction evidence", description: "Approach the climate-tech investment network once we can demonstrate completed transactions, repeat customers and collected commission. Our suggested readiness target is 10–20 completed transactions; this is not the investor’s published requirement.", url: "https://climateangels.in/for-investors/", source: "Climate-tech investment network" },
];
