import { Hono } from "hono";

const collectionPoints = new Hono<{ Bindings: Env }>();

// Helper to get user from token
async function getUserFromToken(c: any) {
  const token = c.req.header("Authorization")?.substring(7);
  if (!token?.startsWith("user_")) {
    return null;
  }
  
  const userId = token.substring(5);
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();
  
  return user;
}

// Get all collection points (public, for users)
collectionPoints.get("/", async (c) => {
  try {
    const points = await c.env.DB.prepare(
      `SELECT * FROM collection_points WHERE is_active = 1 ORDER BY name`
    ).all();

    const pointsWithMarketplaces = await Promise.all(
      (points.results || []).map(async (point: any) => {
        const marketplaces = await c.env.DB.prepare(
          `SELECT m.id, m.name, m.slug, m.logo_url, m.is_active
           FROM marketplaces m
           INNER JOIN collection_point_marketplaces cpm ON m.id = cpm.marketplace_id
           WHERE cpm.collection_point_id = ? AND m.is_active = 1
           ORDER BY m.name`
        )
          .bind(point.id)
          .all();

        return {
          ...point,
          marketplaces: marketplaces.results || [],
        };
      })
    );

    return c.json({ collection_points: pointsWithMarketplaces });
  } catch (error: any) {
    console.error("Failed to fetch collection points:", error);
    return c.json({ error: "Failed to fetch collection points" }, 500);
  }
});

// Get collection point by ID
collectionPoints.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const point = await c.env.DB.prepare(
      `SELECT * FROM collection_points WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!point) {
      return c.json({ error: "Collection point not found" }, 404);
    }

    return c.json({ point });
  } catch (error: any) {
    console.error("Failed to fetch collection point:", error);
    return c.json({ error: "Failed to fetch collection point" }, 500);
  }
});

// Search collection points with filters
collectionPoints.post("/search", async (c) => {
  try {
    const user = await getUserFromToken(c);
    const body = await c.req.json();
    const { service_type, marketplace_ids, adjust_filters } = body;
    // Future use: cep, schedule_type, schedule_date, schedule_time for location-based and schedule filtering

    // Get all active collection points
    const points = await c.env.DB.prepare(
      `SELECT cp.* FROM collection_points cp WHERE cp.is_active = 1`
    ).all();

    let filteredPoints: any[] = [];
    const removedMarketplaces: any[] = [];
    const activeMarketplaceIds = marketplace_ids || [];

    // For each point, check if it meets the criteria
    for (const point of (points.results || [])) {
      // Check service type
      if (service_type === "returns" && (point as any).accepts_returns !== 1) continue;
      if (service_type === "orders" && (point as any).accepts_orders !== 1) continue;

      // Get point's marketplaces
      const pointMarketplaces = await c.env.DB.prepare(
        `SELECT m.id, m.name, m.slug, m.logo_url, m.is_active
         FROM marketplaces m
         INNER JOIN collection_point_marketplaces cpm ON m.id = cpm.marketplace_id
         WHERE cpm.collection_point_id = ? AND m.is_active = 1`
      ).bind((point as any).id).all();

      // Check if point has at least one of the selected marketplaces
      const pointMarketplaceIds = (pointMarketplaces.results || []).map((m: any) => m.id);
      const hasMarketplace = activeMarketplaceIds.some((id: number) => pointMarketplaceIds.includes(id));
      
      if (!hasMarketplace) continue;

      // Get reviews
      const reviewsResult = await c.env.DB.prepare(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
         FROM collection_point_reviews
         WHERE collection_point_id = ?`
      ).bind((point as any).id).first();

      // Check user preferences if logged in
      let isFavorite = false;
      let isBlocked = false;
      
      if (user) {
        const preference = await c.env.DB.prepare(
          `SELECT * FROM user_collection_point_preferences
           WHERE user_id = ? AND collection_point_id = ?`
        ).bind((user as any).id, (point as any).id).first();
        
        if (preference) {
          isFavorite = (preference as any).is_favorite === 1;
          isBlocked = (preference as any).is_blocked === 1;
        }
      }

      // Skip blocked points
      if (isBlocked) continue;

      filteredPoints.push({
        ...(point as any),
        avg_rating: (reviewsResult as any)?.avg_rating || 0,
        review_count: (reviewsResult as any)?.review_count || 0,
        marketplaces: pointMarketplaces.results || [],
        is_favorite: isFavorite,
        is_blocked: isBlocked,
      });
    }

    // Sort: favorites first, then by name
    filteredPoints.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return a.name.localeCompare(b.name);
    });

    return c.json({ 
      points: filteredPoints,
      removed_marketplaces: removedMarketplaces,
      adjusted: adjust_filters || false
    });
  } catch (error: any) {
    console.error("Failed to search collection points:", error);
    return c.json({ error: "Failed to search collection points" }, 500);
  }
});

