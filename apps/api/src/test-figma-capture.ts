import { captureFigmaPrototype } from "./services/figmaCapture.service";

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
  const url = resolveFigmaUrl();
  const maxScreens = Number.parseInt(process.env.FIGMA_TEST_MAX_SCREENS ?? "6", 10);

  console.log("Starting Figma capture smoke test...");
  console.log("URL:", url);
  console.log("Max screens:", maxScreens);

  const result = await captureFigmaPrototype({ url, maxScreens });

  console.log("Capture succeeded.");
  console.log("Requested URL:", result.requestedUrl);
  console.log("Final URL:", result.finalUrl);
  console.log("Visited URLs:", result.visitedUrls);
  console.log("Titles:", result.titles);
  console.log("Navigation summary:", result.navigationSummary);
  console.log(
    "Captured screens:",
    result.screens.map((screen, index) => ({
      index: index + 1,
      name: screen.name,
      sourceUrl: screen.sourceUrl,
      sizeBytes: screen.sizeBytes,
      title: screen.title,
      textPreview: screen.contentText.slice(0, 160),
    }))
  );
}

main().catch((error) => {
  console.error("Figma capture smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});