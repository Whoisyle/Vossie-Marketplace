import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  campus: string;
  price: string;
  priceCents: number;
  image?: unknown;
  description?: string;
  inventoryCount?: number;
}

const DEFAULT_FINDS: MarketplaceItem[] = [
  {
    id: "find-1",
    name: "A Study Notebook Set",
    category: "Books",
    campus: "potchefstroom",
    price: "R120",
    priceCents: 12000,
    image: require("../screens/intro/assets/gallery-3.jpg"),
    description: "3-pack lined hardcover campus notebooks, mint condition.",
  },
  {
    id: "find-2",
    name: "Iced Coffee (Campus)",
    category: "Food",
    campus: "potchefstroom",
    price: "R45",
    priceCents: 4500,
    image: require("../screens/intro/assets/gallery-4.jpg"),
    description: "Freshly brewed cold brew with oat milk, delivered cold.",
  },
  {
    id: "find-3",
    name: "Mint Campus Laptop",
    category: "Electronics",
    campus: "potchefstroom",
    price: "R2 500",
    priceCents: 250000,
    image: require("../screens/intro/assets/gallery-2.jpg"),
    description: "Lightweight 14-inch student laptop with charger and protective sleeve.",
  },
];

export async function fetchMarketplaceListings(params?: {
  campus?: string;
  category?: string;
  query?: string;
}): Promise<MarketplaceItem[]> {
  if (!isSupabaseConfigured) {
    return filterListings(DEFAULT_FINDS, params);
  }

  try {
    let queryBuilder = supabase
      .from("listings")
      .select("id, title, price_cents, campus_code, condition, inventory_count, description, categories(name)")
      .eq("status", "published");

    if (params?.campus) {
      queryBuilder = queryBuilder.eq("campus_code", params.campus);
    }

    const { data, error } = await queryBuilder;

    if (error || !data || data.length === 0) {
      return filterListings(DEFAULT_FINDS, params);
    }

    const rows = data as unknown as {
      id: string;
      title: string;
      price_cents: number;
      campus_code: string;
      description: string;
      inventory_count: number;
      categories: { name: string } | null;
    }[];

    const items: MarketplaceItem[] = rows.map((row) => {
      const rands = (row.price_cents / 100).toLocaleString("en-ZA");
      const categoryName = row.categories?.name || "General";
      return {
        id: row.id,
        name: row.title,
        category: categoryName,
        campus: row.campus_code,
        price: `R${rands}`,
        priceCents: row.price_cents,
        description: row.description,
        inventoryCount: row.inventory_count,
      };
    });

    return filterListings(items, params);
  } catch {
    return filterListings(DEFAULT_FINDS, params);
  }
}

function filterListings(
  items: MarketplaceItem[],
  params?: {
    campus?: string;
    category?: string;
    query?: string;
  }
): MarketplaceItem[] {
  let result = items;

  if (params?.campus) {
    const campusLower = params.campus.toLowerCase();
    result = result.filter(
      (item) => item.campus.toLowerCase() === campusLower || campusLower === "all"
    );
  }

  if (params?.category) {
    const catLower = params.category.toLowerCase();
    result = result.filter((item) => item.category.toLowerCase() === catLower);
  }

  if (params?.query) {
    const q = params.query.toLowerCase().trim();
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }

  return result;
}
