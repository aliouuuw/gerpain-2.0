import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";

const core = new OpenAPIHono();

// Get current user's company
core.get("/companies/me", (c) => {
  return c.json({
    success: true,
    data: {
      id: "company-1",
      name: "Boulangerie Gerpain",
      email: "contact@gerpain.com",
      phone: "+221 33 123 45 67",
      address: {
        street: "123 Rue du Pain",
        city: "Dakar",
        country: "Sénégal",
        postalCode: "12345"
      },
      settings: {
        currency: "XOF",
        timezone: "Africa/Dakar",
        language: "fr"
      }
    }
  });
});

export { core };
