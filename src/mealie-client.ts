import axios, { AxiosInstance, AxiosError } from "axios";
import {
  Recipe,
  RecipeSummary,
  RecipeTag,
  PaginatedResponse,
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

  // ─── Create Recipe from URL ───────────────────────────────────────────────────

  async createRecipeFromUrl(
    url: string,
    includeTags = false,
    includeCategories = false
  ): Promise<Recipe> {
    try {
      const response = await this.http.post<string>("/recipes/create/url", {
        url,
        includeTags,
        includeCategories,
      });

      const slug = typeof response.data === "string"
        ? response.data.replace(/^"|"$/g, "")
        : response.data;

      return await this.getRecipe(slug);
    } catch (error) {
      throw this.wrapError(`create recipe from URL '${url}'`, error);
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

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private toTagSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
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
