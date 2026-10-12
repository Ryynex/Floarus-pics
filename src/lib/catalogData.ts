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

export interface CatalogFabric {
  id: string;
  name: string;
  category: "auto" | "silks" | "sheers" | "cottons" | "luxe";
  categoryLabel: string;
  description: string;
  drapePhysics: string;
  badge?: string;
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

/**
 * Hard maximum number of garment/fabric reference images accepted per generation.
 *
 * Enforced in three places that must stay in sync:
 *  - client upload slots + payload (`GenerateWorkspace`, `MagicModeWorkspace`)
 *  - server-side input clamp in `/api/generate`
 *  - the magic-mode reference list cap (pose + face + background + garments)
 *
 * Lowering this reduces Fal input megapixels and reference-competition between
 * fabrics, which sharpens garment fidelity at the cost of coverage.
 */
export const MAX_GARMENT_REFERENCES = 3;

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
  selectedFabric?: CatalogFabric;
  outfitType?: string;
  customStylingNotes?: string;
  outputUrl?: string | null;
  recentGenerations?: string[];
}

const MAGIC_PREFERENCES_KEY = "florus_saved_magic_preferences";

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
  selectedFabric?: CatalogFabric;
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

// Global helper for persisting and syncing selected fabric across the browser
const FABRIC_PREFERENCE_KEY = "florus_saved_fabric_preference";

export function getSavedFabricPreference(): CatalogFabric {
  if (typeof window === "undefined") return PRESET_FABRICS[0];
  try {
    const raw = localStorage.getItem(FABRIC_PREFERENCE_KEY);
    return raw ? JSON.parse(raw) : PRESET_FABRICS[0];
  } catch (e) {
    console.error("Failed to load fabric preference:", e);
    return PRESET_FABRICS[0];
  }
}

export function saveFabricPreference(fabric: CatalogFabric): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FABRIC_PREFERENCE_KEY, JSON.stringify(fabric));
  } catch (e) {
    console.error("Failed to save fabric preference:", e);
  }
}

