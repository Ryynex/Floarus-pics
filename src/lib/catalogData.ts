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
    title: "Custom Lookbooks",
    iconName: "Sparkles",
    description: "Upload any outfit + notes — AI drapes it on your chosen model, pose & setting",
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
// LocalStorage Helper for Permanent Garment / Outfit Uploads
// -------------------------------------------------------------
export interface SavedGarment {
  id: string;
  url: string;
  note: string;
  name?: string;
  slotLabel?: string;
}

const SAVED_GARMENTS_STORAGE_KEY = "florus_permanent_saved_garments";

export function getSavedGarments(): SavedGarment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_GARMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load saved garments from localStorage:", e);
    return [];
  }
}

export function saveGarmentsToStorage(garments: SavedGarment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_GARMENTS_STORAGE_KEY, JSON.stringify(garments));
  } catch (e) {
    console.error("Failed to save garments to localStorage:", e);
  }
}

// -------------------------------------------------------------
// LocalStorage Helpers for User Selected Workspace Options & Preferences
// -------------------------------------------------------------
export interface SavedMagicPreferences {
  selectedModel?: CatalogModel;
  selectedPose?: CatalogPose;
  selectedBackground?: CatalogBackground;
  backgroundMode?: "fixed" | "inspiration";
  selectedHairstyle?: CatalogHairstyle;
  selectedJewellery?: CatalogJewellery;
  outfitType?: string;
  customStylingNotes?: string;
  outputUrl?: string | null;
  recentGenerations?: string[];
}

const MAGIC_PREFERENCES_KEY = "florus_saved_magic_preferences";

export function getSavedMagicPreferences(): SavedMagicPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MAGIC_PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load magic workspace preferences:", e);
    return null;
  }
}

export function saveMagicPreferences(prefs: SavedMagicPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAGIC_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save magic workspace preferences:", e);
  }
}

export interface SavedStudioPreferences {
  selectedShoot?: MasterShoot;
  faceMode?: "keep_original" | "custom_face" | "random_face";
  selectedModel?: CatalogModel;
  outfitType?: string;
  customStylingNotes?: string;
  outputUrl?: string | null;
}

const STUDIO_PREFERENCES_KEY = "florus_saved_studio_preferences";

export function getSavedStudioPreferences(): SavedStudioPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUDIO_PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load studio workspace preferences:", e);
    return null;
  }
}

export function saveStudioPreferences(prefs: SavedStudioPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STUDIO_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save studio workspace preferences:", e);
  }
}

