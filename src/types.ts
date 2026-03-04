// ─── Mealie API Types ─────────────────────────────────────────────────────────

export interface RecipeIngredient {
  quantity?: number | null;
  unit?: IngredientUnit | null;
  food?: IngredientFood | null;
  note?: string | null;
  isFood?: boolean;
  disableAmount?: boolean;
  display?: string;
  title?: string | null;
  originalText?: string | null;
  referenceId?: string;
}

export interface IngredientUnit {
  id?: string;
  name: string;
  abbreviation?: string;
  description?: string;
  fraction?: boolean;
  pluralName?: string | null;
  pluralAbbreviation?: string | null;
}

export interface IngredientFood {
  id?: string;
  name: string;
  pluralName?: string | null;
  description?: string;
  extras?: Record<string, unknown>;
}

export interface RecipeInstruction {
  id?: string;
  title?: string | null;
  text: string;
  ingredientReferences?: string[];
}

export interface RecipeNote {
  title: string;
  text: string;
}

export interface RecipeTag {
  id?: string;
  name: string;
  slug?: string;
}

export interface RecipeCategory {
  id?: string;
  name: string;
  slug?: string;
}

export interface RecipeTool {
  id?: string;
  name: string;
  slug?: string;
  onHand?: boolean;
}

export interface NutritionInfo {
  calories?: string | null;
  fatContent?: string | null;
  proteinContent?: string | null;
  carbohydrateContent?: string | null;
  fiberContent?: string | null;
  sodiumContent?: string | null;
  sugarContent?: string | null;
}

export interface RecipeSummary {
  id: string;
  userId?: string;
  groupId?: string;
  name: string;
  slug: string;
  image?: string | null;
  recipeYield?: string | null;
  totalTime?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  performTime?: string | null;
  description?: string | null;
  recipeCategory?: RecipeCategory[];
  tags?: RecipeTag[];
  tools?: RecipeTool[];
  rating?: number | null;
  orgURL?: string | null;
  dateAdded?: string | null;
  dateUpdated?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMade?: string | null;
}

export interface Recipe extends RecipeSummary {
  recipeIngredient?: RecipeIngredient[];
  recipeInstructions?: RecipeInstruction[];
  nutrition?: NutritionInfo | null;
  notes?: RecipeNote[];
  extras?: Record<string, unknown>;
  isOcrRecipe?: boolean;
  settings?: RecipeSettings;
  assets?: RecipeAsset[];
  comments?: RecipeComment[];
}

export interface RecipeSettings {
  public?: boolean;
  showNutrition?: boolean;
  showAssets?: boolean;
  landscapeView?: boolean;
  disableComments?: boolean;
  disableAmount?: boolean;
  locked?: boolean;
}

export interface RecipeAsset {
  name: string;
  icon: string;
  fileType: string;
  fileName: string;
}

export interface RecipeComment {
  id?: string;
  recipeId?: string;
  userId?: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Mealie API Response Types ────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  items: T[];
  next?: string | null;
  previous?: string | null;
}

export interface RecipeSearchResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  items: RecipeSummary[];
}

// ─── Tool Input Types ──────────────────────────────────────────────────────────

export interface SearchRecipesInput {
  query: string;
  tags?: string[];
  limit?: number;
}

export interface GetRecipeInput {
  recipe_id: string;
}

export interface ListRecipesInput {
  tags?: string[];
  categories?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchByIngredientInput {
  ingredient: string;
  limit?: number;
}

// ─── Server Config ─────────────────────────────────────────────────────────────

export interface ServerConfig {
  mealieUrl: string;
  mealieApiKey: string;
  port: number;
}
