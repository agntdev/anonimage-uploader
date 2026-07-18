import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

interface HostInfo {
  name: string;
  directLink: boolean;
  expiry: string;
  maxSize: string;
  description: string;
}

const HOSTS: HostInfo[] = [
  {
    name: "Catbox",
    directLink: true,
    expiry: "Permanent",
    maxSize: "200 MB",
    description: "Anonymous upload, no account needed. Direct links.",
  },
  {
    name: "Imgur",
    directLink: true,
    expiry: "Permanent (anonymous)",
    maxSize: "20 MB",
    description: "Popular host, public gallery. Direct links.",
  },
  {
    name: "0x0.st",
    directLink: true,
    expiry: "14 days or 100 downloads",
    maxSize: "512 MB",
    description: "Minimalist host. Direct links, auto-expires.",
  },
  {
    name: "file.io",
    directLink: false,
    expiry: "14 days or 1 download",
    maxSize: "2 GB",
    description: "Ephemeral links. Self-destructs after first download.",
  },
];

function registerMenu() {
  registerMainMenuItem({
    label: "🌐 Hosts",
    data: "hosts:show",
    order: 30,
  });
}
registerMenu();

function formatHostInfo(host: HostInfo): string {
  const lines: string[] = [];
  lines.push(`**${host.name}**`);
  lines.push(host.description);
  lines.push(`Max size: ${host.maxSize}`);
  lines.push(`Expiry: ${host.expiry}`);
  lines.push(`Direct links: ${host.directLink ? "Yes" : "No (view page)"}`);
  return lines.join("\n");
}

function formatAllHosts(): string {
  const lines: string[] = [];
  lines.push("Available image hosts:\n");
  for (const host of HOSTS) {
    lines.push(formatHostInfo(host));
    lines.push("");
  }
  return lines.join("\n").trim();
}

const composer = new Composer<Ctx>();

composer.callbackQuery("hosts:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(formatAllHosts(), {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.command("hosts", async (ctx) => {
  await ctx.reply(formatAllHosts(), {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
