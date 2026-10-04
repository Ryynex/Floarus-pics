export interface CatalogModel {
  id: string;
  name: string;
  category: "demographic" | "custom";
  imageUrl?: string;
  subtitle: string;
  description: string;
}

export interface CatalogPose {
  id: string;
  name: string;
  imageUrl: string;
  category: "standing" | "seated" | "motion" | "details" | "regal";
  description: string;
}

export interface CatalogBackground {
  id: string;
  name: string;
  imageUrl: string;
  category: "heritage" | "festive" | "studio" | "gardens" | "luxury_interiors";
  description: string;
}

export interface CatalogHairstyle {
  id: string;
  name: string;
  category: "buns" | "braids" | "open" | "modern" | "custom";
  description?: string;
  isCustom?: boolean;
}

export interface CatalogJewellery {
  id: string;
  name: string;
  category: "traditional_gold" | "uncut_kundan" | "silver_tribal" | "minimal_modern" | "specialty";
  description?: string;
  isCustom?: boolean;
}

export interface WorkflowMode {
  id: "sarees" | "suits" | "magic" | "pose";
  title: string;
  badge?: string;
  iconName: string;
  description: string;
  outfitTypeDefault: string;
  instructions: string;
}

// -------------------------------------------------------------
// 1. Workflow Modes
// -------------------------------------------------------------
export const WORKFLOW_MODES: WorkflowMode[] = [
  {
    id: "sarees",
    title: "Wholesale Sarees",
    iconName: "Shirt",
    description: "Drape sarees on a model from folded product photos",
    outfitTypeDefault: "Kanjeevaram Silk Saree",
    instructions: "Upload folded saree fabrics or flat-lays. Specify pallu, border, and body notes to achieve 100% authentic drape pleats and pallu fall."
  },
  {
    id: "suits",
    title: "Unstitched Suits",
    iconName: "Layers",
    description: "Stitch and drape suit sets on a model from folded fabric photos",
    outfitTypeDefault: "Unstitched Salwar Kameez (3-Piece)",
    instructions: "Convert 3-piece unstitched fabrics into tailored royal salwar suits, straight kurtas, or palazzo sets on realistic models."
  },
  {
    id: "magic",
    title: "Magic Mode",
    badge: "Beta",
    iconName: "Sparkles",
    description: "Upload any outfit + notes — AI detects the type and drapes it on a model",
    outfitTypeDefault: "Generic ethnic outfit",
    instructions: "Upload photos of any outfit — saree, lehenga, kurta, suit — add a note per photo, and the AI drapes it on a beautiful model."
  },
  {
    id: "pose",
    title: "Pose Generator",
    iconName: "UserCheck",
    description: "Upload a model photo and pick a pose — same model, same outfit, same shoot, new pose",
    outfitTypeDefault: "Catalog Re-pose",
    instructions: "Take an existing photoshoot model image and re-pose it into alternative catalog angles while keeping model face and garment identical."
  }
];

// -------------------------------------------------------------
// 2. Demographic & Persona Models (No random stock faces)
// Users upload their own model photo which is saved permanently!
// -------------------------------------------------------------
export const PRESET_MODELS: CatalogModel[] = [
  {
    id: "indian_female_standard",
    name: "Indian Female Model",
    category: "demographic",
    subtitle: "Standard Commercial E-Commerce",
    description: "Versatile, balanced South Asian commercial catalog model suitable for all ethnic catalogs."
  },
  {
    id: "indian_female_dusky",
    name: "Warm Dusky Complexion",
    category: "demographic",
    subtitle: "Rich South Asian Warm Tone",
    description: "Stunning rich dusky complexion that makes vibrant silks, gold zari, and jewel tones pop."
  },
  {
    id: "indian_female_royal",
    name: "Heritage & Royal North Indian",
    category: "demographic",
    subtitle: "Sculpted Features for Banarasi & Bridal",
    description: "Classical regal features ideal for heavy bridal lehengas, Banarasi brocades, and temple jewellery."
  },
  {
    id: "indian_female_contemporary",
    name: "Contemporary Indo-Western",
    category: "demographic",
    subtitle: "Modern High-Fashion Editorial",
    description: "Editorial, sharp, and youthful aesthetic for modern sarees, fusion wear, and partywear."
  },
  {
    id: "indian_female_curvy",
    name: "Curvy / Plus-Size Indian Model",
    category: "demographic",
    subtitle: "Inclusive Body Representation",
    description: "Fuller silhouette celebrating authentic South Asian curves and realistic saree pleat falls."
  },
  {
    id: "indian_female_mature",
    name: "Mature / Matriarch Grace",
    category: "demographic",
    subtitle: "Sophisticated 40+ Dignified Aesthetic",
    description: "Distinguished, poised look ideal for handloom cottons, pure Tussar, and classic heirloom drapes."
  },
  {
    id: "indian_male_standard",
    name: "Indian Male Model",
    category: "demographic",
    subtitle: "Menswear Kurta & Sherwani",
    description: "Chiseled Indian male model for ethnic kurtas, Nehru bandhgalas, and wedding sherwanis."
  },
  {
    id: "international_female",
    name: "International / Western Model",
    category: "demographic",
    subtitle: "Global & Diaspora Market",
    description: "Caucasian / Western model suited for international destination wedding and diaspora catalogs."
  }
];

// LocalStorage Helper for Permanent Custom Models
const CUSTOM_MODELS_STORAGE_KEY = "florus_permanent_custom_models";

