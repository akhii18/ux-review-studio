import { Router } from "express";
import { FindingsController } from "../controllers/findings.controller";

const router = Router();

// Recurring trends (no reviewId context)
router.get("/recurring", FindingsController.getRecurring);

// Per-finding actions
router.patch("/:id", FindingsController.update);
router.post("/:id/escalate", FindingsController.escalate);
router.patch("/:id/triage", FindingsController.triage);
router.post("/:id/comments", FindingsController.addComment);
router.post("/:id/regenerate", FindingsController.regenerate);
router.post("/:id/comments", FindingsController.addComment);
router.post("/:id/regenerate", FindingsController.regenerate);

export default router;
