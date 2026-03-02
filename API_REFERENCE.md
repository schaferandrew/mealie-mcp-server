# API Reference

Complete documentation for all tools exposed by the Mealie MCP Server.

---

## `search_recipes`

Search for recipes by name, keyword, or description. Optionally filter by tags.

### Input Schema

```json
{
  "type": "object",
  "required": ["query"],
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string (recipe name, keyword, or phrase)",
      "minLength": 1
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Optional list of tag names to filter results by"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return",
      "default": 20,
      "minimum": 1,
      "maximum": 100
    }
  }
}
```

### Output

A formatted list of matching recipes. Each entry includes:
- Recipe name and ID/slug
- Short description (if available)
- Prep/cook/total time
- Yield (servings)
- Tags

### Example Usage

```
User: "What pasta recipes do I have?"
→ Tool: search_recipes({ query: "pasta" })

User: "Find chicken recipes tagged with 'quick'"
→ Tool: search_recipes({ query: "chicken", tags: ["quick"] })

User: "Show me up to 5 soup recipes"
→ Tool: search_recipes({ query: "soup", limit: 5 })
```

### Example Response

```
Search results for "pasta"

- **Spaghetti Carbonara** (ID: `spaghetti-carbonara`)
  Classic Italian pasta with eggs, cheese, and pancetta
  Time: 30 minutes | Yield: 4 servings | Tags: Italian, quick
- **Pasta Primavera** (ID: `pasta-primavera`)
  Time: 25 minutes | Tags: vegetarian
```

---

## `get_recipe`

Retrieve the complete details for a single recipe, including all ingredients, step-by-step instructions, nutrition information, and notes.

### Input Schema

```json
{
  "type": "object",
  "required": ["recipe_id"],
  "properties": {
    "recipe_id": {
      "type": "string",
      "description": "Recipe ID (UUID) or slug",
      "minLength": 1
    }
  }
}
```

### Notes on `recipe_id`

- Use the **slug** (e.g., `spaghetti-carbonara`) from search or list results — it's human-readable
- Or use the **UUID** (e.g., `550e8400-e29b-41d4-a716-446655440000`) from the Mealie URL
- Both formats are accepted

### Output

A fully formatted recipe including:
- Name, ID, and description
- Time information (prep, cook, total)
- Tags and categories
- Complete ingredient list
- Numbered step-by-step instructions
- Nutrition information (if available)
- Notes and tips

### Example Usage

```
User: "Get the full recipe for spaghetti carbonara"
→ Tool: get_recipe({ recipe_id: "spaghetti-carbonara" })

User: "Show me all the details for recipe ID abc123"
→ Tool: get_recipe({ recipe_id: "abc123" })
```

### Example Response

```
# Spaghetti Carbonara
**ID/Slug:** `spaghetti-carbonara`

Classic Italian pasta with a creamy egg and cheese sauce.

Prep: 10 minutes | Cook: 20 minutes | Total: 30 minutes | Yield: 4 servings
**Tags:** Italian, pasta, quick

## Ingredients
- 400g spaghetti
- 200g pancetta or guanciale, diced
- 4 large eggs
- 100g Pecorino Romano, grated
- 50g Parmesan, grated
- Black pepper to taste
- Salt for pasta water

## Instructions
1. Bring a large pot of salted water to boil.
2. Cook spaghetti until al dente according to package instructions.
...
```

---

## `list_recipes`

List all recipes in your Mealie instance, with optional filtering by tags or categories. Supports pagination for large collections.

### Input Schema

```json
{
  "type": "object",
  "required": [],
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by tag names"
    },
    "categories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by category names"
    },
    "limit": {
      "type": "number",
      "description": "Recipes per page",
      "default": 50,
      "minimum": 1,
      "maximum": 200
    },
    "offset": {
      "type": "number",
      "description": "Number of recipes to skip (for pagination)",
      "default": 0,
      "minimum": 0
    }
  }
}
```

### Output

A paginated list of recipes with a header showing current page info and total count.

### Example Usage

```
User: "List all my recipes"
→ Tool: list_recipes({})

User: "Show me all vegetarian recipes"
→ Tool: list_recipes({ tags: ["vegetarian"] })

User: "Show me recipes 51-100"
→ Tool: list_recipes({ limit: 50, offset: 50 })

User: "What breakfast categories do I have?"
→ Tool: list_recipes({ categories: ["Breakfast"] })
```

### Pagination Example

```
User: "I have a lot of recipes, show me the next page"
→ Tool: list_recipes({ limit: 20, offset: 20 })
```

---

## `add_recipe`

Create a new recipe in Mealie. The recipe is created in two steps: first the name is registered to generate a slug, then the full details are applied.

### Input Schema

```json
{
  "type": "object",
  "required": ["name", "ingredients", "instructions"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Recipe name",
      "minLength": 1
    },
    "ingredients": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "description": "Ingredient list as strings",
      "minItems": 1
    },
    "instructions": {
      "type": "string",
      "description": "Cooking steps, separated by newlines",
      "minLength": 1
    },
    "description": {
      "type": "string",
      "description": "Short recipe description"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Tag names to apply"
    },
    "notes": {
      "type": "string",
      "description": "Additional tips or notes"
    },
    "prepTime": {
      "type": "string",
      "description": "Prep time (e.g. '15 minutes')"
    },
    "cookTime": {
      "type": "string",
      "description": "Cook time (e.g. '30 minutes')"
    },
    "totalTime": {
      "type": "string",
      "description": "Total time (e.g. '45 minutes')"
    },
    "recipeYield": {
      "type": "string",
      "description": "Yield/servings (e.g. '4 servings')"
    }
  }
}
```

