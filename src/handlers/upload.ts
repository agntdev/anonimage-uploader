import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

interface HostResult {
  name: string;
  url: string | null;
  error: string | null;
}

const MAX_IMAGES = 10;

function registerMenu() {
  registerMainMenuItem({
    label: "📸 Upload",
    data: "upload:show",
    order: 10,
  });
}
registerMenu();

function toBlob(data: Buffer): Blob {
  return new Blob([new Uint8Array(data)]);
}

async function uploadToCatbox(buffer: Buffer, filename: string): Promise<HostResult> {
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", toBlob(buffer), filename);
    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form,
    });
    const text = await res.text();
    if (res.ok && text.startsWith("http")) {
      return { name: "Catbox", url: text.trim(), error: null };
    }
    return { name: "Catbox", url: null, error: text.trim() || "Upload failed" };
  } catch (e) {
    return { name: "Catbox", url: null, error: (e as Error).message };
  }
}

async function uploadToImgur(buffer: Buffer, filename: string): Promise<HostResult> {
  try {
    const clientId = process.env.IMGUR_CLIENT_ID || "546c25a59c58ad7";
    const form = new FormData();
    form.append("image", toBlob(buffer), filename);
    const res = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: { Authorization: `Client-ID ${clientId}` },
      body: form,
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { link?: string; error?: string };
    };
    if (json.success && json.data?.link) {
      return { name: "Imgur", url: json.data.link, error: null };
    }
    return { name: "Imgur", url: null, error: json.data?.error || "Upload failed" };
  } catch (e) {
    return { name: "Imgur", url: null, error: (e as Error).message };
  }
}

async function uploadTo0x0(buffer: Buffer, filename: string): Promise<HostResult> {
  try {
    const form = new FormData();
    form.append("file", toBlob(buffer), filename);
    const res = await fetch("https://0x0.st", { method: "POST", body: form });
    const text = await res.text();
    if (res.ok && text.startsWith("http")) {
      return { name: "0x0.st", url: text.trim(), error: null };
    }
    return { name: "0x0.st", url: null, error: text.trim() || "Upload failed" };
  } catch (e) {
    return { name: "0x0.st", url: null, error: (e as Error).message };
  }
}

async function uploadToFileIo(buffer: Buffer, filename: string): Promise<HostResult> {
  try {
    const form = new FormData();
    form.append("file", toBlob(buffer), filename);
    const res = await fetch("https://file.io", { method: "POST", body: form });
    const json = (await res.json()) as {
      success?: boolean;
      link?: string;
      message?: string;
    };
    if (json.success && json.link) {
      return { name: "file.io", url: json.link, error: null };
    }
    return { name: "file.io", url: null, error: json.message || "Upload failed" };
  } catch (e) {
    return { name: "file.io", url: null, error: (e as Error).message };
  }
}

async function downloadFile(
  botApi: Ctx["api"],
  fileId: string,
): Promise<Buffer> {
  const file = await botApi.getFile(fileId);
  const token = (botApi as unknown as { token: string }).token;
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToHosts(
  buffer: Buffer,
  filename: string,
): Promise<HostResult[]> {
  const results = await Promise.allSettled([
    uploadToCatbox(buffer, filename),
    uploadToImgur(buffer, filename),
    uploadTo0x0(buffer, filename),
    uploadToFileIo(buffer, filename),
  ]);
  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { name: "Unknown", url: null, error: (r.reason as Error).message },
  );
}

function formatResults(
  results: HostResult[],
  filenames: string[],
): string {
  const lines: string[] = [];
  const successCount = results.filter((r) => r.url).length;
  const failCount = results.filter((r) => !r.url).length;

  lines.push(
    `Uploaded ${filenames.length} image${filenames.length > 1 ? "s" : ""} — ${successCount} succeeded`,
  );

  for (const r of results) {
    if (r.url) {
      lines.push(`${r.name}: ${r.url}`);
    } else {
      lines.push(`${r.name}: failed — ${r.error}`);
    }
  }

  if (failCount > 0) {
    lines.push("");
    lines.push(`${failCount} host${failCount > 1 ? "s" : ""} couldn't process this image.`);
  }

  return lines.join("\n");
}

async function processPhotos(
  ctx: Ctx,
  photos: Array<{ file_id: string; file_name?: string }>,
  filenames: string[],
): Promise<void> {
  const statusMsg = await ctx.reply("Uploading…");

  const hostResults: HostResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]!;
    const filename = filenames[i] || `image_${i + 1}.jpg`;

    try {
      const buffer = await downloadFile(ctx.api, photo.file_id);
      const results = await uploadToHosts(buffer, filename);
      hostResults.push(...results);
    } catch {
      for (const name of ["Catbox", "Imgur", "0x0.st", "file.io"]) {
        hostResults.push({ name, url: null, error: "Download failed" });
      }
    }
  }

  const text = formatResults(hostResults, filenames);

  try {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      text,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
  } catch {
    await ctx.reply(text, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }
}

const composer = new Composer<Ctx>();

composer.callbackQuery("upload:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Send me one or more images and I'll upload them anonymously.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.command("upload", async (ctx) => {
  await ctx.reply(
    "Send me one or more images and I'll upload them anonymously.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.on("message:photo", async (ctx) => {
  const photos = ctx.message.photo;
  if (!photos || photos.length === 0) return;

  const largest = photos[photos.length - 1]!;
  const filename = ctx.message.caption || `image_${Date.now()}.jpg`;

  await processPhotos(ctx, [{ file_id: largest.file_id, file_name: filename }], [filename]);
});

composer.on("message:document", async (ctx) => {
  const doc = ctx.message.document;
  if (!doc || !doc.mime_type?.startsWith("image/")) {
    await ctx.reply("Please send an image file. Other document types aren't supported.");
    return;
  }

  const filename = doc.file_name || `image_${Date.now()}.jpg`;

  await processPhotos(ctx, [{ file_id: doc.file_id, file_name: filename }], [filename]);
});

export default composer;
