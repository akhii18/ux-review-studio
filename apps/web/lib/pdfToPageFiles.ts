// /**
//  * pdfToPageFiles.ts
//  * -----------------
//  * Browser-only utility. Parses each page of a PDF File to extract its
//  * **text content** and **embedded images** separately using pdfjs-dist
//  * (pure JS, no native binaries).
//  *
//  * Text is returned as a markdown string with `[IMAGE_REF: name.png]`
//  * placeholders that reference the extracted images by name. The images
//  * are returned as synthetic PNG Files, identical in shape to a
//  * user-uploaded screenshot, so the rest of the upload flow and the AI
//  * pipeline treat them like regular screenshots.
//  *
//  * If a page contains no extractable embedded images (e.g. the PDF is a
//  * scanned document or uses complex vector graphics) we fall back to
//  * rendering the entire page as a single screenshot.
//  */

// const RENDER_SCALE = 2.0; // 2× ≈ 144 dpi — good quality for AI vision

// export type PdfPageFile = {
//   /** Unique ID for React key / file-list state */
//   id: string;
//   /** e.g. "wireframes_img_1.png" */
//   name: string;
//   type: "Screenshot";
//   status: "Ready";
//   /** Synthetic PNG File — identical shape to a user-uploaded screenshot */
//   file: File;
//   /** Object URL for the preview thumbnail (revoke when done) */
//   previewUrl: string;
// };

// export type PdfExtractionResult = {
//   /** Markdown text with [IMAGE_REF: ...] placeholders */
//   markdown: string;
//   /** Extracted images (or full-page fallback renders) */
//   images: PdfPageFile[];
// };

// // ── Internal types for the position-aware interleaving ────────────────────────

// type TextSegment = { kind: "text"; y: number; text: string };
// type ImageSegment = { kind: "image"; y: number; fileName: string };
// type Segment = TextSegment | ImageSegment;

// // ── Helpers ───────────────────────────────────────────────────────────────────

// /** Render raw ImageData-like object to a PNG Blob via an off-screen canvas. */
// function imageDataToBlob(imgData: { width: number; height: number; data: Uint8ClampedArray }): Promise<Blob> {
//   const canvas = document.createElement("canvas");
//   canvas.width = imgData.width;
//   canvas.height = imgData.height;
//   const ctx = canvas.getContext("2d")!;
//   const imageData = new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height);
//   ctx.putImageData(imageData, 0, 0);
//   return new Promise<Blob>((resolve, reject) => {
//     canvas.toBlob((b) => {
//       if (b) resolve(b);
//       else reject(new Error("canvas.toBlob failed for extracted image"));
//     }, "image/png");
//   });
// }

// /** Render an entire PDF page to a PNG Blob (fallback path). */
// async function renderPageToBlob(
//   page: any,
//   scale: number,
// ): Promise<Blob> {
//   const viewport = page.getViewport({ scale });
//   const canvas = document.createElement("canvas");
//   canvas.width = Math.ceil(viewport.width);
//   canvas.height = Math.ceil(viewport.height);
//   const ctx = canvas.getContext("2d");
//   if (!ctx) throw new Error("Could not get 2D canvas context");
//   await page.render({ canvasContext: ctx, viewport }).promise;
//   return new Promise<Blob>((resolve, reject) => {
//     canvas.toBlob((b) => {
//       if (b) resolve(b);
//       else reject(new Error("canvas.toBlob failed for page render"));
//     }, "image/png");
//   });
// }

// /**
//  * Attempt to retrieve an image object from `page.objs`. pdfjs may
//  * resolve these asynchronously, so we wrap in a Promise with a timeout.
//  */
// function getPageObj(page: any, key: string): Promise<any | null> {
//   return new Promise((resolve) => {
//     const timeout = setTimeout(() => resolve(null), 3000);
//     try {
//       page.objs.get(key, (obj: any) => {
//         clearTimeout(timeout);
//         resolve(obj ?? null);
//       });
//     } catch {
//       clearTimeout(timeout);
//       resolve(null);
//     }
//   });
// }

// // ── Main export ───────────────────────────────────────────────────────────────

// export async function processPdf(pdfFile: File): Promise<PdfExtractionResult> {
//   const pdfjsLib = await import("pdfjs-dist");

//   pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

//   const arrayBuffer = await pdfFile.arrayBuffer();
//   const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
//   const pdf = await loadingTask.promise;

//   const stem = pdfFile.name.replace(/\.pdf$/i, "");
//   const allImages: PdfPageFile[] = [];
//   const markdownParts: string[] = [];
//   let globalImageCounter = 0;

//   for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//     const page = await pdf.getPage(pageNum);
//     const viewport = page.getViewport({ scale: 1.0 }); // scale 1 for coordinate mapping
//     const pageHeight = viewport.height;

//     // ── 1. Extract text items with positions ────────────────────────────────
//     const textContent = await page.getTextContent();
//     const textSegments: TextSegment[] = [];

//     for (const item of textContent.items as any[]) {
//       if (!item.str || item.str.trim().length === 0) continue;
//       // item.transform[5] is the Y coordinate in PDF space (origin = bottom-left).
//       // Flip to top-left origin so sorting is top-to-bottom.
//       const y = pageHeight - (item.transform ? item.transform[5] : 0);
//       textSegments.push({ kind: "text", y, text: item.str.trim() });
//     }

//     // ── 2. Extract embedded images via operator list ────────────────────────
//     const imageSegments: ImageSegment[] = [];
//     const pageImages: PdfPageFile[] = [];

//     try {
//       const ops = await page.getOperatorList();
//       const OPS = pdfjsLib.OPS;