### Output

The created recipe with all fields, including the assigned ID and slug.

### Example Usage

```
User: "Add a recipe for chocolate chip cookies"
→ Tool: add_recipe({
    name: "Chocolate Chip Cookies",
    ingredients: [
      "2 1/4 cups all-purpose flour",
      "1 tsp baking soda",
      "1 tsp salt",
      "2 sticks butter, softened",
      "3/4 cup granulated sugar",
      "3/4 cup brown sugar",
      "2 large eggs",
      "2 tsp vanilla extract",
      "2 cups chocolate chips"
    ],
    instructions: "Preheat oven to 375°F.\nCream butter and sugars until fluffy.\nBeat in eggs and vanilla.\nMix in flour, baking soda, and salt.\nStir in chocolate chips.\nDrop by spoonfuls onto baking sheets.\nBake 9-11 minutes until golden.",
    tags: ["dessert", "baking", "cookies"],
    prepTime: "15 minutes",
    cookTime: "11 minutes",
    totalTime: "26 minutes",
    recipeYield: "48 cookies"
  })
```

---

## `update_recipe`

Modify specific fields on an existing recipe. Only the fields you provide in `updates` will be changed — all other fields remain unchanged.

### Input Schema

```json
{
  "type": "object",
  "required": ["recipe_id", "updates"],
  "properties": {
    "recipe_id": {
      "type": "string",
      "description": "Recipe ID or slug to update",
      "minLength": 1
    },
    "updates": {
      "type": "object",
      "description": "Fields to update",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "recipeYield": { "type": "string" },
        "prepTime": { "type": "string" },
        "cookTime": { "type": "string" },
        "totalTime": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Replaces all existing tags"
        },
        "notes": {
          "type": "string",
          "description": "Updates or creates a 'Notes' section"
        }
      }
    }
  }
}
```

### Important Notes

- **`tags` replaces all existing tags** — include all tags you want, not just new ones
- **`notes` updates the "Notes" section** — creates it if it doesn't exist
- To update ingredients or instructions, use the Mealie web UI (full structured updates are complex)

### Output

The updated recipe with all current fields.

### Example Usage

```
User: "Add a 'quick' tag to my carbonara recipe"
→ First call get_recipe to see current tags, then:
→ Tool: update_recipe({
    recipe_id: "spaghetti-carbonara",
    updates: { tags: ["Italian", "pasta", "quick"] }  // include existing tags!
  })

User: "Update the yield on my cookie recipe to 36 cookies"
→ Tool: update_recipe({
    recipe_id: "chocolate-chip-cookies",
    updates: { recipeYield: "36 cookies" }
  })

User: "Add a note to my bread recipe about altitude adjustments"
→ Tool: update_recipe({
    recipe_id: "sourdough-bread",
    updates: { notes: "At high altitude (above 3500ft), reduce yeast by 25% and add 2 tbsp extra flour." }
  })
```

---

## `search_by_ingredient`

Find recipes that contain a specific ingredient. Searches across recipe names, descriptions, and ingredient lists.

### Input Schema

```json
{
  "type": "object",
  "required": ["ingredient"],
  "properties": {
    "ingredient": {
      "type": "string",
      "description": "Ingredient to search for",
      "minLength": 1
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return",
      "default": 20,
      "minimum": 1,
      "maximum": 100
    }
  }
}
```

### How It Works

The tool searches Mealie's full-text search for the ingredient name, then applies client-side filtering to verify the ingredient appears in the recipe text. Results may include recipes where the ingredient appears in the name or description, not just the ingredient list.

For best results, use specific ingredient names rather than generic terms:
- `"cream cheese"` → better than `"cheese"`
- `"chicken breast"` → better than `"chicken"`

### Output

A formatted list of matching recipes with basic info.

### Example Usage

```
User: "What can I make with cream cheese?"
→ Tool: search_by_ingredient({ ingredient: "cream cheese" })

User: "Find recipes using chickpeas"
→ Tool: search_by_ingredient({ ingredient: "chickpeas" })

User: "What recipes use coconut milk?"
→ Tool: search_by_ingredient({ ingredient: "coconut milk", limit: 10 })
```

---

## Error Handling

All tools return descriptive error messages when something goes wrong:

| Situation | Error Message |
|---|---|
| Mealie unreachable | `"Mealie is unreachable during [operation]. Check that MEALIE_URL is correct and Mealie is running."` |
| Invalid API key | `"Authentication failed during [operation]. Check that MEALIE_API_KEY is correct."` |
| Recipe not found | `"Resource not found during [operation]. The recipe ID or slug may be incorrect."` |
| Permission denied | `"Permission denied during [operation]. The API key may not have sufficient permissions."` |
| Rate limited | `"Rate limit exceeded during [operation]. Please try again later."` |
| Invalid parameters | `"Invalid parameters for tool '[name]': [details]"` |

Errors are returned as tool results (not exceptions), so Claude can read them and provide helpful guidance to the user.
