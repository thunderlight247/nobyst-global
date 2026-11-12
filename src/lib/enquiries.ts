import { getEnv } from "./cloudflare";

export type EnquiryType = "contact" | "partnership" | "bulk_order";
export type EnquiryStatus = "new" | "contacted" | "closed";

export type Enquiry = {
  id: string;
  type: EnquiryType;
  name: string;
  email: string;
  phone?: string | null;
  topic?: string | null;
  message: string;
  productName?: string | null;
  quantity?: number | null;
  status: EnquiryStatus;
  createdAt: string;
};

export type EnquiryInput = {
  type: EnquiryType;
  name: string;
  email: string;
  phone?: string | null;
  topic?: string | null;
  message: string;
  productName?: string | null;
  quantity?: number | null;
};

type EnquiryRow = {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string | null;
  message: string;
  product_name: string | null;
  quantity: number | null;
  status: string;
  created_at: string;
};

function mapRow(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    type: (row.type as EnquiryType) || "contact",
    name: row.name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    productName: row.product_name,
    quantity: row.quantity,
    status: (row.status as EnquiryStatus) || "new",
    createdAt: row.created_at,
  };
}

export async function createEnquiry(input: EnquiryInput): Promise<Enquiry> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();

  // Try saving to D1 (if table exists)
  try {
    await DB.prepare(
      `INSERT INTO enquiries (id, type, name, email, phone, topic, message, product_name, quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
    )
      .bind(
        id,
        input.type,
        input.name.trim(),
        input.email.trim(),
        input.phone?.trim() || null,
        input.topic?.trim() || null,
        input.message.trim(),
        input.productName?.trim() || null,
        input.quantity || null
      )
      .run();
  } catch (err) {
    console.warn("Could not insert enquiry into D1 (table might need migration):", err);
  }

  return {
    id,
    type: input.type,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    topic: input.topic || null,
    message: input.message,
    productName: input.productName || null,
    quantity: input.quantity || null,
    status: "new",
    createdAt: new Date().toISOString(),
  };
}

export async function listEnquiries(): Promise<Enquiry[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      "SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 100"
    ).all<EnquiryRow>();
    return (results || []).map(mapRow);
  } catch (err) {
    console.warn("Could not fetch enquiries from D1:", err);
    return [];
  }
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<boolean> {
  try {
    const { DB } = await getEnv();
    await DB.prepare("UPDATE enquiries SET status = ? WHERE id = ?").bind(status, id).run();
    return true;
  } catch {
    return false;
  }
}

export async function deleteEnquiry(id: string): Promise<boolean> {
  try {
    const { DB } = await getEnv();
    await DB.prepare("DELETE FROM enquiries WHERE id = ?").bind(id).run();
    return true;
  } catch {
    return false;
  }
}
