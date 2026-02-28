import express from "express"
import usersRoutes from "./routes/usersRoutes.js"
import adminsRoutes from "./routes/adminsRoutes.js"

const app = express()

app.use(express.json())

app.use("/", usersRoutes)
app.use("/admin", adminsRoutes)

app.listen(3200)