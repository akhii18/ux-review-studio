import { prisma } from "./config/prisma";

async function main() {
  const reviewId = "cmr7uobmp000164l9jxm1both"; // An existing review ID
  console.log("Testing direct finding creation with bboxRefs...");
  
  const bboxRefs = [
    {
      screenIndex: 0,
      bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    }
  ];

  const created = await prisma.finding.create({
    data: {
      reviewId,
      title: "Test BBox Finding Creation",
      description: "Testing if bboxRefs saves correctly",
      recommendation: "test recommendation",
      severity: "P2",
      area: "USABILITY",
      screen: "Test Screen",
      principle: "Test Principle",
      observation: "test",
      why: "test why",
      status: "PROPOSED",
      isAiGenerated: true,
      bboxRefs,
    }
  });

  console.log("Created Finding ID:", created.id);
  console.log("Returned bboxRefs:", JSON.stringify(created.bboxRefs));
  
  // Refetch from database
  const refetched = await prisma.finding.findUnique({
    where: { id: created.id },
    select: { bboxRefs: true }
  });
  
  console.log("Refetched bboxRefs:", JSON.stringify(refetched?.bboxRefs));
  
  // Clean up
  await prisma.finding.delete({ where: { id: created.id } });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