export function getSavedCustomModels(): CatalogModel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load custom models from localStorage:", e);
    return [];
  }
}

export function saveCustomModel(model: CatalogModel): CatalogModel[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getSavedCustomModels();
    // Prepend new model (replace if same id)
    const updated = [model, ...existing.filter((m) => m.id !== model.id)];
    localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save custom model to localStorage:", e);
    return [];
  }
}

export function deleteSavedCustomModel(id: string): CatalogModel[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getSavedCustomModels();
    const updated = existing.filter((m) => m.id !== id);
    localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to delete custom model:", e);
    return [];
  }
}

// -------------------------------------------------------------
// 3. 25+ Comprehensive Catalog Poses (Clear & Approachable)
// -------------------------------------------------------------
export const PRESET_POSES: CatalogPose[] = [
  // Standing
  {
    id: "hand-on-hip",
    name: "Hand on hip — full length",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    description: "Classic straight-to-camera stance showing full outfit height, hemline, and pallu drop."
  },
  {
    id: "holding-drape",
    name: "Holding the drape at waist",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80",
    description: "Model gently lifts and holds the pallu border to present intricate zari work directly to camera."
  },
  {
    id: "pallu-display",
    name: "Front-facing elegant pallu display",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80",
    description: "Direct frontal posture giving 100% clarity on the front pleats and chest drape pattern."
  },
  {
    id: "side-profile",
    name: "Side profile, hand on waist",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
    description: "Highlights blouse back embroidery, waist curvature, and the full side fall of the garment."
  },
  {
    id: "leaning-pillar",
    name: "Leaning against pillar / wall",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80",
    description: "Relaxed editorial pose showcasing side drape silhouette and architectural depth."
  },
  {
    id: "cross-legged-standing",
    name: "Cross-legged casual standing",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
    description: "Modern relaxed posture showing how fabric gathers naturally around the feet."
  },
  {
    id: "hands-folded-front",
    name: "Both hands clasped gently in front",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    description: "Traditional modest posture optimal for showcasing bangles, rings, and clean front pleats."
  },
  {
    id: "one-hand-on-pallu",
    name: "One hand touching shoulder pallu",
    category: "standing",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    description: "Directs visual focus toward the shoulder pin, border tassels, and neckline embroidery."
  },

  // Motion
  {
    id: "walking-motion",
    name: "Walking forward / windswept stride",
    category: "motion",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80",
    description: "Dynamic fluid stride capturing fabric flow, pleat flare, and authentic runway motion."
  },
  {
    id: "turning-back",
    name: "Turning around, looking over shoulder",
    category: "motion",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    description: "Showcases the back blouse tie-up, back tassels (latkans), and trailing pallu length."
  },
  {
    id: "twirl-flare",
    name: "Gentle twirl / flared silhouette",
    category: "motion",
    imageUrl: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=600&q=80",
    description: "360-degree flare capturing maximum circumference of lehenga skirts or anarkali suits."
  },
  {
    id: "holding-parasol",
    name: "Holding decorative parasol",
    category: "motion",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
    description: "Heritage outdoor accessory posture creating shade highlights and festive flair."
  },

  // Seated & Regal
  {
    id: "seated-steps",
    name: "Seated on steps, drape fanned",
    category: "seated",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
    description: "Regal seated arrangement on palace steps with the saree pallu fanned across the floor."
  },
  {
    id: "seated-ledge",
    name: "Seated front-facing on a ledge",
    category: "seated",
    imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
    description: "Commercial seated posture optimal for unstitched suits and flared kurtas."
  },
  {
    id: "seated-royal-chair",
    name: "Seated in ornate carved royal chair",
    category: "regal",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=600&q=80",
    description: "Queenly posture resting arms on carved wooden armrests, ideal for royal heritage lookbooks."
  },
  {
    id: "seated-reading",
    name: "Seated reading a book",
    category: "seated",
    imageUrl: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=600&q=80",
    description: "Warm lifestyle posture reflecting quiet luxury, literary elegance, and home boutique vibe."
  },
  {
    id: "leaning-railing",
    name: "Leaning back on terrace railing",
    category: "seated",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
    description: "Balcony terrace posture with breezy lighting and relaxed royal demeanor."
  },
  {
    id: "seated-floor-diwan",
    name: "Seated on floor diwan with bolster",
    category: "regal",
    imageUrl: "https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=600&q=80",
    description: "Traditional baithak posture with silk bolsters, showing off fabric drape puddling gracefully."
  },

  // Details & Close-ups
  {
    id: "close-portrait",
    name: "Close-up 3/4 bust portrait",
    category: "details",
    imageUrl: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=600&q=80",
    description: "Focused bust-up crop emphasizing blouse necklines, jewellery pairing, and collar border."
  },
  {
    id: "adjusting-earring",
    name: "Hand gently touching earring / jhumka",
    category: "details",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    description: "Candid bridal gesture drawing natural attention to neckline, sleeve work, and jhumka ornaments."
  },
  {
    id: "hands-on-bangles",
    name: "Hands resting at waist adjusting bangles",
    category: "details",
    imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
    description: "Perfect angle to show the waist tuck, pleat neatness, and sleeve embroidery."
  },
  {
    id: "dupatta-held-out",
    name: "Dupatta held out with both hands",
    category: "details",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    description: "Expands sheer organza or bandhani dupatta to demonstrate full width and border craft."
  },
  {
    id: "mirror-reflection",
    name: "Looking into ornate dressing mirror",
    category: "regal",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    description: "Artistic double perspective showing front and back of the outfit simultaneously."
  },
  {
    id: "jharokha-framing",
    name: "Framed in stone jharokha balcony",
    category: "regal",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
    description: "Traditional stone lattice window framing the model like an authentic royal miniature painting."
  }
];

