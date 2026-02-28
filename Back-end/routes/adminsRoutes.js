import express from "express"
import { addAdmin, showAllUsers, showAllAdmins, loginAdmin } from "../controllers/adminsController.js"

const router = express.Router()

router.post("/add", addAdmin)
router.post("/login", loginAdmin)
router.get("/showAllUsers", showAllUsers)
router.get("/showAllAdmins", showAllAdmins)

export default router