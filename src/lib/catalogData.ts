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
    "name": "Frontal Editorial Stance — FS1",
    "category": "standing",
    "imageUrl": "/reference_poses/FS1.jpg",
    "description": "Full-length standing frontal stance with arms relaxed at sides, showcasing full silhouette."
  },
  {
    "id": "fs-4",
    "name": "Full-Length Rear View — FS4",
    "category": "details",
    "imageUrl": "/reference_poses/FS4.jpg",
    "description": "Full-length back view facing away from camera, highlighting back blouse detailing and trailing pallu drape."
  },
  {
    "id": "fs-5",
    "name": "Side Profile Hand at Chin — FS5",
    "category": "standing",
    "imageUrl": "/reference_poses/FS5.jpg",
    "description": "90-degree side profile stance with gentle hand placed at chin/neck, emphasizing neckline and profile drape."
  },
  {
    "id": "fs-6",
    "name": "Frontal Waist-Up Bust Shot — FS6",
    "category": "details",
    "imageUrl": "/reference_poses/FS6.jpg",
    "description": "Medium waist-up bust shot facing camera, presenting blouse embroidery, neckline, and shoulder drape."
  },
  {
    "id": "fs-7",
    "name": "Over-the-Shoulder Back Detail — FS7",
    "category": "details",
    "imageUrl": "/reference_poses/FS7.jpg",
    "description": "Over-the-shoulder close-up view displaying hair bun styling, back neck cut, and ear jewellery."
  },
  {
    "id": "fs-8",
    "name": "Footwear & Hemline Detail — FS8",
    "category": "details",
    "imageUrl": "/reference_poses/FS8.jpg",
    "description": "Close-up shot of feet, ankles, footwear, and lower skirt pleat hemline resting on floor."
  },
  {
    "id": "pose-p1",
    "name": "Standing Hand on Hip — P1",
    "category": "standing",
    "imageUrl": "/reference_poses/P1.jpg",
    "description": "Confident standing frontal pose with one hand rested firmly on hip, accentuating waistline drape."
  },
  {
    "id": "pose-p2",
    "name": "Cross-Legged Wall Lean — P2",
    "category": "standing",
    "imageUrl": "/reference_poses/P2.jpg",
    "description": "Cross-legged casual lean against wall with hand on hip, creating an elongated relaxed silhouette."
  },
  {
    "id": "pose-p3",
    "name": "Three-Quarter Turn Over-Shoulder — P3",
    "category": "standing",
    "imageUrl": "/reference_poses/P3.jpg",
    "description": "Three-quarter back turn glancing gracefully over shoulder, showcasing spine drape and side profile."
  },
  {
    "id": "pose-p4",
    "name": "Standing Forearm Drape Hold — P4",
    "category": "standing",
    "imageUrl": "/reference_poses/P4.jpg",
    "description": "Standing pose resting drape over forearm at waist level, presenting fabric folds and border borders."
  },
  {
    "id": "pose-p5",
    "name": "Walking Down Steps in Motion — P5",
    "category": "motion",
    "imageUrl": "/reference_poses/P5.jpg",
    "description": "Dynamic walking stride descending steps with natural windswept hair and flowing fabric motion."
  },
  {
    "id": "pose-p6",
    "name": "Seated on Steps Cascading Drape — P6",
    "category": "seated",
    "imageUrl": "/reference_poses/P6.jpg",
    "description": "Gracefully seated on stone steps with pleated skirt fabric cascading down the risers."
  },
  {
    "id": "pose-p7",
    "name": "Upright Poised Ledge Seat — P7",
    "category": "seated",
    "imageUrl": "/reference_poses/P7.jpg",
    "description": "Upright seated posture on architectural ledge or cube with hands gently resting on lap."
  },
  {
    "id": "pose-p8",
    "name": "Seated Cross-Legged with Book — P8",
    "category": "seated",
    "imageUrl": "/reference_poses/P8.jpg",
    "description": "Intimate relaxed seat cross-legged on chair reading an open book with fabric draped around knees."
  },
  {
    "id": "pose-p9",
    "name": "Standing Holding Lace Parasol — P9",
    "category": "regal",
    "imageUrl": "/reference_poses/P9.jpg",
    "description": "Smiling upright standing pose holding up a delicate vintage lace parasol umbrella."
  },
  {
    "id": "pose-p10",
    "name": "Leaning Back Against Railing — P10",
    "category": "standing",
    "imageUrl": "/reference_poses/P10.jpg",
    "description": "Standing relaxed and leaning back against horizontal balcony railing with hands behind."
  },
  {
    "id": "pose-p11",
    "name": "Profile Balcony Railing Grip — P11",
    "category": "standing",
    "imageUrl": "/reference_poses/P11.jpg",
    "description": "Standing side profile holding architectural balcony railing with both hands, looking outward."
  },
  {
    "id": "pose-p12",
    "name": "Three-Quarter Turn Downward Glance — P12",
    "category": "standing",
    "imageUrl": "/reference_poses/P12.jpg",
    "description": "Poised three-quarter standing stance with modest downward glance and hand near waist."
  },
  {
    "id": "pose-p13",
    "name": "Head & Shoulders Beauty Portrait — P13",
    "category": "details",
    "imageUrl": "/reference_poses/P13.jpg",
    "description": "Tight head-and-shoulders beauty portrait with delicate hand touching chin, highlighting facial glow and jewellery."
  },
  {
    "id": "pose-p19",
    "name": "Editorial Vintage Car Wing Lean — P19",
    "category": "regal",
    "imageUrl": "/reference_poses/P19.jpg",
    "description": "Editorial standing stance leaning gracefully against front wing and bonnet of a vintage classic car."
  },
  {
    "id": "pose-p20",
    "name": "Centered Tall Doorframe Stance — P20",
    "category": "regal",
    "imageUrl": "/reference_poses/P20.jpg",
    "description": "Symmetrical regal stance framed inside tall architectural portal doorframe."
  },
  {
    "id": "pose-p21",
    "name": "Standing by Carved Mirror Frame — P21",
    "category": "regal",
    "imageUrl": "/reference_poses/P21.jpg",
    "description": "Poised upright stance beside ornate carved wooden heritage mirror reflecting ambient room lighting."
  },
  {
    "id": "pose-p22",
    "name": "Bust Portrait Hand at Collarbone — P22",
    "category": "details",
    "imageUrl": "/reference_poses/P22.jpg",
    "description": "Medium bust portrait with delicate hand resting at collarbone, presenting neckline craftsmanship."
  },
  {
    "id": "pose-p23",
    "name": "Frontal Standing Clasped Waist — P23",
    "category": "standing",
    "imageUrl": "/reference_poses/P23.jpg",
    "description": "Classic frontal catalog standing stance with hands gently clasped together in front of waist."
  },
  {
    "id": "pose-p24",
    "name": "Relaxed Standing Arms at Sides — P24",
    "category": "standing",
    "imageUrl": "/reference_poses/P24.jpg",
    "description": "Effortless natural three-quarter standing stance with arms hanging relaxed at sides."
  },
  {
    "id": "pose-p25",
    "name": "Three-Quarter Clasped Stance — P25",
    "category": "standing",
    "imageUrl": "/reference_poses/P25.jpg",
    "description": "Three-quarter poised stance with hands loosely clasped in front, displaying front pallu pleats."
  },
  {
    "id": "pose-p26",
    "name": "High-Angle Floor Lean Recline — P26",
    "category": "seated",
    "imageUrl": "/reference_poses/P26.jpg",
    "description": "Artistic high-angle perspective seated on floor, leaning back on one palm with legs folded."
  },
  {
    "id": "pose-p27",
    "name": "Tall Stool Joyful Laugh — P27",
    "category": "seated",
    "imageUrl": "/reference_poses/P27.jpg",
    "description": "Spontaneous joyful seated posture perched on tall stool with natural candid laughter."
  },
  {
    "id": "pose-p28",
    "name": "Standing Beside Console Table — P28",
    "category": "standing",
    "imageUrl": "/reference_poses/P28.jpg",
    "description": "Poised upright stance beside high table with one hand resting flat on tabletop surface."
  },
  {
    "id": "pose-p29",
    "name": "Leaning Over Table with Forearms — P29",
    "category": "seated",
    "imageUrl": "/reference_poses/P29.jpg",
    "description": "Warm engaging pose leaning forward over table with forearms rested, smiling toward camera."
  },
  {
    "id": "pose-p30",
    "name": "Playful Shy Smile Hand on Mouth — P30",
    "category": "details",
    "imageUrl": "/reference_poses/P30.jpg",
    "description": "Close-up candid portrait covering mouth playfully with hand during a gentle blush smile."
  },
  {
    "id": "pose-p31",
    "name": "Statuesque Standing Palm on Wall — P31",
    "category": "regal",
    "imageUrl": "/reference_poses/P31.jpg",
    "description": "Statuesque editorial pose standing with one palm rested flat high on architectural wall."
  },
  {
    "id": "pose-p32",
    "name": "Side Profile Over-Shoulder Glance — P32",
    "category": "standing",
    "imageUrl": "/reference_poses/P32.jpg",
    "description": "Side profile stance with body turned away, head turned back over shoulder gazing toward camera."
  },
  {
    "id": "pose-p33",
    "name": "Horizontal Lounge Reclining on Sofa — P33",
    "category": "seated",
    "imageUrl": "/reference_poses/P33.jpg",
    "description": "Relaxed luxury lounge reclining horizontally along modern sofa with fabric pooling gracefully."
  },
  {
    "id": "pose-p34",
    "name": "Seated on Sofa Armrest Rest — P34",
    "category": "seated",
    "imageUrl": "/reference_poses/P34.jpg",
    "description": "Elegant seated posture on contemporary sofa with one arm resting along plush armrest."
  },
  {
    "id": "pose-p35",
    "name": "Seated on Classic Chair Hands Lap — P35",
    "category": "seated",
    "imageUrl": "/reference_poses/P35.jpg",
    "description": "Three-quarter seated portrait on sculpted accent chair with hands resting calmly on lap."
  },
  {
    "id": "pose-p36",
    "name": "Rear Standing Balcony Overview — P36",
    "category": "standing",
    "imageUrl": "/reference_poses/P36.jpg",
    "description": "Rear standing view facing outward toward horizon with hands resting on balcony balustrade."
  },
  {
    "id": "pose-p37",
    "name": "Dynamic Fluid Running Stride — P37",
    "category": "motion",
    "imageUrl": "/reference_poses/P37.jpg",
    "description": "Joyful dynamic running and walking stride capturing energetic fabric flutter and flowing hem."
  }
];