// -------------------------------------------------------------
// 4. 30+ Curated Approachable Backgrounds
// -------------------------------------------------------------
export const PRESET_BACKGROUNDS: CatalogBackground[] = [
  // Heritage & Forts
  {
    id: "pastel-palace",
    name: "Pastel painted palace interior",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=600&q=80",
    description: "Soft mint and blush fresco walls with heritage arched corridors and polished marble."
  },
  {
    id: "rajasthani-fort",
    name: "Rajasthani fort, golden hour",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
    description: "Sun-drenched sandstone courtyards bathed in warm sunset hues and dramatic historic stone."
  },
  {
    id: "jaipur-stepwell",
    name: "Jaipur stepwell / baoli",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=600&q=80",
    description: "Geometrical stone staircases of historic Rajasthan stepwells, dramatic and editorial."
  },
  {
    id: "sheesh-mahal",
    name: "Sheesh Mahal mirror hall",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=600&q=80",
    description: "Intricate mirror glass mosaic walls that sparkle softly under warm chandelier lighting."
  },
  {
    id: "udaipur-lake-palace",
    name: "Udaipur lake palace courtyard",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    description: "Pristine white marble arches overlooking peaceful shimmering blue lake waters."
  },
  {
    id: "chettinad-mansion",
    name: "Chettinad heritage teak courtyard",
    category: "heritage",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    description: "Polished Burma teak pillars, Athangudi patterned handmade floor tiles, and open sky courtyard."
  },

  // Festive & Traditional Settings
  {
    id: "diya-courtyard",
    name: "Evening courtyard lit with brass diyas",
    category: "festive",
    imageUrl: "https://images.unsplash.com/photo-1514517521153-1be72277b32f?auto=format&fit=crop&w=600&q=80",
    description: "Magical twilight atmosphere with warm flickering brass oil lamps and soft golden glows."
  },
  {
    id: "marigold-festive",
    name: "Marigold floral garland backdrop",
    category: "festive",
    imageUrl: "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?auto=format&fit=crop&w=600&q=80",
    description: "Vibrant yellow and orange fresh marigold floral curtains ideal for Haldi, Mehendi, and Diwali."
  },
  {
    id: "temple-carved-pillar",
    name: "Ancient carved stone temple corridor",
    category: "festive",
    imageUrl: "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?auto=format&fit=crop&w=600&q=80",
    description: "Rich Dravidian sculptural stone pillars creating authentic temple silk photoshoot context."
  },
  {
    id: "rangoli-veranda",
    name: "Veranda with fresh petal rangoli",
    category: "festive",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    description: "Traditional terracotta tiled porch adorned with floral rose petals and morning sunshine."
  },

  // Modern & Minimalist Studio (Clean & Approachable)
  {
    id: "studio-neutral",
    name: "Neutral studio backdrop (Warm Beige)",
    category: "studio",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    description: "Clean warm beige cyclorama wall with soft commercial diffused studio light. 100% fabric focus."
  },
  {
    id: "studio-soft-gray",
    name: "Editorial soft gray seamless paper",
    category: "studio",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    description: "Contemporary neutral gray backdrop with high dynamic range and no distracting reflections."
  },
  {
    id: "studio-warm-terracotta",
    name: "Warm terracotta clay textured studio wall",
    category: "studio",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    description: "Earthy artisanal plaster finish adding depth without overpowering garment patterns."
  },
  {
    id: "studio-clean-white",
    name: "High-key clean white Amazon catalog",
    category: "studio",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    description: "Crisp white infinite background optimized for marketplace listing standards (Amazon, Myntra)."
  },

  // Gardens & Nature
  {
    id: "green-garden",
    name: "Lush green garden estate",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
    description: "Manicured estate lawn with blooming jasmine, tropical foliage, and natural daylight."
  },
  {
    id: "colonial-balcony",
    name: "Colonial garden balcony with bougainvillea",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
    description: "White balustrade balcony overflowing with magenta bougainvillea vines and morning sunlight."
  },
  {
    id: "sunlit-villa",
    name: "Sunlit villa garden, golden hour",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    description: "Luxury villa stone courtyard bathed in rich amber evening backlight."
  },
  {
    id: "veranda-curtains",
    name: "Veranda with sheer breezy curtains",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
    description: "Airy colonnade with translucent sheer white drapes moving softly in the gentle wind."
  },
  {
    id: "royal-rose-garden",
    name: "Royal Mughal rose garden with fountains",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=600&q=80",
    description: "Symmetrical water canals, red sandstone pathways, and blooming fragrant roses."
  },
  {
    id: "desert-sunset-dunes",
    name: "Golden Thar desert sand dunes",
    category: "gardens",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
    description: "Dramatic rippled golden sand dunes under an amber and purple twilight sky."
  },

  // Luxury Interiors & Architecture
  {
    id: "baroque-hall",
    name: "Grand baroque marble hall",
    category: "luxury_interiors",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    description: "Opulent European and Indo-Saracenic grandeur with gilded pillars and reflective floors."
  },
  {
    id: "heritage-room",
    name: "Chandelier heritage room",
    category: "luxury_interiors",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=600&q=80",
    description: "Intimate regal room featuring crystal chandeliers, warm teak furniture, and Persian rugs."
  },
  {
    id: "vintage-car",
    name: "Vintage car & heritage portico",
    category: "luxury_interiors",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    description: "Cream classic Rolls-Royce / Ambassador parked under a grand heritage driveway arch."
  },
  {
    id: "warm-library",
    name: "Warm royal library with mahogany wood",
    category: "luxury_interiors",
    imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80",
    description: "Rich mahogany bookshelves, vintage leather binding, and warm amber banker lamps."
  },
  {
    id: "penthouse-skyline",
    name: "Modern luxury penthouse city view",
    category: "luxury_interiors",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
    description: "Floor-to-ceiling glass windows overlooking modern high-rise city lights at dusk."
  }
];

