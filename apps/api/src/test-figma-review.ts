import bcrypt from "bcryptjs";
import { prisma } from "./config/prisma";
import { runReviewPipeline } from "./services/ai/agentic";

function resolveFigmaUrl(): string {
  const cliUrl = process.argv[2]?.trim();
  const envUrl = process.env.FIGMA_TEST_URL?.trim();
  const url = cliUrl || envUrl;

  if (!url) {
    throw new Error("Provide a public Figma prototype URL as the first CLI argument or set FIGMA_TEST_URL.");
  }

  return url;
}

async function main() {
  const figmaUrl = resolveFigmaUrl();
  const keepArtifacts = process.env.FIGMA_TEST_KEEP_REVIEW === "true";

  const testUser = await prisma.user.upsert({
    where: { email: "figma.pipeline.test@uxreview.local" },
    update: {},
    create: {
      name: "Figma Pipeline Test",
      email: "figma.pipeline.test@uxreview.local",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  });

  console.log("Creating Figma review smoke test record...");
  const review = await prisma.review.create({
    data: {
      userId: testUser.id,
      name: `Figma Review Smoke Test ${new Date().toISOString()}`,
      product: "Figma Prototype",
      domain: "enterprise",
      reviewType: "full",
      owner: "Figma Pipeline Test",
      criteria: [
        "nielsensHeuristics",
        "navigationLogic",
        "taskFlowEfficiency",
        "wcagConformance",
        "keyboardNavigation",
        "designSystemTokens",
        "microcopyClarity",
      ],
      depth: "standard",
      confidenceThreshold: 75,
      status: "draft",
      analysisScope: "key",
    },
  });

  await prisma.asset.create({
    data: {
      reviewId: review.id,
      name: "Context notes",
      mimeType: "text/plain",
      contentText: [
        `Figma URL: ${figmaUrl}`,
        "Smoke test review created from a Figma-only input path.",
        "The pipeline should capture prototype screens before AI analysis starts.",
      ].join("\n\n"),
    },
  });

  console.log("Running full review pipeline...");

  try {
    await runReviewPipeline(review.id);

    const finishedReview = await prisma.review.findUnique({
      where: { id: review.id },
      include: {
        assets: true,
        findings: true,
        reports: true,
      },
    });

    console.log("Figma review smoke test succeeded.");
    console.log({
      reviewId: finishedReview?.id,
      status: finishedReview?.status,
      stage: finishedReview?.stage,
      uxScore: finishedReview?.uxScore,
      assetCount: finishedReview?.assets.length,
      imageAssetCount: finishedReview?.assets.filter((asset) => asset.mimeType.startsWith("image/")).length,
      findingCount: finishedReview?.findings.length,
      reportCount: finishedReview?.reports.length,
    });
  } finally {
    if (!keepArtifacts) {
      console.log("Cleaning up Figma smoke test review...");
      await prisma.review.delete({ where: { id: review.id } }).catch(() => undefined);
    } else {
      console.log(`Keeping smoke test review ${review.id} because FIGMA_TEST_KEEP_REVIEW=true.`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Figma review smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());