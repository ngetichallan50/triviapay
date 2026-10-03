/// Category list + colour themes — mirrors the mobile app's
/// `assets/data/questions.json` (order, names, icons) and
/// `lib/theme/category_themes.dart` (gradients).

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type CategoryTheme = {
  primary: string;
  secondary: string;
  accent: string;
  soft: string;
};

export const CATEGORIES: Category[] = [
  { id: "business-and-brands", name: "Business & Brands", icon: "💼" },
  { id: "car-logos", name: "Car Logos", icon: "🚗" },
  { id: "celebrities-and-influencers", name: "Celebrities", icon: "🌟" },
  { id: "counties-of-kenya", name: "Counties of Kenya", icon: "🗺" },
  { id: "culture-and-traditions", name: "Culture & Traditions", icon: "🎭" },
  { id: "flags-of-the-world", name: "Flags of the World", icon: "🚩" },
  { id: "food-and-cuisine", name: "Food & Cuisine", icon: "🍲" },
  { id: "football", name: "Football", icon: "⚽" },
  { id: "geography", name: "Geography", icon: "🌍" },
  { id: "kenyan-history", name: "Kenyan History", icon: "🏛" },
  { id: "logos", name: "Logos", icon: "🏷" },
  { id: "math-and-brain-teasers", name: "Math & Brain Teasers", icon: "🧮" },
  { id: "movies-and-tv", name: "Movies & TV", icon: "🎬" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "politics-and-governance", name: "Politics & Governance", icon: "🗳" },
  { id: "science", name: "Science", icon: "🔬" },
  { id: "sheng-and-swahili", name: "Sheng & Swahili", icon: "🗣" },
  { id: "sports", name: "Sports", icon: "🏅" },
  { id: "tech-and-gadgets", name: "Tech & Gadgets", icon: "📱" },
  { id: "wildlife-and-animals", name: "Wildlife & Animals", icon: "🦁" },
];

const THEMES: Record<string, CategoryTheme> = {
  logos: {
    primary: "#4F46E5",
    secondary: "#38BDF8",
    accent: "#22D3EE",
    soft: "#EEF2FF",
  },
  "car-logos": {
    primary: "#263238",
    secondary: "#E53935",
    accent: "#FFCA28",
    soft: "#ECEFF1",
  },
  geography: {
    primary: "#00695C",
    secondary: "#0288D1",
    accent: "#FFD54F",
    soft: "#E0F2F1",
  },
  science: {
    primary: "#6A1B9A",
    secondary: "#26C6DA",
    accent: "#B388FF",
    soft: "#F3E5F5",
  },
  "kenyan-history": {
    primary: "#B71C1C",
    secondary: "#F9A825",
    accent: "#2E7D32",
    soft: "#FFF3E0",
  },
  sports: {
    primary: "#F4511E",
    secondary: "#FFB300",
    accent: "#FF7043",
    soft: "#FFF8E1",
  },
  music: {
    primary: "#7B1FA2",
    secondary: "#EC407A",
    accent: "#FF80AB",
    soft: "#FCE4EC",
  },
  "movies-and-tv": {
    primary: "#C2185B",
    secondary: "#6A1B9A",
    accent: "#FFD54F",
    soft: "#F3E5F5",
  },
  "tech-and-gadgets": {
    primary: "#00BCD4",
    secondary: "#3D5AFE",
    accent: "#18FFFF",
    soft: "#E0F7FA",
  },
  "food-and-cuisine": {
    primary: "#FB8C00",
    secondary: "#D84315",
    accent: "#FFCA28",
    soft: "#FFF3E0",
  },
  "celebrities-and-influencers": {
    primary: "#D81B60",
    secondary: "#FF7043",
    accent: "#F48FB1",
    soft: "#FCE4EC",
  },
  "politics-and-governance": {
    primary: "#1A237E",
    secondary: "#455A64",
    accent: "#FFC107",
    soft: "#E8EAF6",
  },
  "wildlife-and-animals": {
    primary: "#7CB342",
    secondary: "#6D4C41",
    accent: "#FFB300",
    soft: "#F1F8E9",
  },
  football: {
    primary: "#1B5E20",
    secondary: "#8BC34A",
    accent: "#AEEA00",
    soft: "#F1F8E9",
  },
  "business-and-brands": {
    primary: "#1565C0",
    secondary: "#00897B",
    accent: "#40C4FF",
    soft: "#E3F2FD",
  },
  "sheng-and-swahili": {
    primary: "#00897B",
    secondary: "#FF7043",
    accent: "#FFD54F",
    soft: "#E0F2F1",
  },
  "culture-and-traditions": {
    primary: "#880E4F",
    secondary: "#FF8F00",
    accent: "#FFCA28",
    soft: "#FFF8E1",
  },
  "math-and-brain-teasers": {
    primary: "#3949AB",
    secondary: "#00E5FF",
    accent: "#7C4DFF",
    soft: "#E8EAF6",
  },
  "flags-of-the-world": {
    primary: "#D32F2F",
    secondary: "#1565C0",
    accent: "#FFC107",
    soft: "#FFEBEE",
  },
  "counties-of-kenya": {
    primary: "#00A859",
    secondary: "#E6A700",
    accent: "#00C46E",
    soft: "#E8F5E9",
  },
};

const FALLBACK: CategoryTheme = {
  primary: "#00A859",
  secondary: "#00C46E",
  accent: "#FFC107",
  soft: "#E8F5E9",
};

export const categoryThemeOf = (id: string): CategoryTheme =>
  THEMES[id] ?? FALLBACK;

export const categoryName = (id: string): string =>
  CATEGORIES.find((c) => c.id === id)?.name ?? id;

export const categoryIcon = (id: string): string =>
  CATEGORIES.find((c) => c.id === id)?.icon ?? "❓";