// -------------------------------------------------------------
// 5. 25+ Curated Hairstyles
// -------------------------------------------------------------
export const PRESET_HAIRSTYLES: CatalogHairstyle[] = [
  // Buns
  { id: "default", name: "Default (as before)", category: "buns", description: "Keep the model's natural signature hairstyle" },
  { id: "low-bun-sleek", name: "Low bun (sleek & middle-parted)", category: "buns", description: "Middle-parted polished low chignon, ideal for bridal jewellery" },
  { id: "messy-low-bun", name: "Messy textured low bun", category: "buns", description: "Soft face-framing curls with relaxed textured romantic bun" },
  { id: "high-top-knot", name: "High top knot bun", category: "buns", description: "Sculptural high top knot highlighting jawline and heavy jhumkas" },
  { id: "french-twist", name: "Classic French twist bun", category: "buns", description: "Sophisticated retro upward roll giving an elongated neck profile" },
  { id: "donuts-floral-bun", name: "Floral encircled donut bun (Gajra Ring)", category: "buns", description: "Full round bun completely encircled by a ring of fresh white flowers" },

  // Braids
  { id: "braid-traditional", name: "Traditional 3-strand long braid", category: "braids", description: "Classic Indian straight back braid reaching past the waist" },
  { id: "braid-gajra", name: "Braid decorated with mogra gajra", category: "braids", description: "Long traditional braid entwined with fresh fragrant jasmine mogra" },
  { id: "fishtail-braid", name: "Textured fishtail side braid", category: "braids", description: "Bohemian fishtail braid resting softly over one shoulder" },
  { id: "paranda-braid", name: "Punjabi Paranda festive braid", category: "braids", description: "Thick braid decorated with vibrant silk paranda tassels at the end" },
  { id: "bubble-braid", name: "Modern tiered bubble braid", category: "braids", description: "Trendy partitioned bubble sections for Indo-Western festive outfits" },
  { id: "dutch-crown-braid", name: "Crown halo braid", category: "braids", description: "Braid woven like a tiara around the crown with tucked ends" },

  // Open Styles
  { id: "open-straight", name: "Open glossy straight hair", category: "open", description: "Sleek flowing straight glossy hair resting behind shoulders" },
  { id: "open-soft-waves", name: "Open soft blowout waves", category: "open", description: "Loose romantic Bollywood blowout waves with natural bounce" },
  { id: "deep-side-part-waves", name: "Deep side-parted Hollywood waves", category: "open", description: "Vintage glamour waves pinned back behind one ear" },
  { id: "side-swept-curls", name: "Side-swept over one shoulder", category: "open", description: "All hair draped forward over left shoulder to reveal blouse back" },
  { id: "textured-beach-waves", name: "Textured beach waves", category: "open", description: "Effortless matte wavy texture for resort wear and light cottons" },

  // Half-Up & Modern
  { id: "half-up-half-down", name: "Half-up, half-down with soft curls", category: "modern", description: "Crown pinned back with soft cascading shoulder curls" },
  { id: "half-up-puff", name: "Traditional front puff with open waves", category: "modern", description: "Voluminous crown puff framing the forehead and maang tikka" },
  { id: "high-ponytail", name: "Sleek snatched high ponytail", category: "modern", description: "Ultra-modern high pony for contemporary suits and sharp silhouettes" },
  { id: "low-ponytail-wrapped", name: "Low ponytail with hair wrap", category: "modern", description: "Understated minimalist low pony wrapped with own hair strand" },
  { id: "pixie-short", name: "Chic modern short bob", category: "modern", description: "Contemporary short hairstyle for progressive modern styling" },
  
  // Custom
  { id: "custom", name: "Custom — describe it yourself", category: "custom", isCustom: true, description: "Type specific hair length, texture, or flower ornaments" }
];

