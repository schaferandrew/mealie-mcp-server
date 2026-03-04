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
