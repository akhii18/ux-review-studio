import { prisma } from "./config/prisma";

async function main() {
  console.log("Fetching the latest review...");
  const latestReview = await prisma.review.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (!latestReview) {
    console.error("No reviews found in database!");
    return;
  }
  const reviewId = latestReview.id;
  console.log("Fetching review details for ID:", reviewId);
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      findings: {
        include: {
          reviewBasis: true,
        }
      },
      reports: true,
      assets: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        }
      }
    }
  });

  if (!review) {
    console.error("Review not found!");
    return;
  }

  console.log("Review Status:", review.status);
  console.log("Review Stage:", review.stage);
  console.log("Assets count:", review.assets.length);
  console.log("Assets:", review.assets);
  console.log("Findings count:", review.findings.length);
  console.log("Reports count:", review.reports.length);

  if (review.findings.length > 0) {
    console.log("\nSample Findings (first 3):", JSON.stringify(review.findings.slice(0, 3), null, 2));
  }
  if (review.reports.length > 0) {
    console.log("\nReports:", JSON.stringify(review.reports, null, 2));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
