import { prisma } from "./config/prisma";

async function main() {
  console.log("Analyzing reviews parameters in the database...");
  const reviews = await prisma.review.findMany({
    select: {
      id: true,
      name: true,
      product: true,
      owner: true,
      createdAt: true,
      status: true,
      depth: true,
      reviewType: true,
      criteria: true,
      findingMetadataOptions: true,
      findings: {
        select: {
          id: true,
          bboxRefs: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 25
  });

  console.log("----------------------------------------------------------------------------------------------------");
  console.log("Review ID | Name | Depth | ReviewType | Criteria | Findings (Valid/Null)");
  console.log("----------------------------------------------------------------------------------------------------");
  for (const r of reviews) {
    let validCount = 0;
    let nullCount = 0;
    for (const f of r.findings) {
      if (f.bboxRefs && Array.isArray(f.bboxRefs) && f.bboxRefs.length > 0) {
        validCount++;
      } else {
        nullCount++;
      }
    }
    console.log(`${r.id} | ${r.name.slice(0, 15)} | ${r.depth} | ${r.reviewType} | ${JSON.stringify(r.criteria)} | ${r.findings.length} (${validCount}v / ${nullCount}n)`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
