import { z } from "zod";
import { MealieClient } from "./mealie-client.js";
import { Recipe, RecipeSummary } from "./types.js";

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const SearchRecipesSchema = z.object({
  query: z.string().min(1).describe("Search query string (recipe name, keyword, or phrase)"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Optional list of tag names to filter by"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Maximum number of results to return (default: 20, max: 100)"),
});

export const GetRecipeSchema = z.object({
  recipe_id: z
    .string()
    .min(1)
    .describe("Recipe ID (UUID) or slug to retrieve"),
});

export const ListRecipesSchema = z.object({
  tags: z
    .array(z.string())
    .optional()
    .describe("Optional list of tag names to filter by"),
  categories: z
    .array(z.string())
    .optional()
    .describe("Optional list of category names to filter by"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Number of recipes per page (default: 50, max: 200)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of recipes to skip for pagination (default: 0)"),
});

export const AddRecipeFromUrlSchema = z.object({
  url: z.string().url().describe("URL of the recipe page to scrape and import"),
  includeTags: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to import tags from the source website (default: false)"),
  includeCategories: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to import categories from the source website (default: false)"),
});

export const SearchByIngredientSchema = z.object({
  ingredient: z
    .string()
    .min(1)
    .describe("Ingredient name to search for (e.g. 'cream cheese', 'chicken')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Maximum number of results to return (default: 20)"),
});

// ─── Tool Definitions ──────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "search_recipes",
    description:
      "Search for recipes in Mealie by name, keyword, or description. " +
      "Optionally filter by tags. Returns a list of matching recipes with basic info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string (recipe name, keyword, or phrase)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of tag names to filter by",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum number of results to return (default: 20, max: 100)",
          default: 20,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_recipe",
    description:
      "Get complete details for a specific recipe including ingredients, " +
      "step-by-step instructions, nutrition information, notes, and tags. " +
      "Use the recipe ID or slug from search results.",
    inputSchema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "Recipe ID (UUID) or slug to retrieve",
        },
      },
      required: ["recipe_id"],
    },
  },
  {
    name: "list_recipes",
    description:
      "List all recipes in Mealie, optionally filtered by tags or categories. " +
      "Supports pagination for large recipe collections.",
    inputSchema: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of tag names to filter by",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of category names to filter by",
        },
        limit: {
          type: "number",
          description: "Number of recipes per page (default: 50, max: 200)",
          default: 50,
        },
        offset: {
          type: "number",
          description: "Number of recipes to skip for pagination (default: 0)",
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: "add_recipe_from_url",
    description:
      "Import a recipe into Mealie by scraping a URL. Mealie will automatically extract " +
      "the recipe name, ingredients, instructions, and metadata from the page. " +
      "Works best with sites that use structured recipe data (most major recipe sites).",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the recipe page to scrape and import",
        },
        includeTags: {
          type: "boolean",
          description: "Whether to import tags from the source website (default: false)",
          default: false,
        },
        includeCategories: {
          type: "boolean",
          description: "Whether to import categories from the source website (default: false)",
          default: false,
        },
      },
      required: ["url"],
    },
  },
  {
    name: "search_by_ingredient",
    description:
      "Find recipes that contain a specific ingredient. " +
      "Searches through recipe names, descriptions, and ingredient lists.",
    inputSchema: {
      type: "object",
      properties: {
        ingredient: {
          type: "string",
          description: "Ingredient name to search for (e.g. 'cream cheese', 'chicken')",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)",
          default: 20,
        },
      },
      required: ["ingredient"],
    },
  },
];

