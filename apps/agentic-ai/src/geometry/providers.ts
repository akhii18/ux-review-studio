import type { GeometryCandidate, GeometryOutput, ScreenMetadata } from "../schemas.js";

export type GeometryProviderResult = {
  candidates: GeometryCandidate[];
  providerNotes: string[];
};

export type GeometryProvider = {
  name: string;
  extract(screen: ScreenMetadata): Promise<GeometryProviderResult>;
};

export async function extractGeometryFromScreens(params: {
  screenMetadata: ScreenMetadata[];
  providers: GeometryProvider[];
}): Promise<GeometryOutput> {
  const { screenMetadata, providers } = params;
  const candidates: GeometryCandidate[] = [];
  const providerNotes: string[] = [];

  for (const provider of providers) {
    for (const screen of screenMetadata) {
      try {
        const result = await provider.extract(screen);
        candidates.push(...result.candidates);
        providerNotes.push(...result.providerNotes.map((note) => `${provider.name}: ${note}`));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        providerNotes.push(`${provider.name}: failed for ${screen.path}: ${message}`);
      }
    }
  }

  return {
    extractionMode: providers.map((provider) => provider.name).join("+") || "none",
    candidates,
    providerNotes,
  };
}