/**
 * Multi-modal helpers — image, PDF, and document handling for Anthropic API.
 */

import { readFile } from "fs/promises";
import { extname } from "path";

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

async function fileToBase64(filePath) {
  const buffer = await readFile(filePath);
  return buffer.toString("base64");
}

function detectMediaType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

async function imageBlock(filePath) {
  const data = await fileToBase64(filePath);
  const mediaType = detectMediaType(filePath);
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data },
  };
}

async function documentBlock(filePath) {
  const data = await fileToBase64(filePath);
  const mediaType = detectMediaType(filePath);
  return {
    type: "document",
    source: { type: "base64", media_type: mediaType, data },
  };
}

function imageUrl(url) {
  return {
    type: "image",
    source: { type: "url", url },
  };
}

async function buildMultimodalMessage(text, attachments = []) {
  const content = [];

  for (const attachment of attachments) {
    if (typeof attachment === "string") {
      const mediaType = detectMediaType(attachment);
      if (mediaType.startsWith("image/")) {
        content.push(await imageBlock(attachment));
      } else if (mediaType === "application/pdf") {
        content.push(await documentBlock(attachment));
      }
    } else {
      content.push(attachment);
    }
  }

  content.push({ type: "text", text });

  return { role: "user", content };
}

export {
  fileToBase64,
  detectMediaType,
  imageBlock,
  documentBlock,
  imageUrl,
  buildMultimodalMessage,
  MIME_MAP,
};