// -------------------------------------------------------------
// 3. 38 Curated Catalog Poses
// -------------------------------------------------------------
export const PRESET_POSES: CatalogPose[] = [
  {
    "id": "fs-1",
    "name": "Studio Editorial Standing — FS1",
    "category": "standing",
    "imageUrl": "/reference_poses/FS1.jpg",
    "description": "Full length studio stance showing front pleats, pallu drape, and clean silhouette."
  },
  {
    "id": "fs-4",
    "name": "Studio Clean Frontal — FS4",
    "category": "standing",
    "imageUrl": "/reference_poses/FS4.jpg",
    "description": "Clean straight-to-camera studio posture ideal for catalog showcase."
  },
  {
    "id": "fs-5",
    "name": "Studio Confident Stance — FS5",
    "category": "standing",
    "imageUrl": "/reference_poses/FS5.jpg",
    "description": "Confident poised standing pose emphasizing shoulder drape and waistline."
  },
  {
    "id": "fs-6",
    "name": "Studio Three-Quarter Profile — FS6",
    "category": "standing",
    "imageUrl": "/reference_poses/FS6.jpg",
    "description": "Editorial 45-degree angle displaying drape flow and border relief."
  },
  {
    "id": "fs-7",
    "name": "Studio Fluid Stride — FS7",
    "category": "motion",
    "imageUrl": "/reference_poses/FS7.jpg",
    "description": "Subtle runway step capturing pleat movement and fabric flow."
  },
  {
    "id": "fs-8",
    "name": "Studio Regal Silhouette — FS8",
    "category": "regal",
    "imageUrl": "/reference_poses/FS8.jpg",
    "description": "Poised royal standing posture for high-end boutique lookbooks."
  },
  {
    "id": "pose-p1",
    "name": "Poised Hand on Waist — P1",
    "category": "standing",
    "imageUrl": "/reference_poses/P1.jpg",
    "description": "Classic hand on waist stance highlighting side fall and blouse cut."
  },
  {
    "id": "pose-p2",
    "name": "Gentle Pallu Hold — P2",
    "category": "standing",
    "imageUrl": "/reference_poses/P2.jpg",
    "description": "Delicately lifting pallu border to present intricate zari work."
  },
  {
    "id": "pose-p3",
    "name": "Relaxed Studio Lean — P3",
    "category": "standing",
    "imageUrl": "/reference_poses/P3.jpg",
    "description": "Natural leaning posture giving casual yet elegant appeal."
  },
  {
    "id": "pose-p4",
    "name": "Front Pleat Presentation — P4",
    "category": "standing",
    "imageUrl": "/reference_poses/P4.jpg",
    "description": "Focused frontal stance ensuring crisp visibility of lower pleats."
  },
  {
    "id": "pose-p5",
    "name": "Graceful Walking Motion — P5",
    "category": "motion",
    "imageUrl": "/reference_poses/P5.jpg",
    "description": "Windswept stride capturing dynamic movement and hemline flare."
  },
  {
    "id": "pose-p6",
    "name": "Turn Looking Back — P6",
    "category": "motion",
    "imageUrl": "/reference_poses/P6.jpg",
    "description": "Looking over shoulder showing blouse back design and long pallu fall."
  },
  {
    "id": "pose-p7",
    "name": "Dynamic Fluid Turn — P7",
    "category": "motion",
    "imageUrl": "/reference_poses/P7.jpg",
    "description": "Fluid mid-turn capturing garment swing and light reflection."
  },
  {
    "id": "pose-p8",
    "name": "Gentle Breeze Stride — P8",
    "category": "motion",
    "imageUrl": "/reference_poses/P8.jpg",
    "description": "Walking posture with gentle breeze effect on sheer pallu."
  },
  {
    "id": "pose-p9",
    "name": "Side Profile Elegance — P9",
    "category": "standing",
    "imageUrl": "/reference_poses/P9.jpg",
    "description": "Graceful 90-degree lateral profile highlighting posture and border."
  },
  {
    "id": "pose-p10",
    "name": "Both Hands Clasped — P10",
    "category": "standing",
    "imageUrl": "/reference_poses/P10.jpg",
    "description": "Hands held together in front, drawing focus to bangles and rings."
  },
  {
    "id": "pose-p11",
    "name": "Hand at Shoulder Pin — P11",
    "category": "standing",
    "imageUrl": "/reference_poses/P11.jpg",
    "description": "Drawing attention toward neckline craft, shoulder brooch, and blouse."
  },
  {
    "id": "pose-p12",
    "name": "Subtle Diagonal Stance — P12",
    "category": "standing",
    "imageUrl": "/reference_poses/P12.jpg",
    "description": "Modern diagonal catalogue stance optimizing depth and lighting."
  },
  {
    "id": "pose-p13",
    "name": "Editorial Lookbook Stance — P13",
    "category": "standing",
    "imageUrl": "/reference_poses/P13.jpg",
    "description": "High-fashion minimalist posture tailored for luxury retail banners."
  },
  {
    "id": "pose-p19",
    "name": "Seated on Floor Steps — P19",
    "category": "seated",
    "imageUrl": "/reference_poses/P19.jpg",
    "description": "Fanning out the heavy saree border across floor steps."
  },
  {
    "id": "pose-p20",
    "name": "Seated on Regal Divan — P20",
    "category": "seated",
    "imageUrl": "/reference_poses/P20.jpg",
    "description": "Comfortable seated posture on traditional platform or bench."
  },
  {
    "id": "pose-p21",
    "name": "Seated Studio Chair — P21",
    "category": "seated",
    "imageUrl": "/reference_poses/P21.jpg",
    "description": "Contemporary chair seating showing thigh drape and border."
  },
  {
    "id": "pose-p22",
    "name": "Resting on Armrest — P22",
    "category": "seated",
    "imageUrl": "/reference_poses/P22.jpg",
    "description": "Arm resting naturally on chair armrest with gentle relaxed smile."
  },
  {
    "id": "pose-p23",
    "name": "Low Baithak Seated — P23",
    "category": "seated",
    "imageUrl": "/reference_poses/P23.jpg",
    "description": "Traditional cross-legged baithak arrangement showcasing fabric folds."
  },
  {
    "id": "pose-p24",
    "name": "Seated Cross-Legged Poise — P24",
    "category": "seated",
    "imageUrl": "/reference_poses/P24.jpg",
    "description": "Graceful ground seated pose with pallu spread artfully."
  },
  {
    "id": "pose-p25",
    "name": "Royal Throne Posture — P25",
    "category": "regal",
    "imageUrl": "/reference_poses/P25.jpg",
    "description": "Imposing royal posture suited for heavy bridal silks and kanchipuram."
  },
  {
    "id": "pose-p26",
    "name": "Queenly Palace Presence — P26",
    "category": "regal",
    "imageUrl": "/reference_poses/P26.jpg",
    "description": "Stately posture communicating royal heritage and timeless elegance."
  },
  {
    "id": "pose-p27",
    "name": "Heritage Court Posture — P27",
    "category": "regal",
    "imageUrl": "/reference_poses/P27.jpg",
    "description": "Dignified poise resting hand lightly on carved pillar or rail."
  },
  {
    "id": "pose-p28",
    "name": "Aristocratic Stature — P28",
    "category": "regal",
    "imageUrl": "/reference_poses/P28.jpg",
    "description": "Tall commanding stance with expansive drape and calm expression."
  },
  {
    "id": "pose-p29",
    "name": "Royal Heritage Poise — P29",
    "category": "regal",
    "imageUrl": "/reference_poses/P29.jpg",
    "description": "Opulent stance balancing drape fullness with poise."
  },
  {
    "id": "pose-p30",
    "name": "Close-up Jewellery Focus — P30",
    "category": "details",
    "imageUrl": "/reference_poses/P30.jpg",
    "description": "Bust-level framing highlighting necklace, earrings, and blouse neck."
  },
  {
    "id": "pose-p31",
    "name": "Touching Earring Gesture — P31",
    "category": "details",
    "imageUrl": "/reference_poses/P31.jpg",
    "description": "Candid bridal gesture touching ear ornament with subtle smile."
  },
  {
    "id": "pose-p32",
    "name": "Adjusting Bangle at Wrist — P32",
    "category": "details",
    "imageUrl": "/reference_poses/P32.jpg",
    "description": "Hands at waist level adjusting bangles, highlighting sleeve motifs."
  },
  {
    "id": "pose-p33",
    "name": "Delicate Collar Touch — P33",
    "category": "details",
    "imageUrl": "/reference_poses/P33.jpg",
    "description": "Hand near collarbone showing choker necklace and zari embroidery."
  },
  {
    "id": "pose-p34",
    "name": "High Angle Gaze — P34",
    "category": "details",
    "imageUrl": "/reference_poses/P34.jpg",
    "description": "Editorial camera angle capturing facial features and head drape."
  },
  {
    "id": "pose-p35",
    "name": "Candid Shy Blush — P35",
    "category": "details",
    "imageUrl": "/reference_poses/P35.jpg",
    "description": "Gentle shy candid expression holding drape tip near cheek."
  },
  {
    "id": "pose-p36",
    "name": "Close Portrait Profile — P36",
    "category": "details",
    "imageUrl": "/reference_poses/P36.jpg",
    "description": "Tight beauty portrait framing eye makeup, maang tikka, and border."
  },
  {
    "id": "pose-p37",
    "name": "Intricate Drape Detail — P37",
    "category": "details",
    "imageUrl": "/reference_poses/P37.jpg",
    "description": "Torso-level close-up displaying weave precision, zari, and pleats."
  }
];

