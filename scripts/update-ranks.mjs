import { readFile, writeFile } from "node:fs/promises";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

function mondayUTC(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() - day + 1);
  return x.toISOString().slice(0, 10);
}

async function githubStats(repo) {
  if (!repo) return { stars: 0, pushedDays: 999 };
  const res = await fetch("https://api.github.com/repos/" + repo, {
    headers: {
      "User-Agent": "agent-rank",
      Accept: "application/vnd.github+json",
      ...(GITHUB_TOKEN ? { Authorization: "Bearer " + GITHUB_TOKEN } : {})
    }
  });
  if (!res.ok) return { stars: 0, pushedDays: 999 };
  const j = await res.json();
  const pushed = j.pushed_at ? (Date.now() - new Date(j.pushed_at).getTime()) / 86400000 : 999;
  return { stars: j.stargazers_count || 0, pushedDays: pushed };
}

async function discoverGithub(query) {
  const url = "https://api.github.com/search/repositories?q=" + encodeURIComponent(query) + "&sort=stars&per_page=5";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "agent-rank",
      Accept: "application/vnd.github+json",
      ...(GITHUB_TOKEN ? { Authorization: "Bearer " + GITHUB_TOKEN } : {})
    }
  });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.items || []).map(item => ({
    id: "gh-" + item.full_name.replace("/", "-"),
    name: item.name,
    url: item.html_url,
    github: item.full_name,
    baseScore: 40,
    standout: "Discovered via GitHub search this week.",
    bullets: [
      `${item.stargazers_count} GitHub stars.`,
      item.description || "No description.",
      "Promoted only if score beats the current #10."
    ]
  }));
}

function score(c, gh) {
  const starPts = Math.log10((gh.stars || 0) + 1) * 8;
  const recency = gh.pushedDays < 14 ? 8 : gh.pushedDays < 45 ? 4 : 0;
  return c.baseScore + starPts + recency;
}

async function rankCategory(list, prevRows) {
  const prevMap = new Map((prevRows || []).map(r => [r.name, r.rank]));
  const discovered = [];
  const seen = new Set(list.map(x => x.github).filter(Boolean));
  // discovery is mixed in by caller
  const scored = [];
  for (const c of list) {
    const gh = await githubStats(c.github);
    scored.push({
      name: c.name,
      url: c.url,
      standout: c.standout,
      bullets: c.bullets,
      _score: score(c, gh),
      _new: Boolean(c._new)
    });
  }
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 10).map((row, i) => ({
    name: row.name,
    url: row.url,
    rank: i + 1,
    prevRank: prevMap.has(row.name) ? prevMap.get(row.name) : null,
    standout: row.standout,
    bullets: row.bullets
  }));
}

const candidates = JSON.parse(await readFile("candidates.json", "utf8"));
const prev = JSON.parse(await readFile("ranks.json", "utf8"));

const extraCrypto = await discoverGithub("ai agent crypto stars:>1000");
const extraTradfi = await discoverGithub("ai trading agents stocks stars:>1000");
const extraMemes = await discoverGithub("pump.fun OR memecoin tracker OR gmgn stars:>200");

function merge(base, extra) {
  const names = new Set(base.map(x => x.name.toLowerCase()));
  const out = [...base];
  for (const e of extra) {
    if (!names.has(e.name.toLowerCase())) {
      out.push({ ...e, _new: true });
      names.add(e.name.toLowerCase());
    }
  }
  return out;
}

const next = {
  weekOf: mondayUTC(),
  generatedAt: new Date().toISOString(),
  note: "Scored from editorial baseScore + GitHub stars/recency. New GitHub names can enter if they beat #10.",
  categories: {
    crypto: await rankCategory(merge(candidates.crypto, extraCrypto), prev.categories.crypto),
    tradfi: await rankCategory(merge(candidates.tradfi, extraTradfi), prev.categories.tradfi),
    memes: await rankCategory(merge(candidates.memes, extraMemes), prev.categories.memes)
  }
};

await writeFile("ranks.json", JSON.stringify(next, null, 2) + "\n");
console.log("Wrote ranks.json for week", next.weekOf);