// -------------------------------------------------------------
// 6. 20+ Curated Jewellery Styles
// -------------------------------------------------------------
export const PRESET_JEWELLERY: CatalogJewellery[] = [
  { id: "default", name: "Default (as before)", category: "traditional_gold", description: "Balanced default ornaments harmonized with the chosen garment" },
  
  // Traditional Gold
  { id: "temple-antique", name: "Temple Jewellery (22K Antique Gold)", category: "traditional_gold", description: "South Indian matte antique gold with Lakshmi motifs and ruby accents" },
  { id: "festive-gold", name: "Festive Yellow Gold Choker & Jhumkas", category: "traditional_gold", description: "Traditional bright yellow gold filigree necklace and drop jhumkas" },
  { id: "bridal-heavy", name: "Heavy Bridal Heritage Set", category: "traditional_gold", description: "Elaborate choker, long rani haar, matha patti, nath, and haathphool" },
  { id: "rajkot-gold", name: "Lightweight Rajkot Gold Casting Set", category: "traditional_gold", description: "Delicate laser-cut modern gold set suited for everyday festive wear" },

  // Uncut Diamonds & Royal Meenakari
  { id: "kundan-polki", name: "Kundan / Uncut Polki Diamonds", category: "uncut_kundan", description: "Jaipur uncut polki stones set in gold foil with hanging emerald beads" },
  { id: "jadau-meenakari", name: "Jadau with Royal Green Meenakari", category: "uncut_kundan", description: "Hand-painted enamel reverse work with uncut precious gemstones" },
  { id: "navratna", name: "Navratna (Nine Gemstones Set)", category: "uncut_kundan", description: "Sacred astrological arrangement of ruby, pearl, coral, emerald, and sapphire" },
  { id: "basra-pearl", name: "Basra Pearl Multi-Strand Mala", category: "uncut_kundan", description: "Lustrous white pearls with gold pendant, royal and timeless" },

  // Oxidised & Tribal
  { id: "oxidised-silver", name: "Oxidised Silver Bohemian Choker", category: "silver_tribal", description: "Vintage blackened silver tribal collar with ghungroo bells and chandbalis" },
  { id: "afghan-tribal", name: "Afghan Kuchi Tribal Jewellery", category: "silver_tribal", description: "Rustic metal craft with turquoise inlays and coin drops for fusion wear" },
  { id: "antique-bronze", name: "Antique Bronze / Brass Chunky Neckpiece", category: "silver_tribal", description: "Understated earthy metallic tones suited for linen and raw silk sarees" },

  // Minimal & Modern
  { id: "minimal-everyday", name: "Minimal / Dainty Sleek Gold Chain", category: "minimal_modern", description: "Fine dainty chain with tiny pendant and simple diamond studs" },
  { id: "diamond-solitaire", name: "Diamond Solitaire Tennis Necklace", category: "minimal_modern", description: "Crisp modern white diamonds for evening gowns and cocktail sarees" },
  { id: "rose-gold-contemporary", name: "Rose Gold Contemporary Geometric Set", category: "minimal_modern", description: "Warm rose metallic finish with subtle cubic zirconia sparkle" },

  // Specialty & Accents
  { id: "earrings-only", name: "Statement Earrings Only (No Necklace)", category: "specialty", description: "Huge shoulder-duster jhumkas or chandbalis with a bare elegant neck" },
  { id: "choker-only", name: "Broad Velvet Choker Only (No Earrings)", category: "specialty", description: "Snug collar choker emphasizing the clavicle and collarbones" },
  { id: "floral-haldi", name: "Fresh Floral Jewellery (Haldi / Baby Shower)", category: "specialty", description: "Yellow tagar and rose petal earrings, maang tikka, and floral bangles" },
  { id: "no-jewellery", name: "No Jewellery (Clean Fabric Focus)", category: "specialty", description: "Completely distraction-free look highlighting 100% garment weave and cut" },

  // Custom
  { id: "custom", name: "Custom — describe it yourself", category: "specialty", isCustom: true, description: "Specify emeralds, rubies, chokers, or heirloom designs" }
];

// -------------------------------------------------------------
// 7. 25+ Comprehensive Outfit Types
// -------------------------------------------------------------
export const OUTFIT_TYPES = [
  // Saree Variations
  "Kanjeevaram Silk Saree",
  "Banarasi Brocade Silk Saree",
  "Chanderi Handloom Saree",
  "Tussar / Raw Silk Saree",
  "Paithani Traditional Saree",
  "Bandhani / Leheriya Saree",
  "Patola Double Ikat Saree",
  "Chiffon Floral Printed Saree",
  "Georgette Partywear Saree",
  "Organza Sheer Saree with Zari",
  "Linen / Cotton Handloom Saree",
  "Pre-Draped Ready-to-Wear Saree",
  
  // Suits & Sets
  "Unstitched Salwar Kameez (3-Piece)",
  "Straight Cut Kurta & Cigarette Pants",
  "Anarkali Flared Gown with Dupatta",
  "Pakistani Lawn Suit with Lace Work",
  "Sharara / Gharara Suit Set",
  "Dhoti Pants & Peplum Kurti",
  "A-Line Kurti with Palazzo",
  "Velvet Winter Embroidered Suit",
  
  // Occasion & Luxury
  "Bridal Lehenga Choli with Dual Dupatta",
  "Partywear Crop Top & Flared Skirt",
  "Floor-Length Indo-Western Gown",
  "Kaftan with Embellished Neckline",
  "Co-Ord Festive Kurta Set",
  "Generic ethnic outfit"
];

// -------------------------------------------------------------
// 8. Master Photoshoot References (Real Curated Shoots)
// Prevents AI hallucination by providing real poses, natural hands,
// and authentic Indian lighting physics.
// -------------------------------------------------------------
export interface MasterShoot {
  id: string;
  title: string;
  category: "all" | "heritage" | "studio" | "garden" | "festive_temple" | "terrace" | "custom";
  imageUrl: string;
  modelPersona: string;
  settingTitle: string;
  lighting: string;
  poseDescription: string;
  badge?: string;
}

