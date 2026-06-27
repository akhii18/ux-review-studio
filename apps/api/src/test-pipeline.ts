import { prisma } from "./config/prisma";
import { runReviewPipeline } from "./services/ai/agentic";
import bcrypt from "bcryptjs";

async function testPipeline() {
  const testUser = await prisma.user.upsert({
    where: { email: "pipeline.test@uxreview.local" },
    update: {},
    create: {
      name: "Pipeline Test",
      email: "pipeline.test@uxreview.local",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  });

  console.log("Creating test review in database...");
  const review = await prisma.review.create({
    data: {
      userId: testUser.id,
      name: "Diagnostics Test Review",
      product: "Test Portal",
      domain: "bfsi",
      reviewType: "full",
      owner: "User",
      criteria: ["Nielsen's 10 heuristics", "WCAG 2.2 AA conformance"],
      depth: "standard",
      confidenceThreshold: 75,
      status: "draft",
    }
  });
  console.log("Review created with ID:", review.id);

  console.log("Uploading dummy context asset...");
  await prisma.asset.create({
    data: {
      reviewId: review.id,
      name: "Context notes",
      mimeType: "text/plain",
      contentText: "This is a banking dashboard application. It has low contrast text on some CTA buttons.",
    }
  });

  console.log("Executing runReviewPipeline...");
  try {
    await runReviewPipeline(review.id);
    console.log("SUCCESS! Review pipeline executed to completion.");
  } catch (error: any) {
    console.error("PIPELINE FAILED!");
    console.error("Message:", error?.message);
    console.error("Status:", error?.status);
    console.error("Stack:", error?.stack);
    console.error("Full Error:", error);
  } finally {
    // clean up
    console.log("Cleaning up test review records...");
    await prisma.review.delete({ where: { id: review.id } }).catch(() => {});
  }
}

testPipeline()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
