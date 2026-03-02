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

export const AddRecipeSchema = z.object({
  name: z.string().min(1).describe("Name of the recipe"),
  ingredients: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "List of ingredients as strings (e.g. ['2 cups flour', '1 tsp salt'])"
    ),
  instructions: z
    .string()
    .min(1)
    .describe(
      "Step-by-step cooking instructions. Separate steps with newlines."
    ),
  description: z
    .string()
    .optional()
    .describe("Short description of the recipe"),
  tags: z
    .array(z.string())
    .optional()
    .describe("List of tag names to assign to the recipe"),
  notes: z
    .string()
    .optional()
    .describe("Additional notes or tips for the recipe"),
  prepTime: z
    .string()
    .optional()
    .describe("Preparation time (e.g. '15 minutes', 'PT15M')"),
  cookTime: z
    .string()
    .optional()
    .describe("Cooking time (e.g. '30 minutes', 'PT30M')"),
  totalTime: z
    .string()
    .optional()
    .describe("Total time including prep and cook (e.g. '45 minutes')"),
  recipeYield: z
    .string()
    .optional()
    .describe("Number of servings (e.g. '4 servings', '8 cookies')"),
});

export const UpdateRecipeSchema = z.object({
  recipe_id: z
    .string()
    .min(1)
    .describe("Recipe ID (UUID) or slug to update"),
  updates: z
    .object({
      name: z.string().optional().describe("New recipe name"),
      description: z.string().optional().describe("New description"),
      recipeYield: z.string().optional().describe("New serving size"),
      prepTime: z.string().optional().describe("New prep time"),
      cookTime: z.string().optional().describe("New cook time"),
      totalTime: z.string().optional().describe("New total time"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Replacement tag list (replaces all existing tags)"),
      notes: z
        .string()
        .optional()
        .describe("New notes text (updates or creates a 'Notes' section)"),
    })
    .describe("Fields to update on the recipe"),
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
          type: "number",
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
    name: "add_recipe",
    description:
      "Create a new recipe in Mealie with name, ingredients, instructions, and optional metadata. " +
      "Returns the created recipe with its assigned ID and slug.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the recipe",
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredients as strings (e.g. ['2 cups flour', '1 tsp salt'])",
        },
        instructions: {
          type: "string",
          description: "Step-by-step cooking instructions. Separate steps with newlines.",
        },
        description: {
          type: "string",
          description: "Short description of the recipe",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "List of tag names to assign to the recipe",
        },
        notes: {
          type: "string",
          description: "Additional notes or tips for the recipe",
        },
        prepTime: {
          type: "string",
          description: "Preparation time (e.g. '15 minutes')",
        },
        cookTime: {
          type: "string",
          description: "Cooking time (e.g. '30 minutes')",
        },
        totalTime: {
          type: "string",
          description: "Total time including prep and cook (e.g. '45 minutes')",
        },
        recipeYield: {
          type: "string",
          description: "Number of servings (e.g. '4 servings', '8 cookies')",
        },
      },
      required: ["name", "ingredients", "instructions"],
    },
  },
  {
    name: "update_recipe",
    description:
      "Update fields on an existing recipe. Only the fields provided in 'updates' will be changed. " +
      "You can update the name, description, times, tags, and notes.",
    inputSchema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "Recipe ID (UUID) or slug to update",
        },
        updates: {
          type: "object",
          description: "Fields to update on the recipe",
          properties: {
            name: { type: "string", description: "New recipe name" },
            description: { type: "string", description: "New description" },
            recipeYield: { type: "string", description: "New serving size" },
            prepTime: { type: "string", description: "New prep time" },
            cookTime: { type: "string", description: "New cook time" },
            totalTime: { type: "string", description: "New total time" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Replacement tag list (replaces all existing tags)",
            },
            notes: {
              type: "string",
              description: "New notes text (updates or creates a 'Notes' section)",
            },
          },
        },
      },
      required: ["recipe_id", "updates"],
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

    case "add_recipe": {
      const input = AddRecipeSchema.parse(args);
      const recipe = await client.createRecipe(input);
      return `Recipe created successfully!\n\n${formatFullRecipe(recipe)}`;
    }

    case "update_recipe": {
      const input = UpdateRecipeSchema.parse(args);
      const recipe = await client.updateRecipe(input);
      return `Recipe updated successfully!\n\n${formatFullRecipe(recipe)}`;
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
