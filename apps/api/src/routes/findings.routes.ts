import { Router } from "express";
import { FindingsController } from "../controllers/findings.controller";

const router = Router();

// Recurring trends (no reviewId context)
router.get("/recurring", FindingsController.getRecurring);

// Per-finding actions
router.patch("/:id", FindingsController.update);
router.post("/:id/escalate", FindingsController.escalate);
router.patch("/:id/triage", FindingsController.triage);

export default router;