// Get reviews for a collection point
collectionPoints.get("/:id/reviews", async (c) => {
  try {
    const id = c.req.param("id");
    const reviews = await c.env.DB.prepare(
      `SELECT r.*, u.email as user_email
       FROM collection_point_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.collection_point_id = ?
       ORDER BY r.created_at DESC`
    ).bind(id).all();

    return c.json({ reviews: reviews.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch reviews:", error);
    return c.json({ error: "Failed to fetch reviews" }, 500);
  }
});

// Get user's review for a collection point
collectionPoints.get("/:id/my-review", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const review = await c.env.DB.prepare(
      `SELECT * FROM collection_point_reviews
       WHERE collection_point_id = ? AND user_id = ?`
    ).bind(id, (user as any).id).first();

    return c.json({ review: review || null });
  } catch (error: any) {
    console.error("Failed to fetch user review:", error);
    return c.json({ error: "Failed to fetch review" }, 500);
  }
});

// Create or update a review
collectionPoints.post("/:id/reviews", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is blocked from reviewing
    if ((user as any).penalty_points >= 3) {
      return c.json({ error: "You are blocked from reviewing" }, 403);
    }

    const id = c.req.param("id");
    const body = await c.req.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: "Invalid rating" }, 400);
    }

    // Check if user already has a review
    const existing = await c.env.DB.prepare(
      `SELECT * FROM collection_point_reviews
       WHERE collection_point_id = ? AND user_id = ?`
    ).bind(id, (user as any).id).first();

    if (existing) {
      // Update existing review
      await c.env.DB.prepare(
        `UPDATE collection_point_reviews
         SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(rating, comment || null, (existing as any).id).run();
    } else {
      // Create new review
      await c.env.DB.prepare(
        `INSERT INTO collection_point_reviews (collection_point_id, user_id, rating, comment)
         VALUES (?, ?, ?, ?)`
      ).bind(id, (user as any).id, rating, comment || null).run();
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save review:", error);
    return c.json({ error: "Failed to save review" }, 500);
  }
});

// Track route click
collectionPoints.post("/:id/track-route-click", async (c) => {
  try {
    const user = await getUserFromToken(c);
    const id = c.req.param("id");

    // Just log the click - you can expand this to store analytics if needed
    console.log(`User ${(user as any)?.id || 'anonymous'} clicked route for collection point ${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to track route click:", error);
    return c.json({ error: "Failed to track click" }, 500);
  }
});

// Toggle favorite
collectionPoints.post("/:id/favorite", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Check if preference exists
    const existing = await c.env.DB.prepare(
      `SELECT * FROM user_collection_point_preferences
       WHERE user_id = ? AND collection_point_id = ?`
    ).bind((user as any).id, id).first();

    if (existing) {
      // Toggle favorite
      await c.env.DB.prepare(
        `UPDATE user_collection_point_preferences
         SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind((existing as any).is_favorite === 1 ? 0 : 1, (existing as any).id).run();
    } else {
      // Create preference with favorite = 1
      await c.env.DB.prepare(
        `INSERT INTO user_collection_point_preferences (user_id, collection_point_id, is_favorite)
         VALUES (?, ?, 1)`
      ).bind((user as any).id, id).run();
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to toggle favorite:", error);
    return c.json({ error: "Failed to toggle favorite" }, 500);
  }
});

// Toggle block
collectionPoints.post("/:id/block", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Check if preference exists
    const existing = await c.env.DB.prepare(
      `SELECT * FROM user_collection_point_preferences
       WHERE user_id = ? AND collection_point_id = ?`
    ).bind((user as any).id, id).first();

    if (existing) {
      // Toggle block
      await c.env.DB.prepare(
        `UPDATE user_collection_point_preferences
         SET is_blocked = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind((existing as any).is_blocked === 1 ? 0 : 1, (existing as any).id).run();
    } else {
      // Create preference with block = 1
      await c.env.DB.prepare(
        `INSERT INTO user_collection_point_preferences (user_id, collection_point_id, is_blocked)
         VALUES (?, ?, 1)`
      ).bind((user as any).id, id).run();
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to toggle block:", error);
    return c.json({ error: "Failed to toggle block" }, 500);
  }
});

export default collectionPoints;
