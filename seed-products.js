import pkg from "pg";
const { Client } = pkg;

const connectionString =
  "postgresql://postgres:Novmar@2023@db.ijnpmdjxyabudclzudnn.supabase.co:5432/postgres";

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to seed database...");

  try {
    await client.query("BEGIN");

    // 1. Clear existing data
    console.log("Clearing existing products, categories, site_settings...");
    await client.query("DELETE FROM public.products");
    await client.query("DELETE FROM public.categories");
    await client.query("DELETE FROM public.site_settings");

    // 2. Insert Categories
    console.log("Inserting categories...");
    const catResult = await client.query(`
      INSERT INTO public.categories (name, slug, description, is_visible)
      VALUES 
        ('Tailored Essentials', 'tailored-essentials', 'Structured jackets, linen trousers, and modern uniform silhouettes.', true),
        ('Studio Knits', 'studio-knits', 'Tactile sweaters and wrap cardigans hand-knitted from alpaca and merino wool.', true),
        ('Architectural Pieces', 'architectural-pieces', 'Dresses and skirts focusing on sculptural folding, geometry, and fluid movement.', true)
      RETURNING id, name, slug
    `);

    const categories = catResult.rows;
    const tailoredId = categories.find((c) => c.slug === "tailored-essentials").id;
    const knitsId = categories.find((c) => c.slug === "studio-knits").id;
    const archId = categories.find((c) => c.slug === "architectural-pieces").id;

    // 3. Insert Products
    console.log("Inserting products...");
    await client.query(
      `
      INSERT INTO public.products (category_id, name, slug, description, price_cents, currency, quantity, sizes, images, is_active)
      VALUES
        (
          $1, 
          'Orion Tailored Blazer', 
          'orion-tailored-blazer', 
          'Structured double-breasted blazer constructed from mid-weight organic hemp and wool. Features raw-edge finishes, horn buttons, and internal linen utility pockets.', 
          850000, 
          'INR', 
          10, 
          ARRAY['S', 'M', 'L', 'XL'], 
          ARRAY['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800'], 
          true
        ),
        (
          $1, 
          'Linen Crop Trouser', 
          'linen-crop-trouser', 
          'Relaxed cropped trouser cut from textured Belgian linen. Drop-crotch silhouette with an elasticated drawstring waistband and deep side seam pockets.', 
          480000, 
          'INR', 
          15, 
          ARRAY['S', 'M', 'L'], 
          ARRAY['https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=800'], 
          true
        ),
        (
          $2, 
          'Ribbed Mockneck Knit', 
          'ribbed-mockneck-knit', 
          'Rib-knit mockneck pullover crafted from pure extrafine merino wool. Features exaggerated sleeve cuffs, dropped shoulders, and split side hems for structural movement.', 
          620000, 
          'INR', 
          8, 
          ARRAY['S', 'M', 'L', 'XL'], 
          ARRAY['https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?q=80&w=800'], 
          true
        ),
        (
          $3, 
          'Sculptural Pleat Dress', 
          'sculptural-pleat-dress', 
          'A-line midi dress with permanent hand-folded pleats. Delivers fluid movement, raw linen neck binding, and a matching self-tie belt for custom styling.', 
          1250000, 
          'INR', 
          5, 
          ARRAY['S', 'M', 'L'], 
          ARRAY['https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800'], 
          true
        ),
        (
          $2, 
          'Studio Wrap Cardigan', 
          'studio-wrap-cardigan', 
          'Heavyweight wrap cardigan knitted from an ultra-soft alpaca blend yarn. Includes an extra-long self-tie belt, deep ribbed hems, and seamless drop-shoulder tailoring.', 
          780000, 
          'INR', 
          12, 
          ARRAY['S', 'M'], 
          ARRAY['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800'], 
          true
        )
    `,
      [tailoredId, knitsId, archId],
    );

    // 4. Insert Site Settings
    console.log("Inserting site settings...");
    await client.query(
      `
      INSERT INTO public.site_settings (
        id,
        brand_name, 
        hero_eyebrow,
        hero_headline, 
        hero_subhead, 
        hero_image_url, 
        marquee_items, 
        homepage_category_ids, 
        footer_tagline
      ) VALUES (
        1,
        'khushhal''s boutique', 
        'limited drop 04',
        'the art of structural utility', 
        'editorial garments designed for durability, tactility, and fluid geometry.', 
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200', 
        ARRAY['Limited Drop 04', 'Complimentary Worldwide Shipping', 'Studio Pieces Now Available'],
        ARRAY[$1, $2, $3]::uuid[],
        'designed with intention. built for duration.'
      )
    `,
      [tailoredId, knitsId, archId],
    );

    await client.query("COMMIT");
    console.log("Database seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to seed database:", err);
  } finally {
    await client.end();
  }
}

seed();