// -------------------------------------------------------------
// 3. 25+ Comprehensive Catalog Poses (Clear & Approachable)
// -------------------------------------------------------------
export const PRESET_POSES: CatalogPose[] = [
  // Standing & Drape
  {
    id: "hand-on-hip",
    name: "Hand on hip — full length",
    category: "standing",
    imageUrl: "/reference_poses/01_hand_on_hip_full_length.jpg",
    description: "Classic straight-to-camera stance showing full outfit height, hemline, and pallu drop."
  },
  {
    id: "holding-drape",
    name: "Holding the drape at waist",
    category: "standing",
    imageUrl: "/reference_poses/02_holding_drape_at_waist.jpg",
    description: "Model gently lifts and holds the pallu border to present intricate zari work directly to camera."
  },
  {
    id: "leaning-pillar",
    name: "Leaning against pillar / wall",
    category: "standing",
    imageUrl: "/reference_poses/03_leaning_against_wall.jpg",
    description: "Relaxed editorial pose showcasing side drape silhouette and architectural depth."
  },
  {
    id: "side-profile",
    name: "Side profile, hand on waist",
    category: "standing",
    imageUrl: "/reference_poses/04_side_profile_hand_on_waist.jpg",
    description: "Highlights blouse back embroidery, waist curvature, and the full side fall of the garment."
  },
  {
    id: "hands-folded-front",
    name: "Both hands clasped gently in front",
    category: "standing",
    imageUrl: "/reference_poses/11_hands_clasped_front.jpg",
    description: "Traditional modest posture optimal for showcasing bangles, rings, and clean front pleats."
  },
  {
    id: "one-hand-on-pallu",
    name: "One hand touching shoulder pallu",
    category: "standing",
    imageUrl: "/reference_poses/12_one_hand_touching_shoulder.jpg",
    description: "Directs visual focus toward the shoulder pin, border tassels, and neckline embroidery."
  },
  {
    id: "standing-three-quarter",
    name: "Standing, three-quarter turn",
    category: "standing",
    imageUrl: "/reference_poses/14_standing_three_quarter_turn.jpg",
    description: "Classic 45-degree catalog posture showcasing garment silhouette and shoulder line."
  },
  {
    id: "side-profile-90",
    name: "Pure side profile, full length",
    category: "standing",
    imageUrl: "/reference_poses/24_side_profile_90_degree.jpg",
    description: "Clean 90-degree lateral profile standing straight, showing full spine posture and hemline."
  },
  {
    id: "pallu-display",
    name: "Front-facing elegant pallu display",
    category: "standing",
    imageUrl: "/reference_poses/25_front_facing_pallu_display.jpg",
    description: "Direct frontal posture giving 100% clarity on the front pleats and chest drape pattern."
  },

  // Motion & Walking
  {
    id: "walking-motion",
    name: "Walking forward / windswept stride",
    category: "motion",
    imageUrl: "/reference_poses/05_walking_windswept_motion.jpg",
    description: "Dynamic fluid stride capturing fabric flow, pleat flare, and authentic runway motion."
  },
  {
    id: "holding-parasol",
    name: "Holding decorative parasol",
    category: "motion",
    imageUrl: "/reference_poses/09_holding_parasol.jpg",
    description: "Heritage outdoor accessory posture creating shade highlights and festive flair."
  },
  {
    id: "dupatta-held-out",
    name: "Dupatta held out with both hands",
    category: "motion",
    imageUrl: "/reference_poses/18_dupatta_held_out_wingspan.jpg",
    description: "Expands sheer organza or bandhani dupatta to demonstrate full width and border craft."
  },
  {
    id: "turning-back",
    name: "Turning around, looking over shoulder",
    category: "motion",
    imageUrl: "/reference_poses/19_turning_around_back_shot.jpg",
    description: "Showcases the back blouse tie-up, back tassels (latkans), and trailing pallu length."
  },

  // Seated & Regal
  {
    id: "seated-steps",
    name: "Seated on steps, drape fanned",
    category: "seated",
    imageUrl: "/reference_poses/06_seated_on_steps_drape_fanned.jpg",
    description: "Regal seated arrangement on palace steps with the saree pallu fanned across the floor."
  },
  {
    id: "seated-ledge",
    name: "Seated front-facing on a ledge",
    category: "seated",
    imageUrl: "/reference_poses/07_seated_front_facing_ledge.jpg",
    description: "Commercial seated posture optimal for unstitched suits and flared kurtas."
  },
  {
    id: "seated-reading",
    name: "Seated reading a book",
    category: "seated",
    imageUrl: "/reference_poses/08_seated_reading_book.jpg",
    description: "Warm lifestyle posture reflecting quiet luxury, literary elegance, and boutique vibe."
  },
  {
    id: "leaning-railing",
    name: "Leaning back on terrace railing",
    category: "seated",
    imageUrl: "/reference_poses/10_leaning_back_on_railing.jpg",
    description: "Balcony terrace posture with breezy lighting and relaxed royal demeanor."
  },
  {
    id: "seated-royal-chair",
    name: "Seated in ornate carved royal chair",
    category: "regal",
    imageUrl: "/reference_poses/13_seated_royal_armchair.jpg",
    description: "Queenly posture resting arms on carved wooden armrests, ideal for royal lookbooks."
  },
  {
    id: "leaning-table",
    name: "Leaning on a studio table",
    category: "seated",
    imageUrl: "/reference_poses/20_leaning_on_table.jpg",
    description: "Contemporary catalog posture leaning forward slightly on a minimal studio table."
  },
  {
    id: "seated-cross-legged",
    name: "Seated cross-legged on low platform",
    category: "regal",
    imageUrl: "/reference_poses/21_seated_cross_legged_diwan.jpg",
    description: "Traditional baithak posture showing off fabric drape puddling gracefully."
  },

  // Details & Close-ups
  {
    id: "close-portrait",
    name: "Close-up 3/4 bust portrait",
    category: "details",
    imageUrl: "/reference_poses/15_close_up_bust_portrait.jpg",
    description: "Focused bust-up crop emphasizing blouse necklines, jewellery pairing, and collar border."
  },
  {
    id: "adjusting-earring",
    name: "Hand gently touching earring / jhumka",
    category: "details",
    imageUrl: "/reference_poses/16_adjusting_earring_gesture.jpg",
    description: "Candid bridal gesture drawing natural attention to neckline, sleeve work, and ornaments."
  },
  {
    id: "hands-on-bangles",
    name: "Hands resting at waist adjusting bangles",
    category: "details",
    imageUrl: "/reference_poses/17_hands_at_waist_adjusting_bangles.jpg",
    description: "Perfect angle to show the waist tuck, pleat neatness, and sleeve embroidery."
  },
  {
    id: "high-angle-shot",
    name: "High angle, looking up at camera",
    category: "details",
    imageUrl: "/reference_poses/22_high_angle_looking_up.jpg",
    description: "Editorial high camera angle looking down softly as model looks up toward camera."
  },
  {
    id: "shy-blush",
    name: "Shy blush, hand near mouth",
    category: "details",
    imageUrl: "/reference_poses/23_shy_blush_hand_over_mouth.jpg",
    description: "Candid soft gesture with right hand held delicately near mouth with a joyful gentle smile."
  }
];

