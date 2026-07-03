/**
 * pdfToPageFiles.ts
 * -----------------
 * Browser-only utility. Parses each page of a PDF File to extract its
 * text content and embedded images separately using pdfjs-dist.
 *
 * Text is returned as markdown with [IMAGE_REF: name.png] placeholders.
 * Images are returned as synthetic PNG Files so the rest of the upload
 * and AI pipeline can treat them as normal screenshots.
 *
 * If a page has no extractable embedded images, we fall back to rendering
 * the full page as a single screenshot.
 */

const RENDER_SCALE = 2.0;

export type PdfPageFile = {
	id: string;
	name: string;
	type: "Screenshot";
	status: "Ready";
	file: File;
	previewUrl: string;
};

export type PdfExtractionResult = {
	markdown: string;
	images: PdfPageFile[];
};

type TextSegment = { kind: "text"; y: number; text: string };
type ImageSegment = { kind: "image"; y: number; fileName: string };
type Segment = TextSegment | ImageSegment;

function imageDataToBlob(imgData: { width: number; height: number; data: Uint8ClampedArray }): Promise<Blob> {
	const canvas = document.createElement("canvas");
	canvas.width = imgData.width;
	canvas.height = imgData.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get 2D canvas context");

	const imageData = new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height);
	ctx.putImageData(imageData, 0, 0);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("canvas.toBlob failed for extracted image"));
		}, "image/png");
	});
}

async function renderPageToBlob(page: any, scale: number): Promise<Blob> {
	const viewport = page.getViewport({ scale });
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(viewport.width);
	canvas.height = Math.ceil(viewport.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get 2D canvas context");

	await page.render({ canvasContext: ctx, viewport }).promise;

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("canvas.toBlob failed for page render"));
		}, "image/png");
	});
}

function getPageObj(page: any, key: string): Promise<any | null> {
	return new Promise((resolve) => {
		const timeout = setTimeout(() => resolve(null), 3000);
		try {
			page.objs.get(key, (obj: any) => {
				clearTimeout(timeout);
				resolve(obj ?? null);
			});
		} catch {
			clearTimeout(timeout);
			resolve(null);
		}
	});
}

export async function processPdf(pdfFile: File): Promise<PdfExtractionResult> {
	const pdfjsLib = await import("pdfjs-dist");
	pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

	const arrayBuffer = await pdfFile.arrayBuffer();
	const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
	const pdf = await loadingTask.promise;

	const stem = pdfFile.name.replace(/\.pdf$/i, "");
	const allImages: PdfPageFile[] = [];
	const markdownParts: string[] = [];
	let globalImageCounter = 0;

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum);
		const viewport = page.getViewport({ scale: 1.0 });
		const pageHeight = viewport.height;

		const textContent = await page.getTextContent();
		const textSegments: TextSegment[] = [];
		for (const item of textContent.items as any[]) {
			if (!item.str || item.str.trim().length === 0) continue;
			const y = pageHeight - (item.transform ? item.transform[5] : 0);
			textSegments.push({ kind: "text", y, text: item.str.trim() });
		}

		const imageSegments: ImageSegment[] = [];
		const pageImages: PdfPageFile[] = [];

		try {
			const ops = await page.getOperatorList();
			const OPS = pdfjsLib.OPS;

			const transformStack: number[][] = [[1, 0, 0, 1, 0, 0]];
			let currentTransform = transformStack[0];

			for (let i = 0; i < ops.fnArray.length; i++) {
				const fn = ops.fnArray[i];

				if (fn === OPS.save) {
					transformStack.push([...currentTransform]);
				} else if (fn === OPS.restore) {
					if (transformStack.length > 1) transformStack.pop();
					currentTransform = transformStack[transformStack.length - 1];
				} else if (fn === OPS.transform) {
					const t = ops.argsArray[i] as number[];
					currentTransform = t;
					transformStack[transformStack.length - 1] = t;
				}

				if (
					fn === OPS.paintImageXObject ||
					fn === OPS.paintInlineImageXObject ||
					fn === OPS.paintXObject
				) {
					const imageKey = ops.argsArray[i][0] as string;
					const imgObj = await getPageObj(page, imageKey);

					if (imgObj && imgObj.width && imgObj.height) {
						globalImageCounter++;
						const fileName = `${stem}_img_${String(globalImageCounter).padStart(2, "0")}.png`;

						const pdfY = currentTransform[5] ?? 0;
						const y = pageHeight - pdfY;

						try {
							let blob: Blob;

							if (imgObj.data && imgObj.data instanceof Uint8ClampedArray) {
								blob = await imageDataToBlob(imgObj);
							} else if (imgObj instanceof ImageBitmap) {
								const canvas = document.createElement("canvas");
								canvas.width = imgObj.width;
								canvas.height = imgObj.height;
								const ctx = canvas.getContext("2d");
								if (!ctx) {
									globalImageCounter--;
									continue;
								}
								ctx.drawImage(imgObj, 0, 0);
								blob = await new Promise<Blob>((resolve, reject) => {
									canvas.toBlob((b) => {
										if (b) resolve(b);
										else reject(new Error("toBlob failed for ImageBitmap"));
									}, "image/png");
								});
							} else {
								globalImageCounter--;
								continue;
							}

							const syntheticFile = new File([blob], fileName, { type: "image/png" });
							const entry: PdfPageFile = {
								id: `pdf-img-${globalImageCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
								name: fileName,
								type: "Screenshot",
								status: "Ready",
								file: syntheticFile,
								previewUrl: URL.createObjectURL(blob),
							};

							pageImages.push(entry);
							imageSegments.push({ kind: "image", y, fileName });
						} catch {
							globalImageCounter--;
						}
					}
				}
			}
		} catch (err) {
			console.warn(`Could not extract images from page ${pageNum}:`, err);
		}

		if (pageImages.length === 0) {
			globalImageCounter++;
			const fileName = `${stem}_page_${pageNum}.png`;
			try {
				const blob = await renderPageToBlob(page, RENDER_SCALE);
				const syntheticFile = new File([blob], fileName, { type: "image/png" });
				pageImages.push({
					id: `pdf-p${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					name: fileName,
					type: "Screenshot",
					status: "Ready",
					file: syntheticFile,
					previewUrl: URL.createObjectURL(blob),
				});
				imageSegments.push({ kind: "image", y: 0, fileName });
			} catch {
				globalImageCounter--;
			}
		}

		allImages.push(...pageImages);

		const segments: Segment[] = [...textSegments, ...imageSegments];
		segments.sort((a, b) => a.y - b.y);

		const Y_MERGE_THRESHOLD = 2;
		const merged: Segment[] = [];
		for (const seg of segments) {
			if (seg.kind === "text" && merged.length > 0) {
				const prev = merged[merged.length - 1];
				if (prev.kind === "text" && Math.abs(prev.y - seg.y) <= Y_MERGE_THRESHOLD) {
					prev.text += ` ${seg.text}`;
					continue;
				}
			}
			merged.push({ ...seg });
		}

		const pageLines: string[] = [`--- Page ${pageNum} ---`];
		for (const seg of merged) {
			if (seg.kind === "text") pageLines.push(seg.text);
			else pageLines.push(`[IMAGE_REF: ${seg.fileName}]`);
		}
		markdownParts.push(pageLines.join("\n"));

		page.cleanup();
	}

	await pdf.destroy();

	return {
		markdown: markdownParts.join("\n\n"),
		images: allImages,
	};
}

export async function pdfToPageFiles(pdfFile: File): Promise<PdfPageFile[]> {
	const result = await processPdf(pdfFile);
	return result.images;
}
