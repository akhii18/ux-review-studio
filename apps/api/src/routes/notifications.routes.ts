import { Router } from "express";
import { NotificationsController } from "../controllers/notifications.controller";

const router = Router();

router.get("/", NotificationsController.list);
router.post("/", NotificationsController.create);
router.patch("/read-all", NotificationsController.markAllRead);
router.patch("/:id/read", NotificationsController.markRead);
router.delete("/", NotificationsController.clear);

export default router;