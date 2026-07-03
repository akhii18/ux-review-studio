import { Router } from "express";
import { ReviewsController } from "../controllers/reviews.controller";
import { FindingsController } from "../controllers/findings.controller";

const router = Router();

// Review CRUD
router.get(    "/",                       ReviewsController.list);
router.post(   "/",                       ReviewsController.create);
router.post(   "/draft",                  ReviewsController.saveDraft);
router.post(   "/convert-legacy-doc",     ReviewsController.convertLegacyDoc);
router.get(    "/analytics",              ReviewsController.getAnalytics);
router.get(    "/:id",                    ReviewsController.getById);
router.delete( "/:id",                    ReviewsController.delete);
router.post(   "/:id/export",             ReviewsController.export);

// Asset upload
router.post(   "/:id/assets",             ReviewsController.saveAsset);

// AI pipeline
router.post(   "/:id/start",             ReviewsController.start);
router.get(    "/:id/progress",          ReviewsController.getProgress);

// Findings sub-routes (existing)
router.get(    "/:id/findings",          FindingsController.getByReview);
router.get(    "/:id/findings/grouped",  FindingsController.getGroupedByArea);
router.get(    "/:id/findings/untriaged", FindingsController.getNextUntriaged);

export default router;
