import express from "express";
import cors from "cors";
import userRoutes from "./modules/user/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/", userRoutes);
app.use("/admin", adminRoutes);

app.listen(3200)