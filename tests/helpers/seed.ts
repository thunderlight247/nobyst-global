import type { CloudflareEnv } from "@/lib/cloudflare";

export async function seedCategory(env: CloudflareEnv, name = "Audio") {
  await env.DB.prepare("INSERT INTO categories (id, slug, name) VALUES (?, ?, ?)")
    .bind(`cat-${name}`, name.toLowerCase(), name)
    .run();
}

export async function seedProduct(
  env: CloudflareEnv,
  p: { id: string; slug?: string; name?: string; price?: number | null; stock?: string }
) {
  await env.DB.prepare(
    `INSERT INTO products (id, slug, name, category, description, image, price_pesewas, stock_status, image_alt, fits)
     VALUES (?, ?, ?, 'Audio', 'A test product', '/images/x.jpg', ?, ?, 'alt', '["iphone-usbc"]')`
  )
    .bind(p.id, p.slug ?? p.id, p.name ?? `Product ${p.id}`, p.price === undefined ? 5000 : p.price, p.stock ?? "in_stock")
    .run();
}

export async function seedUser(env: CloudflareEnv, id: string, email: string, role = "customer", company: string | null = null) {
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role, company) VALUES (?, ?, ?, 'x', ?, ?)")
    .bind(id, email, `User ${id}`, role, company)
    .run();
}
