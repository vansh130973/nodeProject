import express from "express";
import cors from "cors";
import { createServer } from "http";
import { authenticate } from "./middlewares/authMiddleware.js";
import { sendSuccessResponse } from "./common/http/response.js";

// ─── Route modules ────────────────────────────────────────────────────────────
import userRoutes                                       from "./modules/user/user.routes.js";
import adminRoutes                                      from "./modules/admin/admin.routes.js";
import { userTicketRouter, adminTicketRouter }          from "./modules/ticket/ticket.routes.js";
import { userNotificationRouter, adminNotificationRouter } from "./modules/notification/notification.routes.js";
import moduleRoutes                                     from "./modules/module/module.routes.js";
import roleRoutes                                       from "./modules/role/role.routes.js";

const app        = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ─── Session restore ──────────────────────────────────────────────────────────
app.get("/me", authenticate, (req, res) =>
  sendSuccessResponse(res, "Session restored", { data: req.user })
);

// ─── Route mounting ───────────────────────────────────────────────────────────
//  User routes
app.use("/",                    userRoutes);               // /login /register /profile …
app.use("/tickets",             userTicketRouter);          // /tickets  /tickets/:id …
app.use("/notifications",       userNotificationRouter);    // /notifications  /notifications/read-all …

//  Admin routes  (must mount specific sub-paths before the broad /admin catch-all)
app.use("/admin/modules",       moduleRoutes);
app.use("/admin/roles",         roleRoutes);
app.use("/admin/tickets",       adminTicketRouter);         // /admin/tickets  /admin/tickets/:id …
app.use("/admin/notifications", adminNotificationRouter);   // /admin/notifications  /admin/notifications/broadcast
app.use("/admin",               adminRoutes);               // /admin/users  /admin/admins …

// ─── Server init ──────────────────────────────────────────────────────────────

httpServer.listen(3200, () => console.log("Server running on port 3200"));