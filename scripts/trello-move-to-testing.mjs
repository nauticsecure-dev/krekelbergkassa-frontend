import fs from "fs";

const API_KEY = "";
const TOKEN = "";
const EXPORT_PATH =
  process.argv[2] ||
  process.env.TRELLO_EXPORT ||
  "/Users/apple/Downloads/frontend-full-export (5).json";

const BOARD_ID = process.env.TRELLO_BOARD_ID || "69ef6ee7eb4be55fa37c7f5a";
const TARGET_LIST_NAME = process.env.TRELLO_TARGET_LIST || "Frontend testing";

if (!API_KEY || !TOKEN) {
  console.error(
    "Missing TRELLO_API_KEY or TRELLO_TOKEN environment variables.",
  );
  process.exit(1);
}

const BASE = "https://api.trello.com/1";

function authQuery(extra = {}) {
  return new URLSearchParams({ key: API_KEY, token: TOKEN, ...extra });
}

async function trello(path, { method = "GET", searchParams = {} } = {}) {
  const params = authQuery(searchParams);
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}${params}`;
  const res = await fetch(url, { method });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(
      typeof data === "object" && data?.message
        ? data.message
        : `HTTP ${res.status}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getTargetListId() {
  const lists = await trello(`/boards/${BOARD_ID}/lists`, {
    method: "GET",
  });
  const match = lists.find(
    (list) => list.name.toLowerCase() === TARGET_LIST_NAME.toLowerCase(),
  );
  if (!match) {
    throw new Error(
      `List "${TARGET_LIST_NAME}" not found on board. Available: ${lists.map((l) => l.name).join(", ")}`,
    );
  }
  return match.id;
}

function shortLinkFromCard(card) {
  if (card.shortLink) return card.shortLink;
  const url = card.shortUrl || card.url || "";
  const part = url.split("/").filter(Boolean).pop();
  return part || null;
}

function loadShortLinks() {
  const raw = fs.readFileSync(EXPORT_PATH, "utf8");
  const data = JSON.parse(raw);
  const cards = data.cards || [];
  const links = cards.map(shortLinkFromCard).filter(Boolean);
  if (!links.length) {
    throw new Error(`No card short links found in ${EXPORT_PATH}`);
  }
  return [...new Set(links)];
}

async function completeChecklists(cardId) {
  const checklists = await trello(`/cards/${cardId}/checklists`);
  for (const checklist of checklists) {
    for (const item of checklist.checkItems || []) {
      if (item.state !== "complete") {
        const params = new URLSearchParams({
          key: API_KEY,
          token: TOKEN,
          state: "complete",
        });
        const res = await fetch(
          `${BASE}/cards/${cardId}/checkItem/${item.id}?${params}`,
          { method: "PUT" },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Checklist item ${item.id}: ${text}`);
        }
      }
    }
  }
}

async function moveAndComplete(shortLink, targetListId) {
  const before = await trello(`/cards/${shortLink}`, {
    searchParams: { fields: "name,idList,dueComplete,closed,url" },
  });

  const params = new URLSearchParams({
    key: API_KEY,
    token: TOKEN,
    idList: targetListId,
    dueComplete: "true",
  });

  const res = await fetch(`${BASE}/cards/${shortLink}?${params}`, {
    method: "PUT",
  });
  const text = await res.text();
  let updated;
  try {
    updated = JSON.parse(text);
  } catch {
    updated = text;
  }
  if (!res.ok) {
    const message =
      typeof updated === "object" && updated?.message
        ? updated.message
        : `HTTP ${res.status}`;
    throw new Error(message);
  }

  await completeChecklists(updated.id);

  return {
    shortLink,
    name: updated.name,
    fromList: before.idList,
    toList: updated.idList,
    dueComplete: updated.dueComplete,
    url: updated.url || before.url,
  };
}

async function main() {
  const tokenInfo = await trello(`/tokens/${TOKEN}`, {
    searchParams: { permissions: "true" },
  });
  const boardPerm = (tokenInfo.permissions || []).find(
    (p) => p.modelType === "Board",
  );
  if (boardPerm && boardPerm.write === false) {
    console.error(
      "This Trello token is read-only. Create a write token:\n" +
        `https://trello.com/1/authorize?expiration=never&name=Krekelberg+Script&scope=read,write&response_type=token&key=${API_KEY}`,
    );
    process.exit(1);
  }

  const targetListId = await getTargetListId();
  const shortLinks = loadShortLinks();

  console.log(`Board: ${BOARD_ID}`);
  console.log(`Target list: ${TARGET_LIST_NAME} (${targetListId})`);
  console.log(`Cards: ${shortLinks.length}\n`);

  const results = { ok: [], skipped: [], failed: [] };

  for (const shortLink of shortLinks) {
    try {
      const card = await trello(`/cards/${shortLink}`, {
        searchParams: { fields: "name,idList,dueComplete" },
      });
      if (card.idList === targetListId && card.dueComplete) {
        results.skipped.push({
          shortLink,
          name: card.name,
          reason: "already complete",
        });
        console.log(`SKIP ${shortLink} — already in ${TARGET_LIST_NAME}`);
        continue;
      }

      const result = await moveAndComplete(shortLink, targetListId);
      results.ok.push(result);
      console.log(`OK   ${shortLink} — ${result.name.slice(0, 60)}`);
    } catch (err) {
      results.failed.push({ shortLink, error: err.message });
      console.error(`FAIL ${shortLink} — ${err.message}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Moved/completed: ${results.ok.length}`);
  console.log(`Skipped:         ${results.skipped.length}`);
  console.log(`Failed:          ${results.failed.length}`);

  if (results.failed.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
