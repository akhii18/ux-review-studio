import { Router } from "express";
import { PrinciplesController } from "../controllers/principles.controller";

const router = Router();

router.get("/", PrinciplesController.getAll);
router.post("/", PrinciplesController.create);
router.patch("/:id", PrinciplesController.update);

export default router;
