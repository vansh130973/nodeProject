import express from "express"
import usersRoutes from "./routes/usersRoutes.js"
import adminsRoutes from "./routes/adminsRoutes.js"
import cors from "cors"

const app = express()
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json())

app.use("/", usersRoutes)
app.use("/admin", adminsRoutes)

app.listen(3200)