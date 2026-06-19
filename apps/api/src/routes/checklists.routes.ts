import { Router } from "express";
import { ChecklistsController } from "../controllers/checklists.controller";

const router = Router();

router.get("/", ChecklistsController.getAll);
router.post("/", ChecklistsController.create);
router.get("/:id", ChecklistsController.getById);
router.patch("/:id", ChecklistsController.update);
router.post("/:id/approve", ChecklistsController.approve);

export default router;