//       // Track transformation matrices to determine image Y-positions.
//       // We maintain a simplified transform stack.
//       const transformStack: number[][] = [[1, 0, 0, 1, 0, 0]];
//       let currentTransform = transformStack[0];

//       for (let i = 0; i < ops.fnArray.length; i++) {
//         const fn = ops.fnArray[i];

//         // Track transforms for position extraction
//         if (fn === OPS.save) {
//           transformStack.push([...currentTransform]);
//         } else if (fn === OPS.restore) {
//           if (transformStack.length > 1) transformStack.pop();
//           currentTransform = transformStack[transformStack.length - 1];
//         } else if (fn === OPS.transform) {
//           const t = ops.argsArray[i] as number[];
//           currentTransform = t;
//           transformStack[transformStack.length - 1] = t;
//         }

//         // Look for image painting operations
//         if (
//           fn === OPS.paintImageXObject ||
//           fn === OPS.paintInlineImageXObject ||
//           fn === OPS.paintXObject
//         ) {
//           const imageKey = ops.argsArray[i][0] as string;
//           const imgObj = await getPageObj(page, imageKey);

//           if (imgObj && imgObj.width && imgObj.height) {
//             globalImageCounter++;
//             const fileName = `${stem}_img_${String(globalImageCounter).padStart(2, "0")}.png`;

//             // Determine Y position from the current transform
//             // transform[5] is ty (Y translation) in PDF coordinates (bottom-left origin)
//             const pdfY = currentTransform[5] ?? 0;
//             const y = pageHeight - pdfY;

//             try {
//               let blob: Blob;

//               if (imgObj.data && imgObj.data instanceof Uint8ClampedArray) {
//                 // Raw ImageData — render to canvas
//                 blob = await imageDataToBlob(imgObj);
//               } else if (imgObj instanceof ImageBitmap) {
//                 // ImageBitmap — draw to canvas
//                 const canvas = document.createElement("canvas");
//                 canvas.width = imgObj.width;
//                 canvas.height = imgObj.height;
//                 const ctx = canvas.getContext("2d")!;
//                 ctx.drawImage(imgObj, 0, 0);
//                 blob = await new Promise<Blob>((resolve, reject) => {
//                   canvas.toBlob((b) => {
//                     if (b) resolve(b);
//                     else reject(new Error("toBlob failed for ImageBitmap"));
//                   }, "image/png");
//                 });
//               } else {
//                 // Unknown format — skip this image
//                 globalImageCounter--;
//                 continue;
//               }

//               const syntheticFile = new File([blob], fileName, { type: "image/png" });
//               const entry: PdfPageFile = {
//                 id: `pdf-img-${globalImageCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
//                 name: fileName,
//                 type: "Screenshot",
//                 status: "Ready",
//                 file: syntheticFile,
//                 previewUrl: URL.createObjectURL(blob),
//               };

//               pageImages.push(entry);
//               imageSegments.push({ kind: "image", y, fileName });
//             } catch {
//               // If individual image extraction fails, skip and continue
//               globalImageCounter--;
//             }
//           }
//         }
//       }
//     } catch (err) {
//       console.warn(`Could not extract images from page ${pageNum}:`, err);
//     }

//     // ── 3. Fallback: if no embedded images were found, render whole page ────
//     if (pageImages.length === 0) {
//       globalImageCounter++;
//       const fileName = `${stem}_page_${pageNum}.png`;

//       try {
//         const blob = await renderPageToBlob(page, RENDER_SCALE);
//         const syntheticFile = new File([blob], fileName, { type: "image/png" });
//         pageImages.push({
//           id: `pdf-p${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
//           name: fileName,
//           type: "Screenshot",
//           status: "Ready",
//           file: syntheticFile,
//           previewUrl: URL.createObjectURL(blob),
//         });
//         imageSegments.push({ kind: "image", y: 0, fileName });
//       } catch {
//         // If even fallback rendering fails, skip
//         globalImageCounter--;
//       }
//     }

//     allImages.push(...pageImages);

//     // ── 4. Merge text and image segments by vertical position ───────────────
//     const segments: Segment[] = [...textSegments, ...imageSegments];
//     segments.sort((a, b) => a.y - b.y);

//     // Collapse consecutive text segments into paragraphs (same Y ± threshold)
//     const Y_MERGE_THRESHOLD = 2; // points
//     const merged: Segment[] = [];
//     for (const seg of segments) {
//       if (seg.kind === "text" && merged.length > 0) {
//         const prev = merged[merged.length - 1];
//         if (prev.kind === "text" && Math.abs(prev.y - seg.y) <= Y_MERGE_THRESHOLD) {
//           prev.text += " " + seg.text;
//           continue;
//         }
//       }
//       merged.push({ ...seg });
//     }

//     // Build the page markdown
//     const pageLines: string[] = [`--- Page ${pageNum} ---`];
//     for (const seg of merged) {
//       if (seg.kind === "text") {
//         pageLines.push(seg.text);
//       } else {
//         pageLines.push(`[IMAGE_REF: ${seg.fileName}]`);
//       }
//     }

//     markdownParts.push(pageLines.join("\n"));

//     page.cleanup();
//   }

//   await pdf.destroy();

//   return {
//     markdown: markdownParts.join("\n\n"),
//     images: allImages,
//   };
// }

// // ── Legacy export kept for backwards compatibility ────────────────────────────
// // If any other code still imports pdfToPageFiles, this shim converts the new
// // return shape into the old flat array of PdfPageFile entries.

// export async function pdfToPageFiles(pdfFile: File): Promise<PdfPageFile[]> {
//   const result = await processPdf(pdfFile);
//   return result.images;
// }
