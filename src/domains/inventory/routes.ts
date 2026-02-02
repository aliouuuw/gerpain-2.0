import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";

const inventory = new OpenAPIHono();

// Get stock levels
inventory.get("/stock", (c) => {
  return c.json({
    success: true,
    data: {
      items: [
        {
          id: "1",
          name: "Farine T65",
          currentStock: 150,
          unit: "kg",
          minThreshold: 50,
          maxThreshold: 500,
          status: "normal",
          lastUpdated: new Date().toISOString()
        },
        {
          id: "2", 
          name: "Levure",
          currentStock: 8,
          unit: "kg",
          minThreshold: 10,
          maxThreshold: 50,
          status: "low",
          lastUpdated: new Date().toISOString()
        },
        {
          id: "3",
          name: "Sucre",
          currentStock: 75,
          unit: "kg", 
          minThreshold: 20,
          maxThreshold: 200,
          status: "normal",
          lastUpdated: new Date().toISOString()
        }
      ],
      totalItems: 3,
      criticalItems: 1
    }
  });
});

// Get inventory movements
inventory.get("/movements", (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const movements = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    id: `movement-${i + 1}`,
    productId: `product-${(i % 3) + 1}`,
    productName: ["Farine T65", "Levure", "Sucre"][i % 3],
    type: i % 2 === 0 ? "in" : "out",
    quantity: Math.floor(Math.random() * 50) + 5,
    unit: "kg",
    reason: i % 2 === 0 ? "Approvisionnement" : "Vente",
    date: new Date(Date.now() - i * 3600000).toISOString(),
    userId: "user-1",
    userName: "Admin User"
  }));

  return c.json({
    success: true,
    data: {
      movements,
      total: movements.length,
      limit
    }
  });
});

export { inventory };