// -------------------------------------------------------------
// 4. 61 Curated Luxury Catalog Backgrounds
// -------------------------------------------------------------
export const PRESET_BACKGROUNDS: CatalogBackground[] = [
  {
    "id": "bg-b1",
    "name": "Minimal Studio Setting — B1",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B1.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b2",
    "name": "Minimal Studio Setting — B2",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B2.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b3",
    "name": "Minimal Studio Setting — B3",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B3.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b4",
    "name": "Minimal Studio Setting — B4",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B4.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b5",
    "name": "Minimal Studio Setting — B5",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B5.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b6",
    "name": "Minimal Studio Setting — B6",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B6.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b7",
    "name": "Minimal Studio Setting — B7",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B7.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b8",
    "name": "Minimal Studio Setting — B8",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B8.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b9",
    "name": "Minimal Studio Setting — B9",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B9.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b10",
    "name": "Minimal Studio Setting — B10",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B10.jpg",
    "description": "Clean modern cyclorama studio backdrop with neutral diffused fashion lighting."
  },
  {
    "id": "bg-b11",
    "name": "Heritage Palace Corridor — B11",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B11.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b12",
    "name": "Heritage Palace Corridor — B12",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B12.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b13",
    "name": "Heritage Palace Corridor — B13",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B13.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b14",
    "name": "Heritage Palace Corridor — B14",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B14.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b15",
    "name": "Heritage Palace Corridor — B15",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B15.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b16",
    "name": "Heritage Palace Corridor — B16",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B16.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b17",
    "name": "Heritage Palace Corridor — B17",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B17.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b18",
    "name": "Heritage Palace Corridor — B18",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B18.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b19",
    "name": "Heritage Palace Corridor — B19",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B19.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b20",
    "name": "Heritage Palace Corridor — B20",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B20.jpg",
    "description": "Historical carved pillars, stone archways, and warm regal architectural ambient."
  },
  {
    "id": "bg-b21",
    "name": "Opulent Luxury Salon — B21",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B21.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b22",
    "name": "Opulent Luxury Salon — B22",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B22.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b23",
    "name": "Opulent Luxury Salon — B23",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B23.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b24",
    "name": "Opulent Luxury Salon — B24",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B24.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b25",
    "name": "Opulent Luxury Salon — B25",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B25.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b26",
    "name": "Opulent Luxury Salon — B26",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B26.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b27",
    "name": "Opulent Luxury Salon — B27",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B27.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b28",
    "name": "Opulent Luxury Salon — B28",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B28.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b29",
    "name": "Opulent Luxury Salon — B29",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B29.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b30",
    "name": "Opulent Luxury Salon — B30",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B30.jpg",
    "description": "Grand interior setting with marble finishes, chandeliers, and high-fashion aesthetic."
  },
  {
    "id": "bg-b31",
    "name": "Festive Courtyard Ambiance — B31",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B31.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b32",
    "name": "Festive Courtyard Ambiance — B32",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B32.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b33",
    "name": "Festive Courtyard Ambiance — B33",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B33.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b34",
    "name": "Festive Courtyard Ambiance — B34",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B34.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b35",
    "name": "Festive Courtyard Ambiance — B35",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B35.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b36",
    "name": "Festive Courtyard Ambiance — B36",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B36.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b37",
    "name": "Festive Courtyard Ambiance — B37",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B37.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b38",
    "name": "Festive Courtyard Ambiance — B38",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B38.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b39",
    "name": "Festive Courtyard Ambiance — B39",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B39.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b40",
    "name": "Festive Courtyard Ambiance — B40",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B40.jpg",
    "description": "Warm atmospheric twilight setting with celebratory lighting and golden glows."
  },
  {
    "id": "bg-b46",
    "name": "Estate Garden Veranda — B46",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B46.jpg",
    "description": "Sunlit outdoor flora, lush botanical greenery, and serene natural ambiance."
  },
  {
    "id": "bg-b48",
    "name": "Estate Garden Veranda — B48",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B48.jpg",
    "description": "Sunlit outdoor flora, lush botanical greenery, and serene natural ambiance."
  },
  {
    "id": "bg-b49",
    "name": "Estate Garden Veranda — B49",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B49.jpg",
    "description": "Sunlit outdoor flora, lush botanical greenery, and serene natural ambiance."
  },
  {
    "id": "bg-u2e4fb22b",
    "name": "Signature Atelier Setting — U2e4fb22b",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/U2e4fb22b.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u3d6f9c25",
    "name": "Signature Atelier Setting — U3d6f9c25",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/U3d6f9c25.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u4bbc2a14",
    "name": "Signature Atelier Setting — U4bbc2a14",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/U4bbc2a14.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u7ee3d1f0",
    "name": "Signature Atelier Setting — U7ee3d1f0",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/U7ee3d1f0.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u44c828d4",
    "name": "Signature Atelier Setting — U44c828d4",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/U44c828d4.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u67a244c7",
    "name": "Signature Atelier Setting — U67a244c7",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/U67a244c7.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u486f139f",
    "name": "Signature Atelier Setting — U486f139f",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/U486f139f.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u2607fe8f",
    "name": "Signature Atelier Setting — U2607fe8f",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/U2607fe8f.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u3718a1ee",
    "name": "Signature Atelier Setting — U3718a1ee",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/U3718a1ee.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u6816b726",
    "name": "Signature Atelier Setting — U6816b726",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/U6816b726.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-u971784e7",
    "name": "Signature Atelier Setting — U971784e7",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/U971784e7.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-ua2c0f716",
    "name": "Signature Atelier Setting — Ua2c0f716",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/Ua2c0f716.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-ua899c079",
    "name": "Signature Atelier Setting — Ua899c079",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/Ua899c079.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-uabb9390e",
    "name": "Signature Atelier Setting — Uabb9390e",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/Uabb9390e.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-uc18d4988",
    "name": "Signature Atelier Setting — Uc18d4988",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/Uc18d4988.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-ud4226230",
    "name": "Signature Atelier Setting — Ud4226230",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/Ud4226230.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-uf0c8920c",
    "name": "Signature Atelier Setting — Uf0c8920c",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/Uf0c8920c.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  },
  {
    "id": "bg-uf3022a1f",
    "name": "Signature Atelier Setting — Uf3022a1f",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/Uf3022a1f.jpg",
    "description": "Ultra high-resolution curated editorial background with cinematic depth of field."
  }
];

