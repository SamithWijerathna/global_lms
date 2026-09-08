import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { tenantResolver } from "./middleware/tenantResolver";
import saasAdminRoutes from "./routes/saasAdmin";
import domainManagerRoutes from "./routes/domainManager";
import authRoutes from "./routes/auth";
import { sendSuccess, sendError } from "./lib/routeUtils";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Core Middlewares
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-slug, x-tenant-domain, x-tenant-id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 2. Health check
app.get("/api/v1/health", (req, res) => {
  return sendSuccess(res, { status: "healthy", timestamp: new Date().toISOString() });
});

// 3. Central SaaS Admin Routes (Super admin management & tenant provisioning)
app.use("/api/v1/saas-admin", saasAdminRoutes);

// 4. Tenant Resolution Middleware (Extracts host/domain/subdomain & binds tenant DB pool)
app.use(tenantResolver);

// 5. Tenant Routes
app.use("/api/v1/domains", domainManagerRoutes);
app.use("/api/v1/auth", authRoutes);

// 6. Fallback 404 handler
app.use((req, res) => {
  return sendError(res, 404, "ROUTE_NOT_FOUND", `Endpoint ${req.method} ${req.originalUrl} not found.`);
});

// 7. Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  return sendError(res, 500, "INTERNAL_SERVER_ERROR", err.message || "An unexpected error occurred.");
});

app.listen(PORT, () => {
  console.log(`🚀 Global LMS Backend running on port ${PORT}`);
  console.log(`🌐 Root Domain: ${process.env.ROOT_DOMAIN || "globallms.com"}`);
  console.log(`🔗 CNAME Target: ${process.env.DEFAULT_CNAME_TARGET || "cname.globallms.com"}`);
});
