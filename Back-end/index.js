import express from "express";
import cors from "cors";

import userRoutes   from "./modules/user/user.routes.js";
import adminRoutes  from "./modules/admin/admin.routes.js";
import moduleRoutes from "./modules/module/module.routes.js";
import roleRoutes   from "./modules/role/role.routes.js";

import { authenticate } from "./middlewares/authMiddleware.js";
import { sendSuccessResponse } from "./utils/response.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/me", authenticate, (req, res) => {
  sendSuccessResponse(res, "Session restored", { data: req.user });
});

app.use("/uploads", express.static("uploads"));

app.use("/", userRoutes);
// Register specific /admin/* sub-routers before the broad /admin router so paths like
// /admin/modules/:id are never swallowed or mis-handled by the main admin router.
app.use("/admin/modules", moduleRoutes);
app.use("/admin/roles", roleRoutes);
app.use("/admin", adminRoutes);

app.listen(3200, () => console.log("Server running on port 3200"));
