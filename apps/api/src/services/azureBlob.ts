import {
  BlobSASPermissions,
  BlobServiceClient,
  BlobHTTPHeaders,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { config } from "../config";

function parseConnectionString(connectionString: string): { accountName: string; accountKey: string } {
  const accountNameMatch = connectionString.match(/(?:^|;)AccountName=([^;]+)/i);
  const accountKeyMatch = connectionString.match(/(?:^|;)AccountKey=([^;]+)/i);

  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing AccountName or AccountKey");
  }

  return {
    accountName: accountNameMatch[1],
    accountKey: accountKeyMatch[1],
  };
}

function getContainerClient() {
  const serviceClient = BlobServiceClient.fromConnectionString(config.azureStorageConnectionString);
  return serviceClient.getContainerClient(config.azureStorageContainerName);
}

function sanitizeBlobName(name: string): string {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safe || "asset";
}

export async function uploadReviewAssetToBlob(params: {
  reviewId: string;
  name: string;
  mimeType: string;
  base64Data: string;
}): Promise<{ blobUrl: string }> {
  const containerClient = getContainerClient();
  await containerClient.createIfNotExists();

  const blobName = `${params.reviewId}/${Date.now()}-${sanitizeBlobName(params.name)}`;
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const data = Buffer.from(params.base64Data, "base64");

  await blobClient.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: params.mimeType,
    } satisfies BlobHTTPHeaders,
  });

  return { blobUrl: blobClient.url };
}

export function getSignedBlobReadUrl(blobUrl: string, expiresInMinutes = 60): string {
  const { accountName, accountKey } = parseConnectionString(config.azureStorageConnectionString);
  const url = new URL(blobUrl);
  const [containerName, ...blobParts] = url.pathname.replace(/^\/+/, "").split("/");

  if (!containerName || blobParts.length === 0) {
    throw new Error(`Invalid blob URL: ${blobUrl}`);
  }

  const blobName = blobParts.map((part) => decodeURIComponent(part)).join("/");
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      protocol: SASProtocol.Https,
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    },
    credential,
  ).toString();

  url.search = sas;
  return url.toString();
}