// -------------------------------------------------------------
// 4. 15 Curated Luxury Catalog Backgrounds
// -------------------------------------------------------------
export const PRESET_BACKGROUNDS: CatalogBackground[] = [
  // Heritage & Forts
  {
    id: "pastel-palace",
    name: "Pastel painted palace interior",
    category: "heritage",
    imageUrl: "/reference_backgrounds/01_pastel_palace_interior.jpg",
    description: "Soft mint and blush fresco walls with heritage arched corridors and polished marble."
  },
  {
    id: "rajasthani-fort",
    name: "Rajasthani fort, golden hour",
    category: "heritage",
    imageUrl: "/reference_backgrounds/02_rajasthani_fort_golden_hour.jpg",
    description: "Sun-drenched sandstone courtyards bathed in warm sunset hues and dramatic historic stone."
  },
  {
    id: "jaipur-stepwell",
    name: "Jaipur stepwell / baoli",
    category: "heritage",
    imageUrl: "/reference_backgrounds/11_jaipur_stepwell_baoli.jpg",
    description: "Geometrical stone staircases of historic Rajasthan stepwells, dramatic and editorial."
  },

  // Festive & Traditional Settings
  {
    id: "diya-courtyard",
    name: "Evening courtyard lit with brass diyas",
    category: "festive",
    imageUrl: "/reference_backgrounds/13_diya_courtyard_twilight.jpg",
    description: "Magical twilight atmosphere with warm flickering brass oil lamps and soft golden glows."
  },

  // Modern & Minimalist Studio
  {
    id: "studio-neutral",
    name: "Neutral studio backdrop (Warm Beige)",
    category: "studio",
    imageUrl: "/reference_backgrounds/10_neutral_studio_backdrop.jpg",
    description: "Clean warm beige cyclorama wall with soft commercial diffused studio light. 100% fabric focus."
  },

  // Gardens & Nature
  {
    id: "green-garden",
    name: "Lush green garden estate",
    category: "gardens",
    imageUrl: "/reference_backgrounds/05_lush_green_estate_garden.jpg",
    description: "Manicured estate lawn with blooming jasmine, tropical foliage, and natural daylight."
  },
  {
    id: "colonial-balcony",
    name: "Colonial garden balcony with bougainvillea",
    category: "gardens",
    imageUrl: "/reference_backgrounds/06_colonial_garden_balcony.jpg",
    description: "White balustrade balcony overflowing with magenta bougainvillea vines and morning sunlight."
  },
  {
    id: "sunlit-villa",
    name: "Sunlit villa garden, golden hour",
    category: "gardens",
    imageUrl: "/reference_backgrounds/07_sunlit_villa_garden.jpg",
    description: "Luxury villa stone courtyard bathed in rich amber evening backlight."
  },
  {
    id: "veranda-curtains",
    name: "Veranda with sheer breezy curtains",
    category: "gardens",
    imageUrl: "/reference_backgrounds/08_veranda_sheer_curtains.jpg",
    description: "Airy colonnade with translucent sheer white drapes moving softly in the gentle wind."
  },
  {
    id: "desert-sunset-dunes",
    name: "Golden Thar desert sand dunes",
    category: "gardens",
    imageUrl: "/reference_backgrounds/12_golden_thar_desert_dunes.jpg",
    description: "Dramatic rippled golden sand dunes under an amber and purple twilight sky."
  },

  // Luxury Interiors & Architecture
  {
    id: "baroque-hall",
    name: "Grand baroque marble hall",
    category: "luxury_interiors",
    imageUrl: "/reference_backgrounds/03_grand_baroque_marble_hall.jpg",
    description: "Opulent European and Indo-Saracenic grandeur with gilded pillars and reflective floors."
  },
  {
    id: "heritage-room",
    name: "Chandelier heritage room",
    category: "luxury_interiors",
    imageUrl: "/reference_backgrounds/04_chandelier_heritage_room.jpg",
    description: "Intimate regal room featuring crystal chandeliers, warm teak furniture, and Persian rugs."
  },
  {
    id: "vintage-car",
    name: "Vintage car & heritage portico",
    category: "luxury_interiors",
    imageUrl: "/reference_backgrounds/09_vintage_car_portico.jpg",
    description: "Cream classic vintage car parked under a grand heritage mansion driveway arch."
  },
  {
    id: "warm-library",
    name: "Warm royal library with mahogany wood",
    category: "luxury_interiors",
    imageUrl: "/reference_backgrounds/14_warm_royal_library.jpg",
    description: "Rich mahogany bookshelves, vintage leather binding, and warm amber banker lamps."
  },
  {
    id: "penthouse-skyline",
    name: "Modern luxury penthouse city view",
    category: "luxury_interiors",
    imageUrl: "/reference_backgrounds/15_modern_penthouse_skyline.jpg",
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
  // 1. Studio & High-Fidelity Catalog (Best for E-Commerce Listings) - 5 Shoots
  {
    id: "shoot_06_earthy_studio",
    title: "Earthy Minimalist Studio",
    category: "studio",
    imageUrl: "/reference_shoots/studio_01_earthy_minimalist.jpg",
    modelPersona: "Contemporary High-Fashion Model with silver chandbali earrings",
    settingTitle: "Mottled Terracotta & Taupe Studio Cyclorama with Brass Stool",
    lighting: "Directional soft studio key light with subtle rim",
    poseDescription: "Upright standing posture, clean mottled background, visible waist pleats, and clear pallu fall",
    badge: "High-Fashion"
  },
  {
    id: "shoot_20_studio_pedestal",
    title: "Minimalist Beige Pedestal Studio",
    category: "studio",
    imageUrl: "/reference_shoots/studio_03_beige_pedestal.jpg",
    modelPersona: "Contemporary High-Street Fashion Model with minimal makeup",
    settingTitle: "Seamless Warm Sand Cyclorama with Fluted Plaster Column",
    lighting: "Clean diffuse softbox key lighting with pure color rendition",
    poseDescription: "Standard upright e-commerce catalog stance; drape, pleats, and border unobstructed",
    badge: "E-Commerce"
  },
  {
    id: "shoot_07_couture_teal",
    title: "Haute Couture Studio S-Curve",
    category: "studio",
    imageUrl: "/reference_shoots/studio_02_couture_teal.jpg",
    modelPersona: "Striking Couture Editorial Model with bold lip",
    settingTitle: "Deep Midnight Teal Studio Backdrop with Sculpted Floor Shadows",
    lighting: "Sculpted key lighting with sharp rim highlights",
    poseDescription: "Modern ready-to-wear silhouette on clean backdrop; ideal for designer, lycra, or cocktail party sarees",
    badge: "Couture"
  },
  {
    id: "shoot_21_studio_high_key",
    title: "Clean Studio High-Key Lighting",
    category: "studio",
    imageUrl: "/reference_shoots/studio_04_high_key.jpg",
    modelPersona: "Modern Commercial Catalog Model with confident gaze",
    settingTitle: "Clean Studio Set with Balanced Fill & Soft Shadows",
    lighting: "Clean studio lighting for shimmer, sequin, and partywear sarees",
    poseDescription: "Direct front catalog pose, perfect for e-commerce listings",
    badge: "Catalog Front"
  },
  {
    id: "shoot_22_studio_blue_canvas",
    title: "Deep Blue Textured Studio Backdrop",
    category: "studio",
    imageUrl: "/reference_shoots/studio_05_deep_blue_canvas.jpg",
    modelPersona: "Glamorous Indian Model with voluminous dark curls",
    settingTitle: "Textured Navy & Royal Blue Painted Canvas Studio Backdrop",
    lighting: "Crisp studio portrait lighting with glowing skin tone",
    poseDescription: "Crucial back-view reference showing blouse cut, back waist tuck, and pallu trail",
    badge: "Back & Pallu View"
  },

  // 2. Heritage & Palace Architecture (Best for Festive & Bridal Collections) - 4 Shoots
  {
    id: "shoot_01_heritage_doorway",
    title: "Heritage Haveli Carved Doorway",
    category: "heritage",
    imageUrl: "/reference_shoots/heritage_01_haveli_doorway.jpg",
    modelPersona: "North Indian Bridal Model, bold red lips, elegant wavy hair",
    settingTitle: "Carved Rajasthani Wooden Doorway with Brass Bells & Diyas",
    lighting: "Warm natural daylight with architectural stone shadows",
    poseDescription: "Classic carved entryway framing; ideal for heavy Banarasi, Kanjeevaram, and wedding silks",
    badge: "Most Popular"
  },
  {
    id: "shoot_03_jaipur_archway",
    title: "Jaipur Palace Archway Walking",
    category: "heritage",
    imageUrl: "/reference_shoots/heritage_02_jaipur_archway.jpg",
    modelPersona: "Graceful High-Fashion Model with silver payal anklets",
    settingTitle: "Distressed Turquoise Haveli Frame overlooking Mountain Fort",
    lighting: "Soft morning sunlight streaming through open archway",
    poseDescription: "Editorial walking motion through architectural doors; best for Chanderi, linen, and handloom silks",
    badge: "Walking Motion"
  },
  {
    id: "shoot_19_jharokha_urli",
    title: "Jharokha Archway & Urli Flowers",
    category: "heritage",
    imageUrl: "/reference_shoots/temple_04_jharokha_urli.jpg",
    modelPersona: "Radiant Indian Bride with traditional jhumkas",
    settingTitle: "Symmetrical carved archway with brass urlis and floral elements",
    lighting: "Warm ambient glow with hanging brass diyas",
    poseDescription: "Standing inside carved archway surrounded by white jasmine flowers",
    badge: "Banarasi Special"
  },
  {
    id: "shoot_17_terrace_balcony",
    title: "Heritage Balcony Moody Spotlight",
    category: "heritage",
    imageUrl: "/reference_shoots/terrace_01_balcony_spotlight.jpg",
    modelPersona: "Classical Banarasi Model with jhumkas",
    settingTitle: "Antique Heritage Mansion Balcony with Wrought-Iron Railing",
    lighting: "High-contrast dramatic spotlight on an antique balcony; rich editorial feel",
    poseDescription: "Standing against ornate wrought-iron railing with dramatic gaze",
    badge: "Moody Couture"
  },

  // 3. Traditional Temple & Floor Drapes (Best for Border & Pallu Showcases) - 3 Shoots
  {
    id: "shoot_08_temple_steps",
    title: "South Indian Temple Stone Steps",
    category: "festive_temple",
    imageUrl: "/reference_shoots/temple_02_stone_steps.jpg",
    modelPersona: "Kanjeevaram Temple Bride with jasmine gajra hair styling",
    settingTitle: "Ancient Granite Temple Pillars & Weathered Stone Steps",
    lighting: "Warm low-angle sun flare grazing the temple cornice",
    poseDescription: "Saree pallu spread down stone temple steps; excellent for wide borders and intricate pallu motifs",
    badge: "Cascading Pallu"
  },
  {
    id: "shoot_09_temple_marigolds",
    title: "Seated Pooja Sanctuary & Marigolds",
    category: "festive_temple",
    imageUrl: "/reference_shoots/temple_03_pooja_marigolds.jpg",
    modelPersona: "Dusky South Indian Classical Model with temple jewelry & bindi",
    settingTitle: "Carved Teakwood Wall & Temple Steps with Fresh Yellow Marigolds",
    lighting: "Warm festive temple sanctuary glow",
    poseDescription: "Grounded seating posture surrounded by marigolds and brassware; ideal for festive/Pooja marketing",
    badge: "Temple Silks"
  },
  {
    id: "shoot_18_terrace_sunset",
    title: "Palace Rooftop Floor Sunset",
    category: "festive_temple",
    imageUrl: "/reference_shoots/terrace_02_palace_rooftop_sunset.jpg",
    modelPersona: "Sophisticated Modern Indian Woman with gold studs",
    settingTitle: "Open Palace Terrace Floor with Ambient Lighting",
    lighting: "Ambient golden dusk light displaying silk sheen",
    poseDescription: "Relaxed seated floor pose with ambient lighting; displays silk fabric sheen and spread-out border work",
    badge: "Spread Border"
  },

  // 4. Outdoor & Botanical Daylight (Best for Casual, Cotton, & Printed Sarees) - 4 Shoots
  {
    id: "shoot_28_tropical_canopy",
    title: "Tropical Lawn & Dappled Canopy",
    category: "garden",
    imageUrl: "/reference_shoots/garden_05_tropical_canopy.jpg",
    modelPersona: "Traditional South Indian Model with neat hair bun & temple pendant",
    settingTitle: "Lush Tropical Lawn with Palm Trees & Dappled Sunlight",
    lighting: "Diffuse natural light under lush greenery; clean drape representation with zero color tinting",
    poseDescription: "Full-length stance holding pallu corner open displaying border",
    badge: "Border Display"
  },
  {
    id: "shoot_16_sandstone_courtyard",
    title: "Sandstone Courtyard & Lily Pond",
    category: "garden",
    imageUrl: "/reference_shoots/heritage_07_sandstone_courtyard.jpg",
    modelPersona: "Classic Indian Model with neat braided hair and red tilak",
    settingTitle: "Sandstone Architecture overlooking Lily Pond",
    lighting: "Brilliant natural daylight with reflection highlights",
    poseDescription: "Editorial boat on lily pond; high aspirational value for brand campaigns",
    badge: "Aspirational"
  },
  {
    id: "shoot_11_mustard_meadow",
    title: "Mustard Blossom Meadow",
    category: "garden",
    imageUrl: "/reference_shoots/garden_02_mustard_meadow.jpg",
    modelPersona: "Poised Indian Woman with traditional alta on hands",
    settingTitle: "Blooming Yellow Mustard Flower Field under Open Daylight",
    lighting: "High-key outdoor daylight with vibrant floral contrast",
    poseDescription: "Upright standing posture with hands clasped in flower field",
    badge: "Natural Daylight"
  },
  {
    id: "shoot_10_garden_morning",
    title: "Morning Sun Botanical Garden",
    category: "garden",
    imageUrl: "/reference_shoots/garden_01_morning_sun.jpg",
    modelPersona: "Warm Approachable Indian Woman with radiant natural smile",
    settingTitle: "Botanical Garden with Soft Greenery Bokeh & Natural Morning Flare",
    lighting: "Dappled morning sunlight filtering through garden foliage",
    poseDescription: "Medium-close portrait angle for blouse detailing and neck jewelry",
    badge: "Flagship Choice"
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

