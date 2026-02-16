import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// Monthly trends - últimos 6 meses de pedidos
app.get("/monthly-trends", async (c) => {
  try {
    const db = c.env.DB;
    
    // Get orders from last 6 months grouped by month
    const trends = await db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as order_count,
        SUM(total_amount) as total_spent,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all();

    return c.json({ trends: trends.results || [] });
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    return c.json({ error: "Failed to fetch monthly trends", trends: [] }, 500);
  }
});

// Restock recommendations - produtos que precisam de reposição
app.get("/restock-recommendations", async (c) => {
  try {
    const db = c.env.DB;
    
    // Get products that need restocking based on sales and current stock
    // This is a simplified version - you'd need actual sales data
    const recommendations = await db.prepare(`
      SELECT 
        p.sku,
        p.name as title,
        p.stock as current_stock,
        COALESCE(SUM(sd.units), 0) as total_units_sold,
        COALESCE(AVG(sd.units), 0) as avg_sales,
        p.price,
        p.image_url as product_image_url,
        CASE 
          WHEN p.stock < 10 THEN 30
          WHEN p.stock < 30 THEN 60
          ELSE 90
        END as min_stock_30d,
        CASE 
          WHEN p.stock < 10 THEN 30 - p.stock
          WHEN p.stock < 30 THEN 60 - p.stock
          ELSE 0
        END as shortage,
        CASE 
          WHEN p.stock < 10 THEN 50
          WHEN p.stock < 30 THEN 100
          ELSE 150
        END as recommended_order_qty,
        CASE 
          WHEN p.stock < 10 THEN 3
          WHEN p.stock < 30 THEN 15
          ELSE 45
        END as days_until_stockout,
        CASE 
          WHEN p.stock < 10 THEN 'high'
          WHEN p.stock < 30 THEN 'medium'
          ELSE 'low'
        END as urgency
      FROM products p
      LEFT JOIN spreadsheet_data sd ON p.sku = sd.sku
      WHERE p.status = 'Ativo'
      GROUP BY p.id, p.sku, p.name, p.stock, p.price, p.image_url
      HAVING shortage > 0
      ORDER BY urgency DESC, shortage DESC
      LIMIT 100
    `).all();

    // Calculate estimated cost for each recommendation
    const enrichedRecommendations = (recommendations.results || []).map((rec: any) => ({
      ...rec,
      estimated_cost: (rec.recommended_order_qty * (rec.price || 0)).toFixed(2)
    }));

    return c.json({ recommendations: enrichedRecommendations });
  } catch (error) {
    console.error("Error fetching restock recommendations:", error);
    return c.json({ error: "Failed to fetch recommendations", recommendations: [] }, 500);
  }
});

// Supplier performance
app.get("/supplier-performance", async (c) => {
  try {
    const db = c.env.DB;
    
    const suppliers = await db.prepare(`
      SELECT 
        s.id,
        COALESCE(s.company_name, s.name) as name,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        SUM(CASE WHEN o.status = 'Completo' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN o.status = 'Em Produção' THEN 1 ELSE 0 END) as production_orders,
        SUM(CASE WHEN o.status = 'Pendente' THEN 1 ELSE 0 END) as pending_orders,
        COUNT(DISTINCT oi.product_id) as products_supplied,
        ROUND(CAST(SUM(CASE WHEN o.status = 'Completo' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(o.id), 1) as completion_rate,
        CASE 
          WHEN ROUND(CAST(SUM(CASE WHEN o.status = 'Completo' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(o.id), 1) >= 90 THEN 'excellent'
          WHEN ROUND(CAST(SUM(CASE WHEN o.status = 'Completo' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(o.id), 1) >= 70 THEN 'good'
          WHEN ROUND(CAST(SUM(CASE WHEN o.status = 'Completo' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(o.id), 1) >= 50 THEN 'fair'
          ELSE 'poor'
        END as performance_rating
      FROM suppliers s
      LEFT JOIN orders o ON s.id = o.supplier_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id IS NOT NULL
      GROUP BY s.id, s.company_name, s.name
      HAVING total_orders > 0
      ORDER BY completion_rate DESC, total_spent DESC
    `).all();

    return c.json({ suppliers: suppliers.results || [] });
  } catch (error) {
    console.error("Error fetching supplier performance:", error);
    return c.json({ error: "Failed to fetch supplier performance", suppliers: [] }, 500);
  }
});

