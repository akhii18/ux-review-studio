import { prisma } from "./config/prisma";

async function main() {
  console.log("Fetching reviews from database...");
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: { select: { findings: true } },
    }
  });
  console.log("Latest Reviews:\n", JSON.stringify(reviews, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