export const MASTER_SHOOTS: MasterShoot[] = [
  {
    id: "shoot_10_garden_morning",
    title: "Morning Sun Botanical Garden",
    category: "garden",
    imageUrl: "/reference_shoots/10_botanical_garden_morning_sun.jpg",
    modelPersona: "Warm Approachable Indian Woman with radiant natural smile",
    settingTitle: "Botanical Garden with Soft Greenery Bokeh & Natural Morning Flare",
    lighting: "Dappled morning sunlight filtering through garden foliage",
    poseDescription: "Relaxed natural standing pose with hand resting gently at waist",
    badge: "Flagship Choice"
  },
  {
    id: "shoot_01_heritage_doorway",
    title: "Heritage Haveli Carved Doorway",
    category: "heritage",
    imageUrl: "/reference_shoots/01_heritage_haveli_doorway.jpg",
    modelPersona: "North Indian Bridal Model, bold red lips, elegant wavy hair",
    settingTitle: "Carved Rajasthani Wooden Doorway with Brass Bells & Diyas",
    lighting: "Warm natural daylight with architectural stone shadows",
    poseDescription: "Classic front-facing catalog pose, hand on hip resting over waist pleats",
    badge: "Most Popular"
  },
  {
    id: "shoot_02_palace_diwan",
    title: "Royal Palace Diwan & Mirror",
    category: "festive_temple",
    imageUrl: "/reference_shoots/02_palace_diwan_mirror_candles.jpg",
    modelPersona: "Regal Indian Queen Persona, calm authoritative gaze, pearl necklace",
    settingTitle: "Red Velvet Diwan, Candelabra with Glowing Candles & Gilded Mirror",
    lighting: "Warm candlelit glow with dramatic luxury reflections",
    poseDescription: "Seated queen majesty, hand touching pearl necklace with scattered rose petals",
    badge: "Royal Luxury"
  },
  {
    id: "shoot_03_jaipur_archway",
    title: "Jaipur Palace Archway Walking",
    category: "heritage",
    imageUrl: "/reference_shoots/03_jaipur_archway_walking.jpg",
    modelPersona: "Graceful High-Fashion Model with silver payal anklets",
    settingTitle: "Distressed Turquoise Haveli Frame overlooking Mountain Fort",
    lighting: "Soft morning sunlight streaming through open archway",
    poseDescription: "Graceful walking motion, flowing pallu in mid-air",
    badge: "Motion"
  },
  {
    id: "shoot_04_khandela_pillars",
    title: "Mughal Courtyard Painted Pillars",
    category: "heritage",
    imageUrl: "/reference_shoots/04_khandela_haveli_pillars.jpg",
    modelPersona: "Rajputana Bride with kundan maang tikka and ivory chuda",
    settingTitle: "Khandela Haveli Fresco Corridor with Elephant Motifs & Pillars",
    lighting: "Soft diffused courtyard daylight",
    poseDescription: "Leaning gently against carved fresco pillar in traditional poshak drape"
  },
  {
    id: "shoot_05_amber_twirl",
    title: "Amber Fort Jali Lattice Twirl",
    category: "heritage",
    imageUrl: "/reference_shoots/05_amber_jali_window_twirl.jpg",
    modelPersona: "Joyful Celebratory Indian Bride with candid smile",
    settingTitle: "Carved Sandstone Jali Lattice Windows with Sunlight Beams",
    lighting: "Dramatic diagonal sunbeams through carved lattice",
    poseDescription: "Joyous celebratory twirl with arms outstretched displaying full skirt flare",
    badge: "Flared Skirt"
  },
  {
    id: "shoot_06_earthy_studio",
    title: "Earthy Minimalist Studio",
    category: "studio",
    imageUrl: "/reference_shoots/06_earthy_studio_neutral.jpg",
    modelPersona: "Contemporary High-Fashion Model with silver chandbali earrings",
    settingTitle: "Mottled Terracotta & Taupe Studio Cyclorama with Brass Stool",
    lighting: "Directional soft studio key light with subtle rim",
    poseDescription: "High-fashion pensive pose, hand resting delicately near collarbone",
    badge: "High-Fashion"
  },
  {
    id: "shoot_07_couture_teal",
    title: "Haute Couture Studio S-Curve",
    category: "studio",
    imageUrl: "/reference_shoots/07_haute_couture_studio_teal.jpg",
    modelPersona: "Striking Couture Editorial Model with bold lip",
    settingTitle: "Deep Midnight Teal Studio Backdrop with Sculpted Floor Shadows",
    lighting: "Sculpted key lighting with sharp rim highlights",
    poseDescription: "S-curve fashion stance, hand on hip, fingers resting lightly on chin",
    badge: "Couture"
  },
  {
    id: "shoot_08_temple_steps",
    title: "South Indian Temple Stone Steps",
    category: "festive_temple",
    imageUrl: "/reference_shoots/08_temple_stone_steps_drape.jpg",
    modelPersona: "Kanjeevaram Temple Bride with jasmine gajra hair styling",
    settingTitle: "Ancient Granite Temple Pillars & Weathered Stone Steps",
    lighting: "Warm low-angle sun flare grazing the temple cornice",
    poseDescription: "Regal standing pose with silk drape cascading down 5 stone steps",
    badge: "Cascading Pallu"
  },
  {
    id: "shoot_09_temple_marigolds",
    title: "Seated Pooja Sanctuary & Marigolds",
    category: "festive_temple",
    imageUrl: "/reference_shoots/09_temple_marigold_seated.jpg",
    modelPersona: "Dusky South Indian Classical Model with temple jewelry & bindi",
    settingTitle: "Carved Teakwood Wall & Temple Steps with Fresh Yellow Marigolds",
    lighting: "Warm festive temple sanctuary glow",
    poseDescription: "Seated classical grace on temple steps surrounded by marigolds and brass urli",
    badge: "Temple Silks"
  },
  {
    id: "shoot_11_mustard_meadow",
    title: "Mustard Blossom Meadow",
    category: "garden",
    imageUrl: "/reference_shoots/garden_botanical_1.jpg",
    modelPersona: "Poised Indian Woman with traditional alta on hands",
    settingTitle: "Blooming Yellow Mustard Flower Field under Open Daylight",
    lighting: "Soft natural overcast daylight horizon",
    poseDescription: "Gentle standing pose with hands clasped in flower field",
    badge: "Natural Daylight"
  },
  {
    id: "shoot_12_sunset_meadow",
    title: "Sunset Golden Hour Meadow",
    category: "garden",
    imageUrl: "/reference_shoots/garden_botanical_2.jpg",
    modelPersona: "Joyful Indian Woman with golden-hour hair glow",
    settingTitle: "Open Meadow at Sunset with Backlit Golden Rays",
    lighting: "Warm golden-hour backlight",
    poseDescription: "Arms outstretched in freedom motion, flowing fabric",
    badge: "Golden Hour"
  },
  {
    id: "shoot_13_garden_estate",
    title: "Lush Royal Estate Lawn",
    category: "garden",
    imageUrl: "/reference_shoots/garden_botanical_3.jpg",
    modelPersona: "Graceful Indian Woman with serene expression and soft wave hair",
    settingTitle: "Emerald Lawn of Heritage Estate with Manicured Shrubs",
    lighting: "Crisp outdoor morning light with natural fill",
    poseDescription: "Poised standing stance holding pallu edge gracefully",
    badge: "Estate"
  },
  {
    id: "shoot_14_heritage_corridor",
    title: "Royal Palace Marble Corridor",
    category: "heritage",
    imageUrl: "/reference_shoots/heritage_palace_1.jpg",
    modelPersona: "Regal Indian Model with antique gold choker necklace",
    settingTitle: "White Marble Palace Colonnade with Arched Perspectives",
    lighting: "High-contrast architectural sunbeams across marble floor",
    poseDescription: "Stately walkway stance, gazing towards palace courtyard",
    badge: "Regal"
  },
  {
    id: "shoot_15_sheesh_mahal",
    title: "Sheesh Mahal Mirrored Palace",
    category: "heritage",
    imageUrl: "/reference_shoots/heritage_palace_2.jpg",
    modelPersona: "Authoritative Royal Bride with ornate matha patti",
    settingTitle: "Intricate Mirror-Inlaid Wall of Sheesh Mahal with Golden Accents",
    lighting: "Glistening mirror reflections with soft spotlighting",
    poseDescription: "Formal catalog center stance with both hands gently folded",
    badge: "Mirrored Palace"
  },
  {
    id: "shoot_16_sandstone_walkway",
    title: "Sunlit Sandstone Courtyard",
    category: "heritage",
    imageUrl: "/reference_shoots/heritage_palace_3.jpg",
    modelPersona: "Classic Indian Model with neat braided hair and red tilak",
    settingTitle: "Warm Ochre Sandstone Courtyard with Mughal Arch Geometry",
    lighting: "Brilliant warm afternoon Indian sun with soft shadows",
    poseDescription: "Sideways 3/4 turn showcasing side embroidery and pallu pleats"
  },
  {
    id: "shoot_17_terrace_balcony",
    title: "Heritage Balcony Moody Spotlight",
    category: "terrace",
    imageUrl: "/reference_shoots/luxury_terrace_1.jpg",
    modelPersona: "Classical Banarasi Model with jhumkas",
    settingTitle: "Antique Heritage Mansion Balcony with Wrought-Iron Railing",
    lighting: "Dramatic moody spotlighting with distressed walls",
    poseDescription: "Standing against ornate wrought-iron railing with dramatic gaze",
    badge: "Moody Couture"
  },
  {
    id: "shoot_18_terrace_sunset",
    title: "Palace Rooftop Golden Sunset",
    category: "terrace",
    imageUrl: "/reference_shoots/luxury_terrace_2.jpg",
    modelPersona: "Sophisticated Modern Indian Woman with gold studs",
    settingTitle: "Open Palace Terrace overlooking Fort and Violet Dusk Horizon",
    lighting: "Cinematic magic hour dusk flare",
    poseDescription: "Gentle turn overlooking parapet wall with billowing dupatta",
    badge: "Dusk Horizon"
  },
  {
    id: "shoot_19_jharokha_urli",
    title: "Jharokha Archway & Urli Flowers",
    category: "festive_temple",
    imageUrl: "/reference_shoots/luxury_terrace_3.jpg",
    modelPersona: "Radiant Indian Bride with traditional jhumkas",
    settingTitle: "Carved Peach Jharokha Archway with Brass Urli & Mogra Flowers",
    lighting: "Warm ambient glow with hanging brass diyas",
    poseDescription: "Standing inside carved archway surrounded by white jasmine flowers",
    badge: "Banarasi Special"
  },
  {
    id: "shoot_20_studio_pedestal",
    title: "Minimalist Beige Pedestal Studio",
    category: "studio",
    imageUrl: "/reference_shoots/studio_clean_1.jpg",
    modelPersona: "Contemporary High-Street Fashion Model with minimal makeup",
    settingTitle: "Seamless Warm Sand Cyclorama with Fluted Plaster Column",
    lighting: "Clean diffuse softbox key lighting with pure color rendition",
    poseDescription: "Relaxed commercial catalog stance leaning near pedestal",
    badge: "E-Commerce"
  },
  {
    id: "shoot_21_studio_high_key",
    title: "Clean Studio High-Key Lighting",
    category: "studio",
    imageUrl: "/reference_shoots/studio_clean_2.jpg",
    modelPersona: "Modern Commercial Catalog Model with confident gaze",
    settingTitle: "Clean Studio Set with Balanced Fill & Soft Shadows",
    lighting: "Commercial high-key catalog lighting",
    poseDescription: "Direct front catalog pose, perfect for e-commerce listings",
    badge: "Catalog Front"
  },
  {
    id: "shoot_22_studio_blue_canvas",
    title: "Deep Blue Textured Studio Backdrop",
    category: "studio",
    imageUrl: "/reference_shoots/studio_clean_3.jpg",
    modelPersona: "Glamorous Indian Model with voluminous dark curls",
    settingTitle: "Textured Navy & Royal Blue Painted Canvas Studio Backdrop",
    lighting: "Crisp studio portrait lighting with glowing skin tone",
    poseDescription: "Over-the-shoulder turn pose showing back pallu drape",
    badge: "Over-Shoulder"
  },
  {
    id: "shoot_23_studio_warm_sand",
    title: "Warm Sand Studio Portrait",
    category: "studio",
    imageUrl: "/reference_shoots/studio_neutral_1.jpg",
    modelPersona: "Poised Editorial Model with clean center-parted sleek hair",
    settingTitle: "Warm Ochre & Sand Matte Studio Wall with Soft Floor Gradient",
    lighting: "Beauty dish key lighting with warm rim fill",
    poseDescription: "Straight portrait posture with hands resting gently at sides",
    badge: "Studio Clean"
  },
  {
    id: "shoot_24_studio_terracotta",
    title: "Soft Terracotta Editorial Studio",
    category: "studio",
    imageUrl: "/reference_shoots/studio_neutral_3.jpg",
    modelPersona: "Expressive Indian Model with artistic styling and bronze accents",
    settingTitle: "Muted Terracotta Plaster Studio with Architectural Arch Niche",
    lighting: "Directional golden hour studio simulation with soft penumbra",
    poseDescription: "Artistic 3/4 profile pose highlighting neckline and sleeve border"
  },
  {
    id: "shoot_25_temple_ancient_pillars",
    title: "Ancient Stone Temple Pillar Corridor",
    category: "festive_temple",
    imageUrl: "/reference_shoots/temple_festive_1.jpg",
    modelPersona: "Devotional South Indian Classical Model with fresh gajra",
    settingTitle: "Centuries-Old Carved Granite Mandapam with Deep Perspectives",
    lighting: "Atmospheric low-angle sun grazing weathered stone carvings",
    poseDescription: "Graceful stance holding brass thali or flower garland",
    badge: "Classical"
  },
  {
    id: "shoot_26_temple_bell_courtyard",
    title: "Brass Bell Sanctuary Courtyard",
    category: "festive_temple",
    imageUrl: "/reference_shoots/temple_festive_2.jpg",
    modelPersona: "Festive Indian Bride with ornate gold temple choker and kamarbandh",
    settingTitle: "Temple Sanctuary Courtyard with Hanging Antiqued Brass Bells",
    lighting: "Warm sacred temple daylight with subtle incense haze",
    poseDescription: "Standing with one hand gently reaching towards brass bell",
    badge: "Sacred Festive"
  },
  {
    id: "shoot_27_temple_wooden_mandap",
    title: "Carved Wooden Pooja Mandap",
    category: "festive_temple",
    imageUrl: "/reference_shoots/temple_festive_3.jpg",
    modelPersona: "Traditional Homemaker / Festive Persona with auspicious red bindi",
    settingTitle: "Intricately Carved Teakwood Temple Mandap with Brass Oil Lamps",
    lighting: "Warm golden glow from burning oil diyas and ambient soft light",
    poseDescription: "Respectful folded-hands Namaste pose in traditional silk saree",
    badge: "Namaste Pose"
  },
  {
    id: "shoot_28_tropical_canopy",
    title: "Tropical Lawn & Dappled Canopy",
    category: "garden",
    imageUrl: "/reference_shoots/terrace_golden_4.jpg",
    modelPersona: "Traditional South Indian Model with neat hair bun & temple pendant",
    settingTitle: "Lush Tropical Lawn with Palm Trees & Dappled Sunlight",
    lighting: "Dappled morning sunlight under palm canopy",
    poseDescription: "Full-length stance holding pallu corner open displaying border",
    badge: "Border Display"
  }
];

export function getSavedCustomShoots(): MasterShoot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("florus_custom_shoots");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomShoot(shoot: MasterShoot): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedCustomShoots();
    const updated = [shoot, ...existing.filter((s) => s.id !== shoot.id)];
    localStorage.setItem("florus_custom_shoots", JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist custom shoot to localStorage:", err);
  }
}