// -------------------------------------------------------------
// 4. 61 Curated Luxury Catalog Backgrounds
// -------------------------------------------------------------
export const PRESET_BACKGROUNDS: CatalogBackground[] = [
  {
    "id": "bg-b1",
    "name": "Seaside Promenade Stone Terrace — B1",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B1.jpg",
    "description": "Outdoor coastal promenade with natural stone steps and ocean waves in crisp daylight."
  },
  {
    "id": "bg-b2",
    "name": "Haveli Scalloped Arches Courtyard — B2",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B2.jpg",
    "description": "Rajasthani heritage haveli courtyard with scalloped sandstone arches and carved pillars."
  },
  {
    "id": "bg-b3",
    "name": "Historic Palace Rooftop Terrace — B3",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B3.jpg",
    "description": "Open-air palace rooftop terrace with panoramic view of heritage city architecture."
  },
  {
    "id": "bg-b4",
    "name": "Floral Alcove Checkered Marble Corridor — B4",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B4.jpg",
    "description": "Palace hallway featuring black-and-white checkered marble floor and painted floral wall niches."
  },
  {
    "id": "bg-b5",
    "name": "Carved Sandstone Colonnade — B5",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B5.jpg",
    "description": "Grand heritage courtyard featuring ornate sandstone columns and classic jharokha lattice work."
  },
  {
    "id": "bg-b6",
    "name": "Grand Gilded Ballroom Salon — B6",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B6.jpg",
    "description": "Opulent ballroom interior with crystal chandeliers, polished parquet floors, and gilded molding."
  },
  {
    "id": "bg-b7",
    "name": "Royal Darbar Heritage Hall — B7",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B7.jpg",
    "description": "Regal Indian palace reception room with rich crimson carpets, arched alcoves, and brass lamps."
  },
  {
    "id": "bg-b8",
    "name": "Verdant Courtyard Garden Lawn — B8",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B8.jpg",
    "description": "Manicured green palace lawn surrounded by flowering jasmine shrubs and stone perimeter walls."
  },
  {
    "id": "bg-b9",
    "name": "Mediterranean Villa Balcony Garden — B9",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B9.jpg",
    "description": "Sunlit terracotta terrace balcony lined with blooming bougainvillea pots and wrought-iron railings."
  },
  {
    "id": "bg-b10",
    "name": "Sunlit Palm Oasis Botanical Path — B10",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B10.jpg",
    "description": "Tropical landscaped botanical garden path lined with towering palm fronds and stone pavers."
  },
  {
    "id": "bg-b11",
    "name": "Limestone Terrace Pergola Lawn — B11",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B11.jpg",
    "description": "Clean limestone outdoor patio under wooden pergola with lush manicured garden greenery."
  },
  {
    "id": "bg-b12",
    "name": "Heritage Courtyard Vintage Car Setting — B12",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B12.jpg",
    "description": "Festive stone-paved manor courtyard featuring a polished classic vintage motorcar."
  },
  {
    "id": "bg-b13",
    "name": "Soft Warm Minimalist Cyclorama — B13",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B13.jpg",
    "description": "Professional fashion photography cyclorama studio with soft warm diffused editorial lighting."
  },
  {
    "id": "bg-b14",
    "name": "Golden Hour Wildflower Meadow — B14",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B14.jpg",
    "description": "Lush open countryside meadow filled with blooming wild blossoms under clear warm skies."
  },
  {
    "id": "bg-b15",
    "name": "Geometric Stepwell Ancient Baori — B15",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B15.jpg",
    "description": "Ancient Indian stepwell with dramatic geometric stone staircases and deep historic perspective."
  },
  {
    "id": "bg-b16",
    "name": "Golden Sand Dunes Desert Horizon — B16",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B16.jpg",
    "description": "Vast desert dunes of Rajasthan under warm golden-hour lighting with crisp textured sand ripples."
  },
  {
    "id": "bg-b17",
    "name": "High-Rise Sky Penthouse Lounge — B17",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B17.jpg",
    "description": "Modern designer penthouse interior with floor-to-ceiling glass windows and panoramic skyline views."
  },
  {
    "id": "bg-b18",
    "name": "Rich Wood Executive Library — B18",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B18.jpg",
    "description": "Sophisticated private library lounge with floor-to-ceiling dark oak bookshelves and leather armchairs."
  },
  {
    "id": "bg-b19",
    "name": "Neutral Grey Fashion Editorial Studio — B19",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B19.jpg",
    "description": "Crisp neutral grey cyclorama fashion photography studio with balanced high-CRI key lighting."
  },
  {
    "id": "bg-b20",
    "name": "Warm Sand Textured Studio Canvas — B20",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B20.jpg",
    "description": "Artisanal hand-painted warm sand and clay textured canvas backdrop with gentle shadow gradation."
  },
  {
    "id": "bg-b21",
    "name": "Charcoal Editorial Studio Backdrop — B21",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B21.jpg",
    "description": "Moody charcoal grey seamless studio background with high-contrast cinematic fashion lighting."
  },
  {
    "id": "bg-b22",
    "name": "Alabaster Minimalist Studio Cove — B22",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B22.jpg",
    "description": "Seamless off-white alabaster studio cove creating pure clean focus on fabric textures."
  },
  {
    "id": "bg-b23",
    "name": "Festive Diya Illuminated Hall — B23",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B23.jpg",
    "description": "Richly decorated festive celebration hall illuminated with warm brass lamps, diyas, and marigolds."
  },
  {
    "id": "bg-b24",
    "name": "Warm Ochre Festive Heritage Wall — B24",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B24.jpg",
    "description": "Vibrant warm ochre textured wall adorned with traditional festive motifs and warm ambient glows."
  },
  {
    "id": "bg-b25",
    "name": "Contemporary Luxury Living Suite — B25",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B25.jpg",
    "description": "Modern minimalist luxury salon featuring polished travertine stone flooring and designer furniture."
  },
  {
    "id": "bg-b26",
    "name": "Diffused Soft Studio Daylight Cove — B26",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B26.jpg",
    "description": "Bright daylight-balanced fashion studio backdrop with soft ambient wrap-around lighting."
  },
  {
    "id": "bg-b27",
    "name": "Luxury Villa Poolside Deck & Lawn — B27",
    "category": "gardens",
    "imageUrl": "/reference_backgrounds/B27.jpg",
    "description": "Serene turquoise swimming pool deck framed by manicured green turf and tropical architecture."
  },
  {
    "id": "bg-b28",
    "name": "Art Deco Marble Foyer Hall — B28",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B28.jpg",
    "description": "Sleek Art Deco foyer featuring inlaid marble floor patterns, bronze accents, and fluted paneling."
  },
  {
    "id": "bg-b29",
    "name": "Opulent Crystal Chandelier Salon — B29",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B29.jpg",
    "description": "High-ceilinged Parisian-inspired parlor with hanging tiered crystal chandeliers and tall boiserie walls."
  },
  {
    "id": "bg-b30",
    "name": "Boutique Atelier Dressing Suite — B30",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/B30.jpg",
    "description": "Intimate high-end fashion atelier with velvet ottomans, brass garment rails, and warm cove lighting."
  },
  {
    "id": "bg-b31",
    "name": "Carved Marble Jharokha Balcony — B31",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B31.jpg",
    "description": "Authentic royal balcony featuring pierced marble jali lattice screens and panoramic fortress views."
  },
  {
    "id": "bg-b32",
    "name": "Clean High-Key White Studio — B32",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B32.jpg",
    "description": "High-key pure white seamless studio environment with even wrap-around lighting and crisp floor plane."
  },
  {
    "id": "bg-b33",
    "name": "Historic Fortress Rampart Overlook — B33",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B33.jpg",
    "description": "Rugged historic stone fortress rampart overlooking ancient city rooftops under clear daylight."
  },
  {
    "id": "bg-b34",
    "name": "Carved Teakwood Heritage Portico — B34",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B34.jpg",
    "description": "Grand wooden entrance portico featuring intricately hand-carved pillars and heritage terracotta tiles."
  },
  {
    "id": "bg-b35",
    "name": "Sun-Drenched Haveli Inner Courtyard — B35",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B35.jpg",
    "description": "Open multi-tiered haveli courtyard with whitewashed walls, blue painted trim, and stone floor."
  },
  {
    "id": "bg-b36",
    "name": "Regal Palace Throne Corridor — B36",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B36.jpg",
    "description": "Monumental palace colonnade flanked by vaulted arches and polished royal red stone corridors."
  },
  {
    "id": "bg-b37",
    "name": "Ancient Temple Stone Sanctum — B37",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B37.jpg",
    "description": "Centuries-old granite temple courtyard with dramatic stone relief carvings and sacred pillars."
  },
  {
    "id": "bg-b38",
    "name": "Royal Marigold Wedding Pavilion — B38",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B38.jpg",
    "description": "Lavish festive celebration mandap draped with fresh orange and yellow marigold garlands and fairy lights."
  },
  {
    "id": "bg-b39",
    "name": "Architectural Shadow Studio Canvas — B39",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B39.jpg",
    "description": "Studio canvas backdrop with subtle geometric window shadows and natural directional sunbeam highlights."
  },
  {
    "id": "bg-b40",
    "name": "Festive Brass Urli & Petal Courtyard — B40",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/B40.jpg",
    "description": "Traditional festive entrance lined with floating petal urlis, glowing oil lamps, and rangoli patterns."
  },
  {
    "id": "bg-b46",
    "name": "Monochrome Fine Art Studio — B46",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B46.jpg",
    "description": "Sophisticated dark monochrome fine art studio backdrop with controlled rim lighting."
  },
  {
    "id": "bg-b48",
    "name": "Indian Couture Heritage Atelier — B48",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/B48.jpg",
    "description": "Luxury Indian bridal design atelier featuring handwoven fabric looms, brass urns, and vintage tapestries."
  },
  {
    "id": "bg-b49",
    "name": "Soft Sage Fashion Studio — B49",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/B49.jpg",
    "description": "Subtle muted sage green seamless studio paper backdrop providing organic contrast for bright garments."
  },
  {
    "id": "bg-u2607fe8f",
    "name": "Pure Minimal Studio Canvas — U26",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/U2607fe8f.jpg",
    "description": "Clean modern seamless canvas studio setup with neutral daylight-balanced softbox illumination."
  },
  {
    "id": "bg-u2e4fb22b",
    "name": "Contemporary Taupe Studio — U2e",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/U2e4fb22b.jpg",
    "description": "Warm contemporary taupe studio backdrop designed for clean catalog editorial lookbooks."
  },
  {
    "id": "bg-u3718a1ee",
    "name": "Heritage Arched Vault Corridor — U37",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/U3718a1ee.jpg",
    "description": "Historic arched stone corridor with dramatic depth of field and soft ambient natural light."
  },
  {
    "id": "bg-u3d6f9c25",
    "name": "Festive Evening Lit Courtyard — U3d",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/U3d6f9c25.jpg",
    "description": "Festive outdoor evening courtyard illuminated with strings of warm fairy lights and brass lanterns."
  },
  {
    "id": "bg-u44c828d4",
    "name": "Sky Penthouse Glass Salon — U44",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/U44c828d4.jpg",
    "description": "Ultra-modern glass-walled luxury penthouse salon featuring contemporary designer styling."
  },
  {
    "id": "bg-u486f139f",
    "name": "Opulent Festive Floral Hall — U48",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/U486f139f.jpg",
    "description": "Celebratory grand hall decorated with cascading jasmine and rose garlands for auspicious occasions."
  },
  {
    "id": "bg-u4bbc2a14",
    "name": "Executive Study & Design Atelier — U4b",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/U4bbc2a14.jpg",
    "description": "Modern designer studio and executive workspace with polished floors, leather seating, and curated art."
  },
  {
    "id": "bg-u67a244c7",
    "name": "Grand Italian Marble Foyer — U67",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/U67a244c7.jpg",
    "description": "Grand entrance hall featuring bookmatched Italian marble wall panels and architectural downlighting."
  },
  {
    "id": "bg-u6816b726",
    "name": "Rustic Terracotta Heritage Courtyard — U68",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/U6816b726.jpg",
    "description": "Rustic traditional courtyard with hand-baked terracotta floor tiles, clay pots, and whitewashed walls."
  },
  {
    "id": "bg-u7ee3d1f0",
    "name": "Editorial Slate Studio Backing — U7e",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/U7ee3d1f0.jpg",
    "description": "Deep slate-grey seamless studio backdrop tailored for high-fashion jewelry and vibrant silks."
  },
  {
    "id": "bg-u971784e7",
    "name": "Ancient Colonnade Stone Corridor — U97",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/U971784e7.jpg",
    "description": "Historic monolithic stone colonnade capturing timeless Indian heritage architectural beauty."
  },
  {
    "id": "bg-ua2c0f716",
    "name": "Festive Royal Pavilion Hall — Ua2",
    "category": "festive",
    "imageUrl": "/reference_backgrounds/Ua2c0f716.jpg",
    "description": "Regal banquet hall prepared for wedding festivities with velvet drapery, brass candelabras, and floral urns."
  },
  {
    "id": "bg-ua899c079",
    "name": "Gilded Neoclassical Parlor — Ua8",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/Ua899c079.jpg",
    "description": "Opulent neoclassical reception room with detailed gold-leaf wall panels and antique furniture."
  },
  {
    "id": "bg-uabb9390e",
    "name": "Luxury Architectural Suite — Uab",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/Uabb9390e.jpg",
    "description": "Spacious minimalist luxury suite featuring warm indirect architectural lighting and limestone floors."
  },
  {
    "id": "bg-uc18d4988",
    "name": "Fine Art Portrait Studio Cove — Uc1",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/Uc18d4988.jpg",
    "description": "Textured fine art portrait studio cove with subtle brushed earth-tone backdrop."
  },
  {
    "id": "bg-ud4226230",
    "name": "Designer Bridal Salon Atelier — Ud4",
    "category": "luxury_interiors",
    "imageUrl": "/reference_backgrounds/Ud4226230.jpg",
    "description": "Exclusive luxury bridal salon featuring gold hanging racks, plush velvet lounge, and soft spot lighting."
  },
  {
    "id": "bg-uf0c8920c",
    "name": "Neutral Dove Grey Studio — Uf0",
    "category": "studio",
    "imageUrl": "/reference_backgrounds/Uf0c8920c.jpg",
    "description": "Crisp dove grey seamless photo studio paper backdrop with diffused broad key lighting."
  },
  {
    "id": "bg-uf3022a1f",
    "name": "Classic Haveli Carved Archway — Uf3",
    "category": "heritage",
    "imageUrl": "/reference_backgrounds/Uf3022a1f.jpg",
    "description": "Timeless heritage haveli doorway with carved floral stonework and authentic period architectural details."
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