export function getSavedMagicPreferences(): SavedMagicPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MAGIC_PREFERENCES_KEY);
    if (!raw) return null;
    const prefs: SavedMagicPreferences = JSON.parse(raw);

    // Auto-heal Pose: verify against current PRESET_POSES
    if (prefs.selectedPose) {
      if (prefs.selectedPose.id !== "custom") {
        const found = PRESET_POSES.find(
          (p) => p.id === prefs.selectedPose?.id || p.imageUrl === prefs.selectedPose?.imageUrl
        );
        prefs.selectedPose = found || PRESET_POSES[0];
      }
    } else {
      prefs.selectedPose = PRESET_POSES[0];
    }

    // Auto-heal Background: verify against current PRESET_BACKGROUNDS
    if (prefs.selectedBackground) {
      if (prefs.selectedBackground.id !== "custom") {
        const found = PRESET_BACKGROUNDS.find(
          (b) => b.id === prefs.selectedBackground?.id || b.imageUrl === prefs.selectedBackground?.imageUrl
        );
        prefs.selectedBackground = found || PRESET_BACKGROUNDS[0];
      }
    } else {
      prefs.selectedBackground = PRESET_BACKGROUNDS[0];
    }

    // Also heal model if invalid
    if (prefs.selectedModel && prefs.selectedModel.category !== "custom") {
      const foundModel = PRESET_MODELS.find(
        (m) => m.id === prefs.selectedModel?.id || m.imageUrl === prefs.selectedModel?.imageUrl
      );
      if (foundModel) {
        prefs.selectedModel = foundModel;
      }
    }

    // Persist healed preferences back to localStorage so stale URLs never get reused
    localStorage.setItem(MAGIC_PREFERENCES_KEY, JSON.stringify(prefs));

    return prefs;
  } catch (e) {
    console.error("Failed to load magic workspace preferences:", e);
    return null;
  }
}

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
// 8. 15 Main Saree & Ethnic Garment Fabrics (Physical Drape & Luster Conditioning)
// -------------------------------------------------------------
export const PRESET_FABRICS: CatalogFabric[] = [
  // 0. AI Vision Auto-Detect (Default)
  {
    id: "auto-detect",
    name: "Auto-Detect from Photo (Default)",
    category: "auto",
    categoryLabel: "AI Vision Auto-Detect",
    description: "Flux 2 Pro analyzes and detects the exact authentic fabric weave, sheen, weight & drape physics directly from your garment photo.",
    drapePhysics: "authentic fabric detected directly from the garment reference photo: mirror the exact physical weave density, surface luster, thread texture, translucency, and natural drape weight seen in the photo",
    badge: "AI Default",
    isCustom: false
  },

  // 1. Silks & Brocades (5 Fabrics)
  {
    id: "kanjeevaram-silk",
    name: "Kanjeevaram Silk",
    category: "silks",
    categoryLabel: "Silks & Brocades",
    description: "Heavy South Indian pure silk with authentic gold zari border relief and structured pleats",
    drapePhysics: "heavy, structured mulberry silk with crisp pleated drape, stiff pallu fall, and luminous gold zari relief",
    badge: "Royal Weave"
  },
  {
    id: "banarasi-brocade-silk",
    name: "Banarasi Brocade Silk",
    category: "silks",
    categoryLabel: "Silks & Brocades",
    description: "Opulent North Indian silk embossed with metallic floral kadwa motifs and regal luster",
    drapePhysics: "dense, opulent brocade silk with firm structural pleating, embossed metallic gold floral motifs, and rich royal luster",
    badge: "Bridal Classic"
  },
  {
    id: "pure-mulberry-silk",
    name: "Pure Mulberry Silk",
    category: "silks",
    categoryLabel: "Silks & Brocades",
    description: "Ultra-smooth natural silk with liquid sheen, organic thread weave, and fluid graceful fall",
    drapePhysics: "ultra-smooth pure silk with natural directional sheen, fluid graceful drape, and authentic organic thread weave"
  },
  {
    id: "tussar-wild-silk",
    name: "Tussar Silk (Wild Kosa)",
    category: "silks",
    categoryLabel: "Silks & Brocades",
    description: "Handspun textured wild silk with natural honey-gold slub sheen and dignified drape",
    drapePhysics: "textured wild tussar silk with distinct tactile slub thread grain, earthy matte luster, and crisp dignified drape"
  },
  {
    id: "chanderi-silk-cotton",
    name: "Chanderi Silk-Cotton",
    category: "silks",
    categoryLabel: "Silks & Brocades",
    description: "Featherlight sheer gossamer weave with subtle sheen and delicate gold woven butties",
    drapePhysics: "featherlight sheer silk-cotton blend with subtle gossamer sheen, semi-translucent airy drape, and delicate gold woven butties"
  },

  // 2. Sheers & Flowy (5 Fabrics)
  {
    id: "pure-chiffon",
    name: "Pure Chiffon",
    category: "sheers",
    categoryLabel: "Sheers & Flowy",
    description: "Whisper-light, semi-sheer fabric with soft cascading liquid drapes hugging body curves",
    drapePhysics: "airy, semi-sheer chiffon with gossamer lightness, delicate micro-texture, and soft fluid cascading drape hugging body curves",
    badge: "Flowy & Light"
  },
  {
    id: "flowing-georgette",
    name: "Flowing Georgette",
    category: "sheers",
    categoryLabel: "Sheers & Flowy",
    description: "Bouncy pebble-grain crinkled fabric with graceful drape and fluid body-contouring pleats",
    drapePhysics: "textured pebble-grain georgette with subtle crepe elasticity, bouncy drape, and fluid pleating that contours gracefully"
  },
  {
    id: "crisp-organza",
    name: "Crisp Organza",
    category: "sheers",
    categoryLabel: "Sheers & Flowy",
    description: "Stiff sheer fabric with crystalline glass sheen and voluminous billowing pleated flares",
    drapePhysics: "crisp, semi-translucent sheer organza with glassy crystalline sheen, structured airy volume, and billowing pleated flare",
    badge: "Trending"
  },
  {
    id: "tissue-silk",
    name: "Tissue Silk",
    category: "sheers",
    categoryLabel: "Sheers & Flowy",
    description: "Ultra-fine metallic woven yarn with shimmering glass-like reflections and crisp drape",
    drapePhysics: "iridescent metallic tissue silk woven with gold and silver threads, glassy metallic highlights, and semi-crisp reflective drape"
  },
  {
    id: "delicate-net",
    name: "Delicate Net / Tulle",
    category: "sheers",
    categoryLabel: "Sheers & Flowy",
    description: "Fine hexagonal sheer mesh fabric with airy volume for cocktail and evening drapes",
    drapePhysics: "fine hexagonal sheer net mesh with delicate airy volume, sheer transparency, and ethereal evening drape"
  },

  // 3. Cottons & Linens (2 Fabrics)
  {
    id: "pure-handloom-cotton",
    name: "Pure Handloom Cotton (Mulmul)",
    category: "cottons",
    categoryLabel: "Cottons & Linens",
    description: "Ultra-soft breathable cotton with matte organic thread texture and relaxed natural folds",
    drapePhysics: "soft, breathable handloom cotton with matte finish, visible authentic organic warp and weft yarn weave, and relaxed natural folds",
    badge: "Breathable"
  },
  {
    id: "crisp-pure-linen",
    name: "Crisp Pure Linen",
    category: "cottons",
    categoryLabel: "Cottons & Linens",
    description: "Earthy textured flax weave with distinct cross-hatch slub and relaxed contemporary silhouette",
    drapePhysics: "pure natural flax linen with distinctive slub cross-hatch weave, matte earthy texture, and crisp contemporary drape"
  },

  // 4. Luxe & Heavy Drapes (3 Fabrics)
  {
    id: "pure-crepe-silk",
    name: "Pure Crepe / Crepe Silk",
    category: "luxe",
    categoryLabel: "Luxe & Drape",
    description: "Subtle pebbled matte surface with liquid-like cascading fall and heavy zero-stiffness pleats",
    drapePhysics: "pebble-textured pure silk crepe with fluid liquid drape, weighty falling pleats, and zero-stiffness contouring"
  },
  {
    id: "glossy-satin",
    name: "Glossy Satin",
    category: "luxe",
    categoryLabel: "Luxe & Drape",
    description: "Mirror-smooth liquid sheen with high-contrast radiant drape folds and shimmering highlights",
    drapePhysics: "liquid-smooth satin with radiant high-gloss specular reflections, fluid heavy drape, and deep shimmering folds"
  },
  {
    id: "royal-velvet",
    name: "Royal Velvet",
    category: "luxe",
    categoryLabel: "Luxe & Drape",
    description: "Dense plush pile fabric with deep light-absorbing shadows and opulent royal weight",
    drapePhysics: "dense, plush royal velvet with deep light-absorbing pile, rich directional shadows, and heavy opulent structural drape",
    badge: "Royal Luxe"
  }
];

// -------------------------------------------------------------
// 9. Master Photoshoot References (Real Curated Shoots)
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
    settingTitle: "Sunlit Botanical Garden with Lush Foliage & Natural Morning Flare",
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