// ─── Tool Handler ──────────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: unknown,
  client: MealieClient
): Promise<string> {
  switch (name) {
    case "search_recipes": {
      const input = SearchRecipesSchema.parse(args);
      const recipes = await client.searchRecipes(input.query, input.tags, input.limit);
      return formatRecipeList(recipes, `Search results for "${input.query}"`);
    }

    case "get_recipe": {
      const input = GetRecipeSchema.parse(args);
      const recipe = await client.getRecipe(input.recipe_id);
      return formatFullRecipe(recipe);
    }

    case "list_recipes": {
      const input = ListRecipesSchema.parse(args);
      const result = await client.listRecipes({
        tags: input.tags,
        categories: input.categories,
        limit: input.limit,
        offset: input.offset,
      });
      const showing = Math.min(input.limit ?? 50, result.items.length);
      const header = `Showing ${showing} of ${result.total} recipes (offset: ${input.offset ?? 0})`;
      return formatRecipeList(result.items, header);
    }

    case "add_recipe_from_url": {
      const input = AddRecipeFromUrlSchema.parse(args);
      const recipe = await client.createRecipeFromUrl(input.url, input.includeTags, input.includeCategories);
      return `Recipe imported successfully!\n\n${formatFullRecipe(recipe)}`;
    }

    case "search_by_ingredient": {
      const input = SearchByIngredientSchema.parse(args);
      const recipes = await client.searchByIngredient(input.ingredient, input.limit);
      return formatRecipeList(
        recipes,
        `Recipes containing "${input.ingredient}"`
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatRecipeList(recipes: RecipeSummary[], header: string): string {
  if (recipes.length === 0) {
    return `${header}\n\nNo recipes found.`;
  }

  const lines = [`${header}\n`];

  for (const recipe of recipes) {
    lines.push(`- **${recipe.name}** (ID: \`${recipe.slug ?? recipe.id}\`)`);
    if (recipe.description) {
      lines.push(`  ${recipe.description}`);
    }
    const meta: string[] = [];
    if (recipe.totalTime) meta.push(`Time: ${recipe.totalTime}`);
    if (recipe.recipeYield) meta.push(`Yield: ${recipe.recipeYield}`);
    if (recipe.tags && recipe.tags.length > 0) {
      meta.push(`Tags: ${recipe.tags.map((t) => t.name).join(", ")}`);
    }
    if (meta.length > 0) {
      lines.push(`  ${meta.join(" | ")}`);
    }
  }

  return lines.join("\n");
}

function formatFullRecipe(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.name}`);
  lines.push(`**ID/Slug:** \`${recipe.slug ?? recipe.id}\``);

  if (recipe.description) {
    lines.push(`\n${recipe.description}`);
  }

  // Metadata
  const meta: string[] = [];
  if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime}`);
  if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime}`);
  if (recipe.totalTime) meta.push(`Total: ${recipe.totalTime}`);
  if (recipe.recipeYield) meta.push(`Yield: ${recipe.recipeYield}`);
  if (meta.length > 0) {
    lines.push(`\n${meta.join(" | ")}`);
  }

  if (recipe.tags && recipe.tags.length > 0) {
    lines.push(`**Tags:** ${recipe.tags.map((t) => t.name).join(", ")}`);
  }

  if (recipe.recipeCategory && recipe.recipeCategory.length > 0) {
    lines.push(`**Categories:** ${recipe.recipeCategory.map((c) => c.name).join(", ")}`);
  }

  // Ingredients
  if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
    lines.push(`\n## Ingredients`);
    for (const ing of recipe.recipeIngredient) {
      const text = ing.display ?? ing.note ?? formatIngredient(ing);
      if (text) lines.push(`- ${text}`);
    }
  }

  // Instructions
  if (recipe.recipeInstructions && recipe.recipeInstructions.length > 0) {
    lines.push(`\n## Instructions`);
    recipe.recipeInstructions.forEach((step, i) => {
      if (step.title) {
        lines.push(`\n**${step.title}**`);
      }
      lines.push(`${i + 1}. ${step.text}`);
    });
  }

  // Nutrition
  if (recipe.nutrition) {
    const n = recipe.nutrition;
    const nutrients: string[] = [];
    if (n.calories) nutrients.push(`Calories: ${n.calories}`);
    if (n.proteinContent) nutrients.push(`Protein: ${n.proteinContent}`);
    if (n.carbohydrateContent) nutrients.push(`Carbs: ${n.carbohydrateContent}`);
    if (n.fatContent) nutrients.push(`Fat: ${n.fatContent}`);
    if (n.fiberContent) nutrients.push(`Fiber: ${n.fiberContent}`);
    if (n.sodiumContent) nutrients.push(`Sodium: ${n.sodiumContent}`);
    if (n.sugarContent) nutrients.push(`Sugar: ${n.sugarContent}`);
    if (nutrients.length > 0) {
      lines.push(`\n## Nutrition (per serving)`);
      nutrients.forEach((n) => lines.push(`- ${n}`));
    }
  }

  // Notes
  if (recipe.notes && recipe.notes.length > 0) {
    lines.push(`\n## Notes`);
    for (const note of recipe.notes) {
      if (note.title) lines.push(`**${note.title}**`);
      lines.push(note.text);
    }
  }

  return lines.join("\n");
}

function formatIngredient(ing: {
  quantity?: number | null;
  unit?: { name: string; abbreviation?: string } | null;
  food?: { name: string } | null;
  note?: string | null;
}): string {
  const parts: string[] = [];
  if (ing.quantity != null) parts.push(String(ing.quantity));
  if (ing.unit) parts.push(ing.unit.abbreviation ?? ing.unit.name);
  if (ing.food) parts.push(ing.food.name);
  if (ing.note) parts.push(ing.note);
  return parts.join(" ").trim();
}
