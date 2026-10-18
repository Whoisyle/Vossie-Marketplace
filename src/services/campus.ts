import { supabase } from "@/lib/supabase";

export interface CampusItem {
  id: string;
  name: string;
  sort_order: number;
}

export const CANONICAL_CAMPUSES: CampusItem[] = [
  { id: "midrand-head-office", name: "Midrand (Head Office)", sort_order: 1 },
  { id: "bedfordview", name: "Bedfordview", sort_order: 2 },
  { id: "pretoria", name: "Pretoria", sort_order: 3 },
  { id: "potchefstroom", name: "Potchefstroom", sort_order: 4 },
  { id: "vaal-vanderbijlpark", name: "Vaal (Vanderbijlpark)", sort_order: 5 },
  { id: "bloemfontein", name: "Bloemfontein", sort_order: 6 },
  { id: "durban-umhlanga", name: "Durban (Umhlanga)", sort_order: 7 },
  { id: "east-london", name: "East London", sort_order: 8 },
  {
    id: "nelson-mandela-bay-gqeberha",
    name: "Nelson Mandela Bay (Gqeberha)",
    sort_order: 9,
  },
  { id: "cape-town-mowbray", name: "Cape Town (Mowbray)", sort_order: 10 },
  { id: "tyger-valley-cape-town", name: "Tyger Valley (Cape Town)", sort_order: 11 },
  { id: "nelspruit-mbombela", name: "Nelspruit (Mbombela)", sort_order: 12 },
];

export async function listCampuses(): Promise<CampusItem[]> {
  try {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return CANONICAL_CAMPUSES;
    }
    return data;
  } catch {
    return CANONICAL_CAMPUSES;
  }
}

export function getCampusDisplayName(campusId: string): string {
  const match = CANONICAL_CAMPUSES.find(
    (c) => c.id.toLowerCase() === campusId.toLowerCase() || c.name.toLowerCase() === campusId.toLowerCase()
  );
  return match ? match.name : campusId;
}
