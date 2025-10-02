import { Router } from "express";
import UserController from "../controllers/UserController.js";

const router = Router();
const userController = new UserController();

// user routes
router.get("/:id", userController.getUserById.bind(userController));
router.put("/:id", userController.updateUser.bind(userController));
router.get("/:id/positions", userController.getUserPositions.bind(userController));
router.get("/:id/history", userController.getUserHistory.bind(userController));
router.get("/leaderboard", userController.getLeaderboard.bind(userController));

export default router;
