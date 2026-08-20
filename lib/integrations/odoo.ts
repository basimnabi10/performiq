import "server-only";

/**
 * Odoo HR integration point. Real implementation should call Odoo's
 * `hr.employee` model (search_read via XML-RPC/JSON-RPC) using
 * ODOO_BASE_URL/ODOO_API_KEY. Until real credentials exist, this stub
 * serves a small in-memory directory so the "Fetch from Odoo" invite path
 * is fully exercisable in dev/demo environments — swap the body of
 * `odooLookup`/`odooSuggestions` for a real HTTP call without touching any
 * caller.
 */
export interface OdooEmployee {
  empId: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  manager: string;
  location: string;
  phone: string;
  joinedDate: string;
  workType: string;
}

const DIRECTORY: OdooEmployee[] = [
  {
    empId: "E-2041",
    name: "Priya Raman",
    email: "priya.raman@acme.example",
    jobTitle: "Group PM",
    department: "Product Management",
    manager: "Elena Duarte",
    location: "Remote — EU",
    phone: "+1 555-0134",
    joinedDate: "2022-03-14",
    workType: "Full-time",
  },
  {
    empId: "E-2042",
    name: "Marco Bianchi",
    email: "marco.bianchi@acme.example",
    jobTitle: "UX Researcher",
    department: "Product Design",
    manager: "Léa Bernard",
    location: "Milan, IT",
    phone: "+39 02 5550188",
    joinedDate: "2023-06-01",
    workType: "Full-time",
  },
  {
    empId: "E-2043",
    name: "Sofia Nguyen",
    email: "sofia.nguyen@acme.example",
    jobTitle: "Product Designer",
    department: "Product Design",
    manager: "Léa Bernard",
    location: "Austin, US",
    phone: "+1 555-0177",
    joinedDate: "2024-01-22",
    workType: "Full-time",
  },
];

function isConfiguredForRealOdoo(): boolean {
  return Boolean(process.env.ODOO_BASE_URL && process.env.ODOO_API_KEY);
}

export async function odooLookup(term: string): Promise<OdooEmployee | null> {
  if (isConfiguredForRealOdoo()) {
    throw new Error(
      "ODOO_BASE_URL/ODOO_API_KEY are set, but the real Odoo integration isn't implemented yet.",
    );
  }
  const needle = term.trim().toLowerCase();
  if (!needle) return null;
  return (
    DIRECTORY.find(
      (e) => e.email.toLowerCase() === needle || e.empId.toLowerCase() === needle,
    ) ?? null
  );
}

export async function odooSuggestions(): Promise<OdooEmployee[]> {
  if (isConfiguredForRealOdoo()) {
    throw new Error(
      "ODOO_BASE_URL/ODOO_API_KEY are set, but the real Odoo integration isn't implemented yet.",
    );
  }
  return DIRECTORY;
}
