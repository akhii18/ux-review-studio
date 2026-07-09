import { prisma } from "./config/prisma";

async function main() {
  const successId = "cmr7npzun000111yoc0qfqlak"; // 5 valid / 0 null
  const failedId = "cmr7uobmp000164l9jxm1both";   // 0 valid / 5 null
  
  console.log("=== SUCCESSFUL RUN FINDINGS ===");
  const successFindings = await prisma.finding.findMany({
    where: { reviewId: successId },
    select: {
      id: true,
      title: true,
      bboxRefs: true,
      aiMetadata: true
    }
  });
  console.log(JSON.stringify(successFindings, null, 2));

  console.log("\n=== FAILED RUN FINDINGS ===");
  const failedFindings = await prisma.finding.findMany({
    where: { reviewId: failedId },
    select: {
      id: true,
      title: true,
      bboxRefs: true,
      aiMetadata: true
    }
  });
  console.log(JSON.stringify(failedFindings, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
