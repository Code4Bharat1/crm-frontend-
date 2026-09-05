let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(min + rnd() * (max - min + 1));
const inr = (n) => "\u20B9" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
const inrShort = (n) => {
  if (n >= 1e7) return `\u20B9${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `\u20B9${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `\u20B9${(n / 1e3).toFixed(0)}K`;
  return inr(n);
};
const day = 864e5;
const BASE = (/* @__PURE__ */ new Date("2026-08-13T10:00:00Z")).getTime();
const TODAY = new Date(BASE);
const dateOffset = (d) => new Date(BASE + d * day);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata"
});
const ROLES = [
  "Director",
  "Admin Manager",
  "Accounts Manager",
  "Accounts Executive",
  "Salesperson",
  "Engineer",
  "HR",
  "Purchase",
  "Project Manager",
  "Service",
  "Read-only"
];
const AREAS = [
  "Bhosari, Pune",
  "Chakan MIDC",
  "Waluj, Aurangabad",
  "Ranjangaon MIDC",
  "Vatva, Ahmedabad",
  "Peenya, Bengaluru",
  "Ambattur, Chennai",
  "Nashik MIDC",
  "Vapi, Gujarat",
  "Taloja, Navi Mumbai"
];
const LEAD_SOURCES = [
  "Reference",
  "IndiaMART",
  "Cold Call",
  "Website",
  "Exhibition",
  "WhatsApp",
  "Existing Customer",
  "Email Inquiry"
];
const LEAD_STAGES = [
  "New",
  "Contacted",
  "Potential",
  "Hot",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold"
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const BRANDS = [
  "Siemens",
  "Schneider Electric",
  "Allen-Bradley",
  "Delta",
  "Mitsubishi",
  "Omron",
  "Phoenix Contact",
  "Autonics",
  "CONTECH"
];
const PRODUCT_CATEGORIES = [
  "PLC & I/O",
  "HMI & SCADA",
  "VFD / Drives",
  "Sensors",
  "Isolators",
  "Switchgear",
  "Industrial Networking",
  "Panel Accessories",
  "Safety Systems",
  "Instrumentation"
];
const EMP_NAMES = [
  "Rajesh Deshpande",
  "Sunita Kulkarni",
  "Zaid Shaikh",
  "Amruta Joshi",
  "Nilesh Pawar",
  "Prasad Bhosale",
  "Kiran Jadhav",
  "Snehal Patil",
  "Vivek Ranade",
  "Imran Qureshi",
  "Rohit Shinde",
  "Pooja Nair",
  "Ganesh Mane",
  "Aarti Chavan",
  "Sandeep Gaikwad",
  "Mahesh Kadam",
  "Farhan Ansari",
  "Deepak Sawant",
  "Trupti More",
  "Akash Thorat"
];
const ROLE_PLAN = [
  "Director",
  "Director",
  "Admin Manager",
  "Accounts Manager",
  "Accounts Executive",
  "Accounts Executive",
  "Salesperson",
  "Salesperson",
  "Salesperson",
  "Salesperson",
  "Engineer",
  "Engineer",
  "Engineer",
  "Engineer",
  "Service",
  "Service",
  "Project Manager",
  "Purchase",
  "HR",
  "Read-only"
];
const employees = EMP_NAMES.map((name, i) => {
  const role = ROLE_PLAN[i];
  const isSales = role === "Salesperson";
  const target = isSales ? int(60, 120) * 1e5 : void 0;
  return {
    id: `EMP-${String(i + 1).padStart(3, "0")}`,
    name,
    code: `CT${String(i + 101)}`,
    role,
    department: role === "Salesperson" ? "Sales" : role === "Engineer" || role === "Service" ? "Technical" : role.includes("Accounts") ? "Finance" : role === "Director" ? "Management" : role,
    phone: `+91 9${int(70, 99)}${int(1e6, 9999999)}`,
    email: `${name.split(" ")[0].toLowerCase()}@contech-automation.in`,
    target,
    achieved: target ? Math.round(target * (0.45 + rnd() * 0.8)) : void 0,
    presentDays: int(18, 24),
    leaveDays: int(0, 3),
    otHours: int(0, 22)
  };
});
const salespeople = employees.filter((e) => e.role === "Salesperson");
const engineers = employees.filter((e) => e.role === "Engineer" || e.role === "Service");
const currentUser = employees[0];
const CUST_NAMES = [
  "Shakti Engineering Works",
  "Bharat Forge Components",
  "Deccan Sugar Mills Ltd",
  "Godavari Pharma Pvt Ltd",
  "Sai Precision Auto",
  "Kirloskar Pneumatics Unit-II",
  "Varroc Polymers",
  "Endurance Technologies",
  "Sudarshan Chemicals",
  "Rane Brake Lining",
  "Jayashree Textiles",
  "Nirmal Dairy Products",
  "Om Packaging Industries",
  "Supreme Cables Pvt Ltd",
  "Maha Cement Grinding Unit",
  "Krishna Water Treatment",
  "Vaibhav Steel Rolling Mills",
  "Anand Automotive Systems",
  "Sanjeevani Bio-Energy",
  "Prakash Foundry Works",
  "Vishwakarma Machine Tools",
  "Purandar Food Processing",
  "Rukmini Paper Mills",
  "Tejas Plastics Pvt Ltd",
  "Ashoka Buildcon Infra",
  "Sahyadri Agro Industries",
  "Neel Metal Products",
  "Kalyani Alloys",
  "Suyog Rubber Industries",
  "Gajanan Electricals & Panels"
];
const CONTACT_FIRST = ["Amit", "Sachin", "Pravin", "Ravi", "Sameer", "Nitin", "Yogesh", "Vandana", "Swati", "Manoj"];
const CONTACT_LAST = ["Kale", "Sharma", "Patil", "Reddy", "Iyer", "Singh", "Bhagat", "Naik", "Rane", "Dubey"];
const DESIGNATIONS = [
  "Maintenance Head",
  "Plant Manager",
  "Purchase Manager",
  "Electrical Engineer",
  "Project Head",
  "Director",
  "Instrumentation In-charge"
];
const customers = CUST_NAMES.map((name, i) => {
  const area = pick(AREAS);
  const totalSales = int(4, 180) * 1e5;
  const outstanding = rnd() > 0.35 ? int(0, 24) * 1e4 : 0;
  return {
    id: `CUST-${String(i + 1001)}`,
    name,
    gstin: `27${["AABCU", "AACCM", "AADCS", "AAECP"][i % 4]}${int(1e3, 9999)}${["A", "B", "C", "K"][i % 4]}1Z${i % 9}`,
    area,
    city: area.split(", ").slice(-1)[0],
    address: `Plot ${int(4, 220)}, ${area} Industrial Estate`,
    industry: pick([
      "Automotive",
      "Pharma",
      "Food & Beverage",
      "Textile",
      "Chemical",
      "Metal & Foundry",
      "Water Treatment",
      "Packaging"
    ]),
    potential: pick(["A - High", "B - Medium", "C - Low"]),
    stage: pick(["Prospect", "Active Customer", "Repeat Customer", "Key Account", "Dormant"]),
    salesperson: pick(salespeople).name,
    contacts: Array.from({ length: int(1, 3) }).map(() => {
      const cn = `${pick(CONTACT_FIRST)} ${pick(CONTACT_LAST)}`;
      return {
        name: cn,
        designation: pick(DESIGNATIONS),
        phone: `+91 9${int(70, 99)}${int(1e6, 9999999)}`,
        email: `${cn.split(" ")[0].toLowerCase()}@${name.split(" ")[0].toLowerCase()}.co.in`
      };
    }),
    outstanding,
    totalSales,
    paymentsReceived: totalSales - outstanding,
    creditDays: pick([15, 30, 45, 60])
  };
});
const customerById = (id) => customers.find((c) => c.id === id);
const PRODUCT_BASE = [
  "Compact PLC CPU Module",
  "Digital Input Module 16CH",
  "Analog Output Module 4CH",
  "Signal Isolator 4-20mA",
  "Loop Powered Isolator",
  "HMI Touch Panel 7in",
  "SCADA Runtime License",
  "AC Drive 5.5kW",
  "AC Drive 11kW",
  "Servo Drive 750W",
  "Proximity Sensor M18",
  "Photoelectric Sensor",
  "Temperature Transmitter",
  "Pressure Transmitter 0-10bar",
  "Flow Meter Electromagnetic",
  "Level Switch Capacitive",
  "Safety Relay Dual Channel",
  "Safety Light Curtain",
  "Ethernet Managed Switch 8P",
  "Profibus Repeater",
  "Modbus Gateway RTU/TCP",
  "MCB 32A Triple Pole",
  "MCCB 100A",
  "Contactor 25A",
  "Overload Relay 9-13A",
  "SMPS 24VDC 10A",
  "Panel Cooling Fan Unit",
  "Terminal Block Set",
  "Encoder Incremental 1024PPR",
  "Load Cell 500kg"
];
const products = Array.from({ length: 50 }).map((_, i) => {
  const base = PRODUCT_BASE[i % PRODUCT_BASE.length];
  const variant = i >= PRODUCT_BASE.length ? ` Rev-${["B", "C"][i % 2]}` : "";
  const stock = int(0, 90);
  return {
    id: `PRD-${String(i + 1).padStart(4, "0")}`,
    itemCode: `CT-${pick(["PLC", "ISO", "DRV", "SEN", "NET", "SWG", "INS"])}-${int(1e3, 9999)}`,
    name: base + variant,
    category: pick(PRODUCT_CATEGORIES),
    brand: pick(BRANDS),
    price: int(8, 1800) * 100,
    taxRate: pick([18, 18, 18, 12]),
    stock,
    minStock: 10,
    location: pick(["Bhosari Store", "Pune Main Warehouse", "Chakan Site Store", "Service Van 02"]),
    supplier: "",
    serialTracked: rnd() > 0.4,
    warrantyMonths: pick([12, 18, 24])
  };
});
const TOTAL_PRODUCT_MASTER_COUNT = 2158;
const suppliers = [
  "Siemens India Distribution",
  "Schneider Authorised Partner - Pune",
  "Delta Electronics India",
  "Autonics India Pvt Ltd",
  "Phoenix Contact India",
  "Neelkanth Panel Fabricators",
  "Sunrise Cables & Wires",
  "Precision Instrument Traders",
  "Vidyut Switchgear Supplies",
  "Omkar Automation Spares"
].map((name, i) => ({
  id: `SUP-${String(i + 201)}`,
  name,
  category: pick(PRODUCT_CATEGORIES),
  city: pick(["Pune", "Mumbai", "Ahmedabad", "Bengaluru", "Chennai"]),
  contact: `${pick(CONTACT_FIRST)} ${pick(CONTACT_LAST)}`,
  phone: `+91 9${int(70, 99)}${int(1e6, 9999999)}`,
  purchaseValue: int(6, 90) * 1e5,
  outstanding: int(0, 18) * 1e4,
  rating: Number((3.2 + rnd() * 1.8).toFixed(1))
}));
products.forEach((p) => {
  p.supplier = pick(suppliers).name;
});
const REQUIREMENTS = [
  "Retrofit of existing panel with new PLC and HMI, migration of legacy logic.",
  "Supply of 20 signal isolators for DCS marshalling cabinet.",
  "Complete SCADA implementation for utility monitoring, 3 plants.",
  "VFD replacement on 4 conveyor drives, energy monitoring required.",
  "Batch automation for reactor line with recipe management.",
  "Water treatment plant automation with remote monitoring on mobile.",
  "Annual spares order for sensors and safety relays.",
  "OEE dashboard integration with existing PLCs on shop floor."
];
const leads = Array.from({ length: 50 }).map((_, i) => {
  const cust = pick(customers);
  const created = dateOffset(-int(2, 150));
  const contact = pick(cust.contacts);
  return {
    id: `LD-${String(i + 5001)}`,
    title: pick([
      "Panel Retrofit Inquiry",
      "SCADA Upgrade",
      "Spares Requirement",
      "New Line Automation",
      "Isolator Requirement",
      "Drive Replacement",
      "Service AMC Inquiry"
    ]),
    subject: pick([
      "Requirement of PLC based control panel",
      "Quotation required for 20 nos isolators",
      "SCADA + HMI upgrade for utility section",
      "VFD supply and commissioning",
      "AMC for installed automation systems",
      "Instrumentation supply for new reactor"
    ]),
    customerId: cust.id,
    customerName: cust.name,
    contact: contact.name,
    phone: contact.phone,
    salesperson: cust.salesperson,
    stage: pick(LEAD_STAGES),
    priority: pick(PRIORITIES),
    source: pick(LEAD_SOURCES),
    area: cust.area,
    expectedValue: int(35, 900) * 1e3,
    productInterest: pick(products).name,
    requirement: pick(REQUIREMENTS),
    createdAt: created,
    lastActivity: dateOffset(-int(0, 25)),
    nextFollowUp: dateOffset(int(-8, 20)),
    expectedClosure: dateOffset(int(5, 90))
  };
});
const makeItems = (n) => Array.from({ length: n }).map(() => {
  const p = pick(products);
  return { itemCode: p.itemCode, name: p.name, qty: int(1, 25), rate: p.price, taxRate: p.taxRate };
});
const quotations = Array.from({ length: 40 }).map((_, i) => {
  const lead = pick(leads);
  const items = makeItems(int(2, 5));
  const value = items.reduce((s, it) => s + it.qty * it.rate * (1 + it.taxRate / 100), 0);
  return {
    id: `QT-${String(i + 2401)}`,
    customerId: lead.customerId,
    customerName: lead.customerName,
    leadId: lead.id,
    salesperson: lead.salesperson,
    date: dateOffset(-int(3, 120)),
    validTill: dateOffset(int(-15, 40)),
    value: Math.round(value),
    status: pick(["Draft", "Sent", "Viewed", "Negotiation", "Accepted", "Rejected", "Expired"]),
    items
  };
});
const proformas = Array.from({ length: 22 }).map((_, i) => {
  const q = pick(quotations);
  const adv = rnd() > 0.4 ? Math.round(q.value * pick([0.3, 0.5, 1])) : 0;
  const status = adv === 0 ? "Open" : adv >= q.value ? pick(["Paid", "Converted to Invoice"]) : "Partially Paid";
  return {
    id: `PI-${String(i + 901)}`,
    quotationId: q.id,
    customerId: q.customerId,
    customerName: q.customerName,
    date: dateOffset(-int(2, 90)),
    value: q.value,
    advanceReceived: adv,
    status,
    invoiceId: status === "Converted to Invoice" ? `INV-${int(1001, 1015)}` : void 0
  };
});
const salesOrders = Array.from({ length: 20 }).map((_, i) => {
  const q = quotations[i];
  return {
    id: `SO-${String(i + 1015)}`,
    quotationId: q.id,
    proformaId: rnd() > 0.5 ? pick(proformas).id : void 0,
    customerId: q.customerId,
    customerName: q.customerName,
    date: dateOffset(-int(2, 100)),
    value: q.value,
    fulfilment: pick(["Pending", "Partially Delivered", "Fully Delivered"]),
    status: pick(["Confirmed", "In Production", "Ready to Dispatch", "Closed", "On Hold"]),
    projectId: rnd() > 0.5 ? `PRJ-${int(301, 310)}` : void 0,
    salesperson: q.salesperson
  };
});
const deliveries = salesOrders.slice(0, 16).map((so, i) => ({
  id: `DN-${String(i + 701)}`,
  soId: so.id,
  customerId: so.customerId,
  customerName: so.customerName,
  date: dateOffset(-int(1, 80)),
  items: int(1, 6),
  serials: Array.from({ length: int(1, 3) }).map(() => `SN-${int(1e5, 999999)}`),
  transporter: pick(["VRL Logistics", "TCI Freight", "Gati KWE", "Company Vehicle", "Hand Delivery"]),
  lrNumber: `LR-${int(1e4, 99999)}`,
  status: pick(["Packed", "Dispatched", "In Transit", "Delivered", "Returned"]),
  receivedBy: pick(CONTACT_FIRST) + " " + pick(CONTACT_LAST)
}));
const invoices = Array.from({ length: 15 }).map((_, i) => {
  const so = salesOrders[i];
  const cust = customerById(so.customerId);
  const taxable = Math.round(so.value / 1.18);
  const interState = cust.city !== "Pune";
  const received = pick([0, taxable * 0.5, so.value, so.value]);
  const date = dateOffset(-int(3, 95));
  const dueDate = new Date(date.getTime() + cust.creditDays * day);
  return {
    id: `INV-${String(i + 1001)}`,
    soId: so.id,
    deliveryId: deliveries[i]?.id,
    proformaId: so.proformaId,
    customerId: so.customerId,
    customerName: so.customerName,
    gstin: cust.gstin,
    date,
    dueDate,
    taxable,
    cgst: interState ? 0 : Math.round(taxable * 0.09),
    sgst: interState ? 0 : Math.round(taxable * 0.09),
    igst: interState ? Math.round(taxable * 0.18) : 0,
    total: Math.round(so.value),
    received: Math.round(received),
    status: received >= so.value ? "Paid" : received > 0 ? "Partially Paid" : dueDate.getTime() < BASE ? "Overdue" : "Sent"
  };
});
const payments = Array.from({ length: 26 }).map((_, i) => {
  const inv = pick(invoices);
  return {
    id: `RCPT-${String(i + 3101)}`,
    customerId: inv.customerId,
    customerName: inv.customerName,
    invoiceId: rnd() > 0.25 ? inv.id : void 0,
    proformaId: rnd() > 0.75 ? pick(proformas).id : void 0,
    date: dateOffset(-int(0, 70)),
    amount: int(25, 900) * 1e3,
    mode: pick(["NEFT", "RTGS", "UPI", "Cheque", "Cash"]),
    reference: `UTR${int(1e8, 999999999)}`,
    bankAccount: pick(["HDFC ****4412 (Current)", "ICICI ****9087 (Current)"]),
    allocated: rnd() > 0.3
  };
});
const bankTxns = Array.from({ length: 14 }).map((_, i) => {
  const inv = pick(invoices);
  const conf = Number(rnd().toFixed(2));
  const nameMismatch = rnd() > 0.6;
  return {
    id: `BT-${String(i + 8801)}`,
    date: dateOffset(-int(0, 14)),
    senderName: nameMismatch ? pick(["SHAKTI ENGG", "BFC INDUSTRIES", "M/S DECCAN", "GODAVARI P LTD", "SAI PREC AUTO"]) : inv.customerName.toUpperCase(),
    amount: int(20, 800) * 1e3,
    reference: `NEFT/${int(1e5, 999999)}/PAYMENT`,
    bankAccount: pick(["HDFC ****4412", "ICICI ****9087"]),
    suggestedCustomer: inv.customerName,
    suggestedInvoice: inv.id,
    confidence: conf,
    status: conf > 0.8 ? "Suggested" : conf > 0.55 ? "Needs Review" : nameMismatch ? "Unmatched" : "Suggested"
  };
});
const visits = Array.from({ length: 34 }).map((_, i) => {
  const cust = pick(customers);
  return {
    id: `VS-${String(i + 4101)}`,
    customerId: cust.id,
    customerName: cust.name,
    employee: pick([...salespeople, ...engineers]).name,
    date: dateOffset(-int(0, 45)),
    purpose: pick([
      "Requirement discussion",
      "Quotation submission",
      "Site survey",
      "Commissioning support",
      "Payment follow-up",
      "Service breakdown attend",
      "Relationship visit"
    ]),
    location: cust.address,
    gpsVerified: rnd() > 0.2,
    checkIn: `${int(9, 13)}:${pick(["05", "15", "30", "45"])}`,
    checkOut: `${int(14, 18)}:${pick(["10", "20", "40", "55"])}`,
    outcome: pick([
      "Customer asked for revised offer",
      "Technical scope frozen",
      "PO expected next week",
      "Competitor offer under comparison",
      "Payment released, UTR to be shared",
      "Additional site visit required"
    ]),
    nextAction: pick(["Send revised quotation", "Share technical datasheet", "Follow up for PO", "Schedule commissioning"]),
    followUpDate: dateOffset(int(-5, 25)),
    leadId: rnd() > 0.4 ? pick(leads).id : void 0,
    projectId: rnd() > 0.7 ? `PRJ-${int(301, 310)}` : void 0
  };
});
const communications = Array.from({ length: 60 }).map((_, i) => {
  const cust = pick(customers);
  const channel = pick(["Email", "WhatsApp", "Call", "Voice Note", "Note"]);
  return {
    id: `CM-${String(i + 6001)}`,
    channel,
    direction: pick(["Incoming", "Outgoing"]),
    customerId: cust.id,
    customerName: cust.name,
    contact: pick(cust.contacts).name,
    employee: pick([...salespeople, ...engineers]).name,
    date: dateOffset(-int(0, 40)),
    subject: pick([
      "Re: Quotation QT-2412 revision",
      "Requirement of 20 controllers",
      "Payment status of INV-1004",
      "Site readiness confirmation",
      "Drawing approval pending",
      "Breakdown at Line-3, urgent support",
      "AMC renewal discussion"
    ]),
    preview: pick([
      "Customer needs 20 controllers by next month and wants quotation.",
      "Kindly share the GST invoice copy, payment processed on 11th.",
      "Please depute engineer tomorrow morning, drive tripping repeatedly.",
      "Revised price accepted, PO will be released after director approval.",
      "Attaching the panel GA drawing for your approval."
    ]),
    linkedTo: pick(["LD-5003", "QT-2412", "SO-1018", "INV-1004", "PRJ-303", void 0]),
    hasAttachment: rnd() > 0.6
  };
});
const followUps = Array.from({ length: 38 }).map((_, i) => {
  const cust = pick(customers);
  const due = dateOffset(int(-14, 21));
  return {
    id: `FU-${String(i + 7001)}`,
    customerId: cust.id,
    customerName: cust.name,
    owner: pick([...salespeople, ...engineers]).name,
    dueDate: due,
    type: pick([
      "Quotation follow-up",
      "Payment reminder",
      "PI advance reminder",
      "Revisit customer",
      "Service follow-up",
      "8-day payment follow-up",
      "Invoice due reminder"
    ]),
    source: pick(["Lead", "Quotation", "Proforma", "Invoice", "Visit", "WhatsApp", "Service"]),
    note: pick([
      "Confirm PO release date with purchase team",
      "Cheque collection scheduled, confirm availability",
      "Send revised offer with 3% discount",
      "Check commissioning readiness at site",
      "Remind about pending 50% advance against PI"
    ]),
    status: due.getTime() < BASE - 3 * day ? pick(["Pending", "Completed"]) : "Pending",
    priority: pick(PRIORITIES)
  };
});
const PROJECT_NAMES = [
  "Utility SCADA Implementation",
  "Reactor Batch Automation",
  "ETP Automation & Remote Monitoring",
  "Conveyor Line VFD Retrofit",
  "Boiler Control Panel Upgrade",
  "Paint Shop PLC Migration",
  "Energy Monitoring System",
  "Packaging Line OEE Dashboard",
  "Cooling Tower Automation",
  "Weighbridge Integration Project"
];
const projects = PROJECT_NAMES.map((name, i) => {
  const cust = pick(customers);
  const revenue = int(8, 95) * 1e5;
  const costHeads = [
    { head: "Material / Products", amount: Math.round(revenue * (0.3 + rnd() * 0.2)) },
    { head: "Supplier Services", amount: Math.round(revenue * (0.05 + rnd() * 0.12)) },
    { head: "Employee Effort", amount: Math.round(revenue * (0.06 + rnd() * 0.14)) },
    { head: "Visits & Travel", amount: Math.round(revenue * (0.01 + rnd() * 0.05)) },
    { head: "Other Expenses", amount: Math.round(revenue * (0.01 + rnd() * 0.04)) }
  ];
  return {
    id: `PRJ-${String(i + 301)}`,
    name,
    customerId: cust.id,
    customerName: cust.name,
    manager: employees.find((e) => e.role === "Project Manager").name,
    team: Array.from({ length: int(2, 4) }).map(() => pick(engineers).name),
    suppliers: Array.from({ length: int(2, 5) }).map(() => pick(suppliers).name),
    start: dateOffset(-int(30, 220)),
    end: dateOffset(int(-20, 120)),
    status: pick(["Planning", "In Progress", "Commissioning", "Completed", "On Hold"]),
    progress: int(10, 100),
    revenue,
    estimatedCost: Math.round(revenue * (0.6 + rnd() * 0.2)),
    costs: costHeads
  };
});
const projectActualCost = (p) => p.costs.reduce((s, c) => s + c.amount, 0);
const projectProfit = (p) => p.revenue - projectActualCost(p);
const projectMargin = (p) => projectProfit(p) / p.revenue * 100;
const serials = Array.from({ length: 45 }).map((_, i) => {
  const p = pick(products.filter((x) => x.serialTracked));
  const sold = rnd() > 0.35;
  const so = pick(salesOrders);
  const start = dateOffset(-int(30, 500));
  return {
    id: `SN-${int(1e5, 999999)}-${i}`,
    productId: p.id,
    productName: p.name,
    itemCode: p.itemCode,
    supplier: p.supplier,
    receivedOn: dateOffset(-int(60, 600)),
    location: p.location,
    customerId: sold ? so.customerId : void 0,
    customerName: sold ? so.customerName : void 0,
    soId: sold ? so.id : void 0,
    deliveryId: sold ? pick(deliveries).id : void 0,
    invoiceId: sold ? pick(invoices).id : void 0,
    warrantyStart: sold ? start : void 0,
    warrantyEnd: sold ? new Date(start.getTime() + p.warrantyMonths * 30 * day) : void 0,
    status: sold ? pick(["Delivered", "Installed", "Under Repair", "Replaced"]) : "In Stock",
    serviceCount: sold ? int(0, 4) : 0
  };
});
const serviceRequests = Array.from({ length: 18 }).map((_, i) => {
  const sn = pick(serials.filter((s) => s.customerId));
  const warranty = sn.warrantyEnd ? sn.warrantyEnd.getTime() > BASE : false;
  const charges = warranty ? 0 : int(3, 45) * 1e3;
  return {
    id: `SR-${String(i + 5501)}`,
    customerId: sn.customerId,
    customerName: sn.customerName,
    productName: sn.productName,
    serial: sn.id,
    issue: pick([
      "Drive tripping on overload during start",
      "HMI screen not responding after power reboot",
      "Analog card showing erratic 4-20mA values",
      "Communication loss between PLC and SCADA",
      "Isolator output drift beyond tolerance",
      "Safety relay latching intermittently"
    ]),
    underWarranty: warranty,
    engineer: pick(engineers).name,
    raisedOn: dateOffset(-int(1, 60)),
    scheduledOn: dateOffset(int(-10, 12)),
    status: pick(["Open", "Assigned", "Scheduled", "In Progress", "Completed", "Closed"]),
    workDone: pick([
      "Replaced faulty module, parameters reloaded, trial taken",
      "Firmware updated and communication settings corrected",
      "Cleaned terminations, retested loop calibration",
      "Under observation, diagnostic logs collected"
    ]),
    partsCost: warranty ? int(0, 12) * 1e3 : int(1, 22) * 1e3,
    serviceCharges: charges,
    travelCost: int(500, 4500),
    engineerHours: int(2, 16)
  };
});
const expenses = Array.from({ length: 24 }).map((_, i) => ({
  id: `EXP-${String(i + 9101)}`,
  employee: pick(employees).name,
  date: dateOffset(-int(0, 40)),
  category: pick(["Travel", "Fuel", "Site Lodging", "Courier", "Tools", "Food", "Local Conveyance"]),
  amount: int(300, 18e3),
  projectId: rnd() > 0.5 ? pick(projects).id : void 0,
  status: pick(["Submitted", "Approved", "Rejected", "Reimbursed"]),
  note: pick(["Site visit Chakan", "Customer meeting Aurangabad", "Spare pickup from supplier", "Commissioning stay"])
}));
const purchaseOrders = Array.from({ length: 18 }).map((_, i) => ({
  id: `PO-${String(i + 4401)}`,
  supplier: pick(suppliers).name,
  date: dateOffset(-int(2, 90)),
  value: int(20, 700) * 1e3,
  status: pick(["Draft", "Sent", "Acknowledged", "Partially Received", "Received", "Closed"]),
  projectId: rnd() > 0.5 ? pick(projects).id : void 0,
  linkedSO: rnd() > 0.4 ? pick(salesOrders).id : void 0,
  items: int(1, 12),
  expected: dateOffset(int(-10, 30))
}));
const auditLog = Array.from({ length: 26 }).map((_, i) => {
  const e = pick(employees);
  return {
    id: `AUD-${String(i + 1)}`,
    user: e.name,
    action: pick([
      "updated Invoice",
      "created Quotation",
      "approved Payment allocation",
      "exported GST data for",
      "reconciled Bank transaction",
      "changed role permission for",
      "deleted draft Quotation",
      "configured WhatsApp integration",
      "imported migration batch"
    ]),
    entity: pick(["INV-1024", "QT-2412", "RCPT-3104", "Aug 2026", "BT-8803", "Salesperson", "PI-905", "Batch #7"]),
    at: dateOffset(-int(0, 12)),
    ip: `10.12.${int(1, 40)}.${int(2, 240)}`,
    severity: pick(["Info", "Info", "Info", "Warning", "Critical"])
  };
});
const notifications = [
  {
    id: "N1",
    type: "Payment overdue",
    title: "INV-1004 overdue by 12 days",
    detail: "Deccan Sugar Mills Ltd \u2014 \u20B94,85,000 pending. Accounts follow-up assigned to Zaid Shaikh.",
    at: dateOffset(-0.2),
    severity: "danger",
    read: false
  },
  {
    id: "N2",
    type: "Stock alert",
    title: "Signal Isolator 4-20mA below threshold",
    detail: "Available 6 units, minimum 10. Reserved 4 for SO-1018.",
    at: dateOffset(-0.4),
    severity: "warning",
    read: false
  },
  {
    id: "N3",
    type: "Appointment",
    title: "Site visit at Chakan MIDC in 2 hours",
    detail: "Nilesh Pawar \u2014 Sai Precision Auto, requirement discussion for panel retrofit.",
    at: dateOffset(-0.5),
    severity: "info",
    read: false
  },
  {
    id: "N4",
    type: "Follow-up overdue",
    title: "6 follow-ups overdue across sales team",
    detail: "Highest value: QT-2418 (\u20B97.4 L) \u2014 Bharat Forge Components.",
    at: dateOffset(-1),
    severity: "danger",
    read: false
  },
  {
    id: "N5",
    type: "Warranty expiry",
    title: "3 serial numbers expiring within 30 days",
    detail: "AMC renewal opportunity \u2014 Godavari Pharma Pvt Ltd, Varroc Polymers.",
    at: dateOffset(-1.5),
    severity: "warning",
    read: true
  },
  {
    id: "N6",
    type: "Approval pending",
    title: "Expense approvals pending with Admin Manager",
    detail: "5 expense claims totalling \u20B938,400 awaiting approval.",
    at: dateOffset(-2),
    severity: "info",
    read: true
  },
  {
    id: "N7",
    type: "Integration",
    title: "PLC gateway GW-02 reconnected after reboot",
    detail: "3 reconnection attempts logged. Diagnostics under investigation.",
    at: dateOffset(-2.4),
    severity: "warning",
    read: true
  },
  {
    id: "N8",
    type: "Payment received",
    title: "\u20B92,50,000 credited \u2014 HDFC ****4412",
    detail: "Suggested match: INV-1009, Endurance Technologies (91% confidence). Review required.",
    at: dateOffset(-3),
    severity: "success",
    read: true
  }
];
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const kpis = {
  totalLeads: leads.length,
  newLeads: leads.filter((l) => l.stage === "New").length,
  hotLeads: leads.filter((l) => l.stage === "Hot").length,
  potentialLeads: leads.filter((l) => l.stage === "Potential").length,
  lostLeads: leads.filter((l) => l.stage === "Lost").length,
  wonLeads: leads.filter((l) => l.stage === "Won").length,
  openQuotations: quotations.filter((q) => ["Sent", "Viewed", "Negotiation", "Draft"].includes(q.status)).length,
  quotationValue: sum(quotations.map((q) => q.value)),
  openQuotationValue: sum(
    quotations.filter((q) => ["Sent", "Viewed", "Negotiation"].includes(q.status)).map((q) => q.value)
  ),
  confirmedOrders: salesOrders.filter((s) => s.status !== "On Hold").length,
  orderValue: sum(salesOrders.map((s) => s.value)),
  pendingDeliveries: salesOrders.filter((s) => s.fulfilment !== "Fully Delivered").length,
  outstanding: sum(invoices.map((i) => i.total - i.received)),
  paymentsReceived: sum(payments.map((p) => p.amount)),
  overdue: sum(invoices.filter((i) => i.status === "Overdue").map((i) => i.total - i.received)),
  activeProjects: projects.filter((p) => p.status !== "Completed").length,
  projectProfit: sum(projects.map(projectProfit)),
  projectRevenue: sum(projects.map((p) => p.revenue)),
  pendingFollowUps: followUps.filter((f) => f.status === "Pending").length,
  overdueFollowUps: followUps.filter((f) => f.status === "Pending" && f.dueDate.getTime() < BASE).length,
  openService: serviceRequests.filter((s) => !["Completed", "Closed"].includes(s.status)).length,
  serviceRevenue: sum(serviceRequests.map((s) => s.serviceCharges)),
  stockAlerts: products.filter((p) => p.stock < p.minStock).length,
  visitsThisMonth: visits.filter((v) => v.date.getTime() > BASE - 30 * day).length
};
const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const monthlySales = MONTHS.map((m, i) => ({
  month: m,
  sales: int(18, 74) * 1e5,
  quotations: int(40, 130) * 1e5,
  collections: int(15, 65) * 1e5,
  orderCount: int(3, 14) + i
}));
const leadsBySource = LEAD_SOURCES.map((s) => ({
  name: s,
  value: leads.filter((l) => l.source === s).length
}));
const leadsByArea = AREAS.slice(0, 6).map((a) => ({
  name: a.split(",")[0],
  leads: leads.filter((l) => l.area === a).length || int(2, 8)
}));
const salesByPerson = salespeople.map((s) => ({
  name: s.name.split(" ")[0],
  target: (s.target ?? 0) / 1e5,
  achieved: (s.achieved ?? 0) / 1e5,
  visits: visits.filter((v) => v.employee === s.name).length,
  leads: leads.filter((l) => l.salesperson === s.name).length
}));
const productSales = products.slice(0, 8).map((p) => ({
  name: p.name.length > 22 ? p.name.slice(0, 20) + "\u2026" : p.name,
  quoted: int(3, 22),
  sold: int(1, 14),
  value: int(2, 30) * 1e5
}));
const customerSales = customers.slice().sort((a, b) => b.totalSales - a.totalSales).slice(0, 8).map((c) => ({ name: c.name.split(" ").slice(0, 2).join(" "), value: c.totalSales / 1e5 }));
const customerTimeline = (customerId) => {
  const items = [];
  leads.filter((l) => l.customerId === customerId).forEach(
    (l) => items.push({
      at: l.createdAt,
      kind: "Lead",
      title: `Lead created \u2014 ${l.title}`,
      detail: l.subject,
      by: l.salesperson,
      ref: l.id
    })
  );
  communications.filter((c) => c.customerId === customerId).forEach(
    (c) => items.push({
      at: c.date,
      kind: c.channel,
      title: `${c.direction} ${c.channel} \u2014 ${c.subject}`,
      detail: c.preview,
      by: c.employee,
      ref: c.id
    })
  );
  visits.filter((v) => v.customerId === customerId).forEach(
    (v) => items.push({
      at: v.date,
      kind: "Visit",
      title: `Visit \u2014 ${v.purpose}`,
      detail: `${v.outcome} \xB7 GPS ${v.gpsVerified ? "verified" : "not verified"}`,
      by: v.employee,
      ref: v.id
    })
  );
  quotations.filter((q) => q.customerId === customerId).forEach(
    (q) => items.push({
      at: q.date,
      kind: "Quotation",
      title: `Quotation ${q.id} \u2014 ${inrShort(q.value)}`,
      detail: `Status: ${q.status}`,
      by: q.salesperson,
      ref: q.id
    })
  );
  proformas.filter((p) => p.customerId === customerId).forEach(
    (p) => items.push({
      at: p.date,
      kind: "Proforma",
      title: `Proforma ${p.id} \u2014 ${inrShort(p.value)}`,
      detail: `Advance received ${inr(p.advanceReceived)} \xB7 ${p.status}`,
      by: "Accounts",
      ref: p.id
    })
  );
  salesOrders.filter((s) => s.customerId === customerId).forEach(
    (s) => items.push({
      at: s.date,
      kind: "Sales Order",
      title: `Sales Order ${s.id} \u2014 ${inrShort(s.value)}`,
      detail: `${s.status} \xB7 ${s.fulfilment}`,
      by: s.salesperson,
      ref: s.id
    })
  );
  deliveries.filter((d) => d.customerId === customerId).forEach(
    (d) => items.push({
      at: d.date,
      kind: "Delivery",
      title: `Delivery Note ${d.id}`,
      detail: `${d.status} \xB7 ${d.transporter} \xB7 ${d.lrNumber}`,
      by: "Stores",
      ref: d.id
    })
  );
  invoices.filter((i) => i.customerId === customerId).forEach(
    (i) => items.push({
      at: i.date,
      kind: "Invoice",
      title: `Invoice ${i.id} \u2014 ${inrShort(i.total)}`,
      detail: `${i.status} \xB7 due ${fmtDate(i.dueDate)}`,
      by: "Accounts",
      ref: i.id
    })
  );
  payments.filter((p) => p.customerId === customerId).forEach(
    (p) => items.push({
      at: p.date,
      kind: "Payment",
      title: `Payment received ${inr(p.amount)}`,
      detail: `${p.mode} \xB7 ${p.reference}${p.invoiceId ? ` \xB7 against ${p.invoiceId}` : ""}`,
      by: "Accounts",
      ref: p.id
    })
  );
  projects.filter((p) => p.customerId === customerId).forEach(
    (p) => items.push({
      at: p.start,
      kind: "Project",
      title: `Project started \u2014 ${p.name}`,
      detail: `${p.status} \xB7 ${p.progress}% complete`,
      by: p.manager,
      ref: p.id
    })
  );
  serviceRequests.filter((s) => s.customerId === customerId).forEach(
    (s) => items.push({
      at: s.raisedOn,
      kind: "Service",
      title: `Service request ${s.id}`,
      detail: `${s.issue} \xB7 ${s.underWarranty ? "Under warranty" : "Chargeable"}`,
      by: s.engineer,
      ref: s.id
    })
  );
  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
};
const globalSearch = (q) => {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const hits = [];
  const push = (h) => hits.length < 24 && hits.push(h);
  customers.filter((c) => c.name.toLowerCase().includes(t) || c.id.toLowerCase().includes(t)).forEach((c) => push({ label: c.name, sub: `${c.id} \xB7 ${c.area}`, kind: "Customer", to: `/customers/${c.id}` }));
  leads.filter((l) => l.id.toLowerCase().includes(t) || l.subject.toLowerCase().includes(t)).forEach((l) => push({ label: `${l.id} \u2014 ${l.title}`, sub: l.customerName, kind: "Lead", to: "/leads" }));
  quotations.filter((x) => x.id.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: `${x.customerName} \xB7 ${inrShort(x.value)}`, kind: "Quotation", to: "/quotations" }));
  proformas.filter((x) => x.id.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: x.customerName, kind: "Proforma", to: "/proformas" }));
  salesOrders.filter((x) => x.id.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: `${x.customerName} \xB7 ${x.status}`, kind: "Sales Order", to: `/orders/${x.id}` }));
  deliveries.filter((x) => x.id.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: x.customerName, kind: "Delivery", to: "/deliveries" }));
  invoices.filter((x) => x.id.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: `${x.customerName} \xB7 ${x.status}`, kind: "Invoice", to: "/invoices" }));
  payments.filter((x) => x.id.toLowerCase().includes(t) || x.reference.toLowerCase().includes(t)).forEach((x) => push({ label: x.id, sub: `${x.customerName} \xB7 ${inr(x.amount)}`, kind: "Payment", to: "/payments" }));
  products.filter((p) => p.name.toLowerCase().includes(t) || p.itemCode.toLowerCase().includes(t)).forEach((p) => push({ label: p.name, sub: `${p.itemCode} \xB7 ${p.brand}`, kind: "Product", to: "/products" }));
  serials.filter((s) => s.id.toLowerCase().includes(t)).forEach((s) => push({ label: s.id, sub: s.productName, kind: "Serial", to: "/serial-numbers" }));
  projects.filter((p) => p.name.toLowerCase().includes(t) || p.id.toLowerCase().includes(t)).forEach((p) => push({ label: p.name, sub: `${p.id} \xB7 ${p.customerName}`, kind: "Project", to: `/projects/${p.id}` }));
  serviceRequests.filter((s) => s.id.toLowerCase().includes(t)).forEach((s) => push({ label: s.id, sub: `${s.customerName} \xB7 ${s.status}`, kind: "Service", to: "/service" }));
  return hits;
};
const orderChain = (soId) => {
  const so = salesOrders.find((s) => s.id === soId);
  if (!so) return null;
  const q = quotations.find((x) => x.id === so.quotationId);
  return {
    so,
    lead: q ? leads.find((l) => l.id === q.leadId) : void 0,
    quotation: q,
    proforma: proformas.find((p) => p.id === so.proformaId),
    delivery: deliveries.find((d) => d.soId === so.id),
    invoice: invoices.find((i) => i.soId === so.id),
    payments: payments.filter((p) => p.invoiceId && p.invoiceId === invoices.find((i) => i.soId === so.id)?.id),
    project: projects.find((p) => p.id === so.projectId)
  };
};
const integrations = [
  {
    key: "whatsapp",
    name: "WhatsApp Business API",
    category: "Communication",
    status: "Configuration required",
    detail: "Business number verification and template approval pending. Sandbox credentials not provided."
  },
  {
    key: "email",
    name: "Email (Gmail / IMAP-SMTP)",
    category: "Communication",
    status: "Not connected",
    detail: "Supports Google Workspace OAuth and generic IMAP/SMTP. Awaiting provider credentials."
  },
  {
    key: "ai",
    name: "AI Processing Engine",
    category: "Automation",
    status: "Not connected",
    detail: "Used for message \u2192 structured lead extraction. Requires model provider configuration."
  },
  {
    key: "banking",
    name: "Banking Statement / API Feed",
    category: "Finance",
    status: "Not connected",
    detail: "HDFC & ICICI corporate API onboarding pending. Statement upload fallback available."
  },
  {
    key: "ess",
    name: "ESS Attendance System",
    category: "HR",
    status: "Configuration required",
    detail: "Vendor API endpoint reachable; API key and employee-code mapping required.",
    lastSync: "Not synced yet"
  },
  {
    key: "tally",
    name: "Tally / Historical Data Migration",
    category: "Data",
    status: "Configuration required",
    detail: "Direct Tally connectivity not assumed. Excel/CSV mapping workflow available."
  }
];
const migrationBatches = [
  {
    id: "MIG-007",
    source: "Product Master (Excel)",
    rows: 2158,
    valid: 2103,
    invalid: 31,
    duplicates: 24,
    imported: 2103,
    status: "Completed",
    at: "11 Aug 2026, 18:12"
  },
  {
    id: "MIG-008",
    source: "Tally Ledger Masters (till 2022)",
    rows: 1476,
    valid: 1402,
    invalid: 52,
    duplicates: 22,
    imported: 1402,
    status: "Completed",
    at: "12 Aug 2026, 11:04"
  },
  {
    id: "MIG-009",
    source: "Sales Register 2023-2026 (CSV)",
    rows: 3891,
    valid: 3612,
    invalid: 201,
    duplicates: 78,
    imported: 0,
    status: "Awaiting review",
    at: "13 Aug 2026, 09:55"
  }
];
export {
  AREAS,
  BRANDS,
  LEAD_SOURCES,
  LEAD_STAGES,
  MONTHS,
  PRIORITIES,
  PRODUCT_CATEGORIES,
  ROLES,
  TODAY,
  TOTAL_PRODUCT_MASTER_COUNT,
  auditLog,
  bankTxns,
  communications,
  currentUser,
  customerById,
  customerSales,
  customerTimeline,
  customers,
  deliveries,
  employees,
  engineers,
  expenses,
  fmtDate,
  fmtDateTime,
  followUps,
  globalSearch,
  inr,
  inrShort,
  integrations,
  invoices,
  kpis,
  leads,
  leadsByArea,
  leadsBySource,
  migrationBatches,
  monthlySales,
  notifications,
  orderChain,
  payments,
  productSales,
  products,
  proformas,
  projectActualCost,
  projectMargin,
  projectProfit,
  projects,
  purchaseOrders,
  quotations,
  salesByPerson,
  salesOrders,
  salespeople,
  serials,
  serviceRequests,
  suppliers,
  visits
};