// Cost analysis - últimos 3 meses
app.get("/cost-analysis", async (c) => {
  try {
    const db = c.env.DB;
    
    // Get products with their ABC curve based on sales volume
    // First, calculate total sales for classification
    const productsWithSales = await db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name as title,
        p.image_url as product_image_url,
        p.category,
        COALESCE(SUM(sd.units), 0) as total_units_sold,
        COALESCE(SUM(sd.revenue), 0) as total_revenue
      FROM products p
      LEFT JOIN spreadsheet_data sd ON p.sku = sd.sku
      WHERE p.status = 'Ativo'
      GROUP BY p.id, p.sku, p.name, p.image_url, p.category
      HAVING total_units_sold > 0
      ORDER BY total_revenue DESC
    `).all();

    const products = productsWithSales.results || [];
    const totalRevenue = products.reduce((sum: number, p: any) => sum + (p.total_revenue || 0), 0);
    
    // Classify products into ABC curve
    let cumulativeRevenue = 0;
    const productsWithCurve = products.map((p: any) => {
      cumulativeRevenue += p.total_revenue;
      const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;
      
      let curve = 'C';
      let rotation = 'Baixa';
      
      if (cumulativePercent <= 80) {
        curve = 'A';
        rotation = 'Alta';
      } else if (cumulativePercent <= 95) {
        curve = 'B';
        rotation = 'Média';
      }
      
      return { ...p, curve, rotation };
    });

    // Get spending by curve and rotation from orders
    const orderData = await db.prepare(`
      SELECT 
        oi.sku,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_units,
        SUM(oi.subtotal) as total_spent
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= date('now', '-3 months')
      GROUP BY oi.sku
    `).all();

    const orderMap = new Map((orderData.results || []).map((o: any) => [o.sku, o]));

    // Enrich products with order data
    const enrichedProducts = productsWithCurve.map((p: any) => {
      const orderInfo = orderMap.get(p.sku) || { order_count: 0, total_units: 0, total_spent: 0 };
      return { ...p, ...orderInfo };
    });

    // Aggregate by curve
    const byCurve = ['A', 'B', 'C'].map(curve => {
      const curveProducts = enrichedProducts.filter((p: any) => p.curve === curve);
      return {
        curve,
        total_spent: curveProducts.reduce((sum: number, p: any) => sum + (p.total_spent || 0), 0),
        product_count: curveProducts.length
      };
    });

    // Aggregate by rotation
    const byRotation = ['Alta', 'Média', 'Baixa'].map(rotation => {
      const rotationProducts = enrichedProducts.filter((p: any) => p.rotation === rotation);
      return {
        rotation,
        total_spent: rotationProducts.reduce((sum: number, p: any) => sum + (p.total_spent || 0), 0),
        product_count: rotationProducts.length
      };
    });

    // Top 20 products by spending
    const topProducts = enrichedProducts
      .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 20);

    return c.json({
      byCurve,
      byRotation,
      topProducts
    });
  } catch (error) {
    console.error("Error fetching cost analysis:", error);
    return c.json({ 
      error: "Failed to fetch cost analysis",
      byCurve: [],
      byRotation: [],
      topProducts: []
    }, 500);
  }
});

// Inventory health
app.get("/inventory-health", async (c) => {
  try {
    const db = c.env.DB;
    
    // Overall metrics
    const overallMetrics = await db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'Ativo' THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN price = 0 OR price IS NULL THEN 1 ELSE 0 END) as pending_cost_count,
        SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM spreadsheet_data sd WHERE sd.sku = products.sku
        ) THEN 1 ELSE 0 END) as no_sales_products
      FROM products
    `).first();

    // Get products with sales data for classification
    const productsData = await db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.stock,
        p.status,
        COALESCE(SUM(sd.units), 0) as total_units_sold,
        COALESCE(SUM(sd.revenue), 0) as total_revenue
      FROM products p
      LEFT JOIN spreadsheet_data sd ON p.sku = sd.sku
      GROUP BY p.id, p.sku, p.stock, p.status
    `).all();

    const products = productsData.results || [];
    const totalRevenue = products.reduce((sum: number, p: any) => sum + (p.total_revenue || 0), 0);
    
    // Classify into ABC curve
    let cumulativeRevenue = 0;
    const sortedProducts = [...products].sort((a: any, b: any) => (b.total_revenue || 0) - (a.total_revenue || 0));
    
    const productsWithClassification = sortedProducts.map((p: any) => {
      cumulativeRevenue += (p.total_revenue || 0);
      const cumulativePercent = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
      
      let curve = 'C';
      let rotation = 'Baixa';
      
      if (cumulativePercent <= 80) {
        curve = 'A';
        rotation = 'Alta';
      } else if (cumulativePercent <= 95) {
        curve = 'B';
        rotation = 'Média';
      }
      
      // Determine rotation based on sales velocity
      if (p.total_units_sold === 0) {
        rotation = 'Crítica';
      }
      
      return { ...p, curve, rotation };
    });

    // Rotation breakdown
    const rotationBreakdown = ['Alta', 'Média', 'Baixa', 'Crítica'].map(rotation => {
      const rotationProducts = productsWithClassification.filter((p: any) => p.rotation === rotation);
      return {
        rotation,
        count: rotationProducts.length,
        in_stock: rotationProducts.filter((p: any) => p.stock > 0).length,
        out_of_stock: rotationProducts.filter((p: any) => p.stock === 0).length
      };
    });

    // Curve breakdown
    const curveBreakdown = ['A', 'B', 'C'].map(curve => {
      const curveProducts = productsWithClassification.filter((p: any) => p.curve === curve);
      return {
        curve,
        count: curveProducts.length,
        pending_cost_count: curveProducts.filter((p: any) => !p.total_revenue || p.total_revenue === 0).length
      };
    });

    return c.json({
      overallMetrics,
      rotationBreakdown,
      curveBreakdown
    });
  } catch (error) {
    console.error("Error fetching inventory health:", error);
    return c.json({ 
      error: "Failed to fetch inventory health",
      overallMetrics: {
        total_products: 0,
        active_products: 0,
        pending_cost_count: 0,
        no_sales_products: 0
      },
      rotationBreakdown: [],
      curveBreakdown: []
    }, 500);
  }
});

export default app;
