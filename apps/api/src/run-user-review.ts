import { prisma } from "./config/prisma";
import { runReviewPipeline } from "./services/ai/agentic";

async function main() {
  console.log("Fetching the latest review...");
  const latestReview = await prisma.review.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true }
  });
  if (!latestReview) {
    console.error("No reviews found in database!");
    return;
  }
  const reviewId = latestReview.id;
  console.log("Resetting findings and status for review:", latestReview.name, `(${reviewId})`);
  
  await prisma.finding.deleteMany({ where: { reviewId } });
  await prisma.report.deleteMany({ where: { reviewId } });
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "draft", stage: null, uxScore: null }
  });

  console.log("Starting runReviewPipeline for user's review...");
  try {
    await runReviewPipeline(reviewId);
    console.log("SUCCESS! Review pipeline ran to completion.");
  } catch (error: any) {
    console.error("PIPELINE FAILED!");
    console.error("Message:", error?.message);
    console.error("Status:", error?.status);
    console.error("Stack:", error?.stack);
    console.error("Full Error:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
