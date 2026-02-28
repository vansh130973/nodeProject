import express from "express"
import { registerUser, userProfile, updateUserProfile, loginUser } from "../controllers/usersController.js"

const router = express.Router()

router.post("/login", loginUser)
router.post("/register", registerUser)
router.post("/profile/:id", userProfile)
router.put("/updateProfile/:id", updateUserProfile)


export default router