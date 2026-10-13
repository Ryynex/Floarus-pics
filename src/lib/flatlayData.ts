export interface StagingTemplate {
  id: string;
  name: string;
  image: string;
  category: "wood" | "marble" | "stone" | "linen" | "mannequin" | "drape";
  surface: string;
  description: string;
}

export const STAGING_TEMPLATES: StagingTemplate[] = [
  {
    id: "dark-teak",
    name: "Dark teak",
    image: "/reference_suits/dark-teak.jpg",
    category: "wood",
    surface: "Polished Teak",
    description: "Rich dark teak hardwood surface with brass accents & yellow marigold petals"
  },
  {
    id: "dark-teak-notassel",
    name: "Dark teak (no tassel)",
    image: "/reference_suits/dark-teak-notassel.jpg",
    category: "wood",
    surface: "Polished Teak",
    description: "Streamlined dark teak wooden staging with floral elements"
  },
  {
    id: "black-marble",
    name: "Black marble",
    image: "/reference_suits/black-marble.jpg",
    category: "marble",
    surface: "Nero Marquina Marble",
    description: "Luxurious deep black veined marble tabletop with vintage brass bowl"
  },
  {
    id: "black-marble-notassel",
    name: "Black marble (no tassel)",
    image: "/reference_suits/black-marble-notassel.jpg",
    category: "marble",
    surface: "Nero Marquina Marble",
    description: "Minimalist black marble staging with clean overhead perspective"
  },
  {
    id: "terracotta",
    name: "Terracotta",
    image: "/reference_suits/terracotta.jpg",
    category: "stone",
    surface: "Clay Terracotta Tile",
    description: "Earthy hand-pressed terracotta floor tiles with authentic warm undertones"
  },
  {
    id: "terracotta-notassel",
    name: "Terracotta (no tassel)",
    image: "/reference_suits/terracotta-notassel.jpg",
    category: "stone",
    surface: "Clay Terracotta Tile",
    description: "Clean terracotta tile flat-lay with natural earthenware styling"
  },
  {
    id: "sage-marble",
    name: "Sage marble",
    image: "/reference_suits/sage-marble.jpg",
    category: "marble",
    surface: "Sage Green Marble",
    description: "Serene polished sage marble slab with delicate natural veining"
  },
  {
    id: "sage-marble-notassel",
    name: "Sage marble (no tassel)",
    image: "/reference_suits/sage-marble-notassel.jpg",
    category: "marble",
    surface: "Sage Green Marble",
    description: "Clean sage green marble layout with botanical styling"
  },
  {
    id: "artisan-linen",
    name: "Artisan linen",
    image: "/reference_suits/artisan-linen.jpg",
    category: "linen",
    surface: "Raw Woven Linen",
    description: "Warm tactile woven linen backdrop with artisanal craft props"
  },
  {
    id: "casual-drape",
    name: "Casual drape",
    image: "/reference_suits/casual-drape.jpg",
    category: "drape",
    surface: "Artisanal Tabletop",
    description: "Artfully folded kameez with fluid, casual dupatta sweep"
  },
  {
    id: "fan-drape",
    name: "Fan drape",
    image: "/reference_suits/fan-drape.jpg",
    category: "drape",
    surface: "Neutral Floor",
    description: "Pleated fan-spread dupatta showcasing maximum fabric width & motifs"
  },
  {
    id: "heritage-books",
    name: "Heritage books",
    image: "/reference_suits/heritage-books.jpg",
    category: "wood",
    surface: "Antique Study Wood",
    description: "Rich heritage timber tabletop with vintage books and brass magnifying glass"
  },
  {
    id: "heritage-wood",
    name: "Heritage wood",
    image: "/reference_suits/heritage-wood.jpg",
    category: "wood",
    surface: "Aged Rustic Wood",
    description: "Rustic weathered grain wood surface with authentic aged patina"
  },
  {
    id: "peacock-wood",
    name: "Peacock wood",
    image: "/reference_suits/peacock-wood.jpg",
    category: "wood",
    surface: "Turquoise Distressed Wood",
    description: "Distressed peacock blue-green painted wooden floorboards with magenta floral accents"
  },
  {
    id: "teal-wood",
    name: "Teal wood",
    image: "/reference_suits/teal-wood.jpg",
    category: "wood",
    surface: "Earthy Teal Painted Wood",
    description: "Rustic teal-toned timber planks with earthen pottery"
  },
  {
    id: "wood-artisan",
    name: "Wood artisan",
    image: "/reference_suits/wood-artisan.jpg",
    category: "wood",
    surface: "Natural Artisan Bench",
    description: "Warm natural honey-toned wood with rolled textile styling"
  },
  {
    id: "mannequin-unstitched",
    name: "Mannequin unstitched",
    image: "/reference_suits/mannequin-unstitched.jpg",
    category: "mannequin",
    surface: "Dressmaker Mannequin",
    description: "Ivory linen atelier torso with unstitched fabric elegantly draped"
  },
  {
    id: "mannequin-stitched",
    name: "Mannequin stitched",
    image: "/reference_suits/mannequin-stitched.jpg",
    category: "mannequin",
    surface: "Dressmaker Mannequin",
    description: "Tailored suit presentation on a bespoke couture dress form"
  },
];

export interface SavedFlatlaySuit {
  id: string;
  suitNumber: number;
  templateId: string;
  kameezUrl?: string;
  chestDesignUrl?: string;
  dupattaUrl?: string;
  bottomUrl?: string;
  completeSetUrl?: string;
  kameezNote?: string;
  chestDesignNote?: string;
  dupattaNote?: string;
  bottomNote?: string;
  completeSetNote?: string;
}

export interface SavedFlatlayPreferences {
  outputUrl?: string | null;
  recentGenerations?: string[];
  imageCount?: number;
}

export const FLATLAY_SUITS_STORAGE_KEY = "florus_saved_suits_flatlay";
export const FLATLAY_PREFERENCES_STORAGE_KEY = "florus_saved_flatlay_preferences";

export function getSavedFlatlaySuits(): SavedFlatlaySuit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLATLAY_SUITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load flatlay suits from localStorage:", e);
  }
  return [];
}

export function saveFlatlaySuits(suits: SavedFlatlaySuit[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLATLAY_SUITS_STORAGE_KEY, JSON.stringify(suits));
  } catch (e) {
    console.error("Failed to save flatlay suits to localStorage:", e);
  }
}

export function getSavedFlatlayPreferences(): SavedFlatlayPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FLATLAY_PREFERENCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load flatlay preferences from localStorage:", e);
    return null;
  }
}

export function saveFlatlayPreferences(prefs: SavedFlatlayPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLATLAY_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save flatlay preferences to localStorage:", e);
  }
}
