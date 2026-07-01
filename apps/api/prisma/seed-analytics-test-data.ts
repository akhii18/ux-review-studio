import "dotenv/config";
import { PrismaClient, ReviewArea, Severity, FindingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TARGET_USER_EMAIL = (process.env.SEED_ANALYTICS_USER_EMAIL ?? "default.user@uxreview.local").trim().toLowerCase();

const REVIEW_TYPES = ["full", "prd", "a11y", "ds", "content", "partial"] as const;
const DOMAINS = ["bfsi", "healthcare", "retail", "enterprise", "insurance"] as const;
const PRODUCTS = [
  "Retail Checkout",
  "Mobile Banking",
  "Claims Portal",
  "Provider Dashboard",
  "Admin Console",
] as const;

const AREAS: ReviewArea[] = [
  "USABILITY",
  "ACCESSIBILITY",
  "CONSISTENCY",
  "CONTENT_UX",
  "RISK",
  "RECOMMENDATIONS",
];

const SEVERITIES: Severity[] = ["P0", "P1", "P2"];
const FINDING_STATUSES: FindingStatus[] = ["PROPOSED", "ACCEPTED", "EDITED", "DISMISSED", "ESCALATED"];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function ensureSeedUser() {
  const existingUser = await prisma.user.findUnique({
    where: { email: TARGET_USER_EMAIL },
  });

  if (existingUser) return existingUser;

  const derivedName = TARGET_USER_EMAIL.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Analytics Test User";
  const displayName = derivedName
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return prisma.user.create({
    data: {
      name: displayName || "Analytics Test User",
      email: TARGET_USER_EMAIL,
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
      isEmailVerified: true,
    },
  });
}

async function main() {
  console.log("🌱 Seeding analytics test data (3 months, 10 reviews)…");

  const user = await ensureSeedUser();

  const createdReviewIds: string[] = [];

  for (let i = 0; i < 10; i += 1) {
    const createdAt = daysAgo(i * 9 + 2);
    const updatedAt = daysAgo(i * 9);
    const status = i % 4 === 0 ? "draft" : i % 4 === 1 ? "in_progress" : "completed";

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        name: `Analytics Test Review ${i + 1}`,
        product: PRODUCTS[i % PRODUCTS.length],
        domain: DOMAINS[i % DOMAINS.length],
        reviewType: REVIEW_TYPES[i % REVIEW_TYPES.length],
        owner: user.name,
        status,
        stage: status === "completed" ? "completed" : status === "in_progress" ? "analyzing_screens" : "step-1",
        uxScore: status === "completed" ? 62 + ((i * 7) % 31) : null,
        criteria: ["nielsensHeuristics", "wcagConformance", "designSystemTokens"],
        depth: i % 3 === 0 ? "quick" : i % 3 === 1 ? "standard" : "deep",
        confidenceThreshold: 70 + (i % 20),
        createdAt,
        updatedAt,
      },
    });

    createdReviewIds.push(review.id);

    const findingsToCreate = 3 + (i % 3);
    for (let j = 0; j < findingsToCreate; j += 1) {
      const findingCreatedAt = daysAgo(i * 9 + (j % 5));

      await prisma.finding.create({
        data: {
          reviewId: review.id,
          title: `Test finding ${i + 1}-${j + 1}`,
          description: "Generated test finding for analytics validation",
          recommendation: "Apply suggested UX fix and verify with follow-up review",
          severity: SEVERITIES[(i + j) % SEVERITIES.length],
          area: AREAS[(i + j) % AREAS.length],
          status: FINDING_STATUSES[(i + j) % FINDING_STATUSES.length],
          confidence: 65 + ((i + j) % 30),
          createdAt: findingCreatedAt,
          updatedAt: findingCreatedAt,
        },
      });
    }
  }

  console.log(`✅ Created 10 reviews for user: ${user.email}`);
  console.log(`✅ Review IDs: ${createdReviewIds.join(", ")}`);
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed analytics test data", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
