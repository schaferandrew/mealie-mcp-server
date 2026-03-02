import axios, { AxiosInstance, AxiosError } from "axios";
import {
  Recipe,
  RecipeSummary,
  RecipeIngredient,
  RecipeInstruction,
  RecipeTag,
  PaginatedResponse,
  AddRecipeInput,
  UpdateRecipeInput,
} from "./types.js";

// ─── Mealie API Client ─────────────────────────────────────────────────────────

export class MealieClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.http = axios.create({
      baseURL: `${baseUrl}/api`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30_000,
    });

    // Sanitize API key from error messages
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.config?.headers?.["Authorization"]) {
          error.config.headers["Authorization"] = "Bearer [REDACTED]";
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Health Check ────────────────────────────────────────────────────────────

  async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      const response = await this.http.get<{ status: string; version?: string }>("/app/about");
      return { status: "ok", version: response.data.version };
    } catch (error) {
      throw this.wrapError("health check", error);
    }
  }

  // ─── Recipe Search ────────────────────────────────────────────────────────────

  async searchRecipes(
    query: string,
    tags?: string[],
    limit = 20
  ): Promise<RecipeSummary[]> {
    try {
      const params: Record<string, unknown> = {
        search: query,
        perPage: limit,
        page: 1,
        orderBy: "name",
        orderDirection: "asc",
      };

      if (tags && tags.length > 0) {
        params["tags"] = tags.join(",");
      }

      const response = await this.http.get<PaginatedResponse<RecipeSummary>>(
        "/recipes",
        { params }
      );
      return response.data.items ?? [];
    } catch (error) {
      throw this.wrapError("search recipes", error);
    }
  }

  // ─── Get Full Recipe ──────────────────────────────────────────────────────────

  async getRecipe(recipeSlugOrId: string): Promise<Recipe> {
    try {
      const response = await this.http.get<Recipe>(`/recipes/${recipeSlugOrId}`);
      return response.data;
    } catch (error) {
      throw this.wrapError(`get recipe '${recipeSlugOrId}'`, error);
    }
  }

  // ─── List Recipes ─────────────────────────────────────────────────────────────

  async listRecipes(options: {
    tags?: string[];
    categories?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: RecipeSummary[]; total: number }> {
    try {
      const { tags, categories, limit = 50, offset = 0 } = options;
      const page = Math.floor(offset / limit) + 1;

      const params: Record<string, unknown> = {
        perPage: limit,
        page,
        orderBy: "name",
        orderDirection: "asc",
      };

      if (tags && tags.length > 0) {
        params["tags"] = tags.join(",");
      }
      if (categories && categories.length > 0) {
        params["categories"] = categories.join(",");
      }

      const response = await this.http.get<PaginatedResponse<RecipeSummary>>(
        "/recipes",
        { params }
      );
      return {
        items: response.data.items ?? [],
        total: response.data.total ?? 0,
      };
    } catch (error) {
      throw this.wrapError("list recipes", error);
    }
  }

  // ─── Create Recipe ────────────────────────────────────────────────────────────

  async createRecipe(input: AddRecipeInput): Promise<Recipe> {
    try {
      // Step 1: Create basic recipe to get a slug
      const createResponse = await this.http.post<string>("/recipes", {
        name: input.name,
      });

      // The API returns the slug as a plain string
      const slug = typeof createResponse.data === "string"
        ? createResponse.data.replace(/^"|"$/g, "") // strip surrounding quotes if present
        : createResponse.data;

      // Step 2: Build full recipe payload
      const ingredients: RecipeIngredient[] = input.ingredients.map((text) => ({
        note: text,
        disableAmount: true,
        display: text,
        originalText: text,
        isFood: false,
        quantity: null,
        unit: null,
        food: null,
        title: null,
      }));

      const instructions: RecipeInstruction[] = input.instructions
        .split(/\n+/)
        .map((step) => step.trim())
        .filter((step) => step.length > 0)
        .map((step) => ({ text: step }));

      const tags: RecipeTag[] = (input.tags ?? []).map((name) => ({ name }));

      const notes = input.notes
        ? [{ title: "Notes", text: input.notes }]
        : [];

      const updatePayload: Partial<Recipe> = {
        name: input.name,
        description: input.description ?? "",
        recipeIngredient: ingredients,
        recipeInstructions: instructions,
        tags,
        notes,
        prepTime: input.prepTime ?? null,
        cookTime: input.cookTime ?? null,
        totalTime: input.totalTime ?? null,
        recipeYield: input.recipeYield ?? null,
      };

      // Step 3: Update the recipe with full details
      await this.http.put(`/recipes/${slug}`, updatePayload);

      // Step 4: Return the full recipe
      return await this.getRecipe(slug);
    } catch (error) {
      throw this.wrapError("create recipe", error);
    }
  }

  // ─── Update Recipe ────────────────────────────────────────────────────────────

  async updateRecipe(input: UpdateRecipeInput): Promise<Recipe> {
    try {
      // Fetch current recipe first so we can merge updates
      const current = await this.getRecipe(input.recipe_id);
      const { updates } = input;

      const payload: Partial<Recipe> = {
        ...current,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.recipeYield !== undefined && { recipeYield: updates.recipeYield }),
        ...(updates.prepTime !== undefined && { prepTime: updates.prepTime }),
        ...(updates.cookTime !== undefined && { cookTime: updates.cookTime }),
        ...(updates.totalTime !== undefined && { totalTime: updates.totalTime }),
        ...(updates.recipeIngredient !== undefined && { recipeIngredient: updates.recipeIngredient }),
        ...(updates.recipeInstructions !== undefined && { recipeInstructions: updates.recipeInstructions }),
      };

      // Handle tags update
      if (updates.tags !== undefined) {
        payload.tags = updates.tags.map((name) => ({ name }));
      }

      // Handle notes update
      if (updates.notes !== undefined) {
        const existingNotes = current.notes ?? [];
        const generalNote = existingNotes.find((n) => n.title === "Notes");
        if (generalNote) {
          payload.notes = existingNotes.map((n) =>
            n.title === "Notes" ? { ...n, text: updates.notes! } : n
          );
        } else {
          payload.notes = [...existingNotes, { title: "Notes", text: updates.notes }];
        }
      }

      await this.http.put(`/recipes/${input.recipe_id}`, payload);
      return await this.getRecipe(input.recipe_id);
    } catch (error) {
      throw this.wrapError(`update recipe '${input.recipe_id}'`, error);
    }
  }

  // ─── Search by Ingredient ─────────────────────────────────────────────────────

  async searchByIngredient(ingredient: string, limit = 20): Promise<RecipeSummary[]> {
    try {
      // Mealie's search endpoint searches across name, description, ingredients, and instructions
      const response = await this.http.get<PaginatedResponse<RecipeSummary>>(
        "/recipes",
        {
          params: {
            search: ingredient,
            perPage: limit,
            page: 1,
            orderBy: "name",
            orderDirection: "asc",
          },
        }
      );

      const items = response.data.items ?? [];

      // Filter to only recipes that actually contain the ingredient in their text
      // We do a loose client-side filter since the API search is broad
      const lowerIngredient = ingredient.toLowerCase();
      return items.filter((recipe) => {
        const searchText = [
          recipe.name,
          recipe.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchText.includes(lowerIngredient);
      });
    } catch (error) {
      throw this.wrapError(`search by ingredient '${ingredient}'`, error);
    }
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────────

  async listTags(): Promise<RecipeTag[]> {
    try {
      const response = await this.http.get<PaginatedResponse<RecipeTag>>("/organizers/tags", {
        params: { perPage: 200, page: 1 },
      });
      return response.data.items ?? [];
    } catch (error) {
      throw this.wrapError("list tags", error);
    }
  }

  // ─── Error Handling ───────────────────────────────────────────────────────────

  private wrapError(operation: string, error: unknown): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;

      if (!error.response) {
        return new Error(
          `Mealie is unreachable during ${operation}. ` +
            `Check that MEALIE_URL is correct and Mealie is running. ` +
            `Original error: ${error.message}`
        );
      }

      switch (status) {
        case 401:
          return new Error(
            `Authentication failed during ${operation}. ` +
              `Check that MEALIE_API_KEY is correct and has not expired.`
          );
        case 403:
          return new Error(
            `Permission denied during ${operation}. ` +
              `The API key may not have sufficient permissions.`
          );
        case 404:
          return new Error(
            `Resource not found during ${operation}. ` +
              `The recipe ID or slug may be incorrect.`
          );
        case 422: {
          const detail = (error.response?.data as { detail?: unknown })?.detail;
          return new Error(
            `Validation error during ${operation}: ${JSON.stringify(detail)}`
          );
        }
        case 429:
          return new Error(
            `Rate limit exceeded during ${operation}. Please try again later.`
          );
        default:
          return new Error(
            `Mealie API error during ${operation}: ${status} ${statusText}`
          );
      }
    }

    if (error instanceof Error) {
      return new Error(`Error during ${operation}: ${error.message}`);
    }

    return new Error(`Unknown error during ${operation}`);
  }
}
