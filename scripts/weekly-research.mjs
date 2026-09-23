import fs from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const candidates = JSON.parse(await fs.readFile(new URL('data/candidates.json', ROOT)));
const scoring = JSON.parse(await fs.readFile(new URL('config/scoring.json', ROOT)));
const outPath = new URL('public/data/rankings.json', ROOT);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchText(url) {
  try {
    const r = await fetch(url, {headers:{'User-Agent':'AI-Agent-Market-Intelligence/1.0'}});
    if (!r.ok) return {url, ok:false, status:r.status, text:''};
    const text = await r.text();
    return {url, ok:true, status:r.status, text:text.slice(0,18000)};
  } catch(e) {
    return {url, ok:false, status:0, text:''};
  }
}

async function tavilySearch(query) {
  if (!process.env.TAVILY_API_KEY) return [];
  const r = await fetch('https://api.tavily.com/search', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      api_key:process.env.TAVILY_API_KEY,
      query,
      search_depth:'basic',
      max_results:5,
      include_answer:false
    })
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results||[]).map(x=>({title:x.title,url:x.url,content:(x.content||'').slice(0,4000)}));
}

async function llm(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is required');
  const model = process.env.LLM_MODEL || 'openrouter/free';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:'POST',
    headers:{
      'Authorization':`Bearer ${key}`,
      'Content-Type':'application/json',
      'HTTP-Referer':process.env.SITE_URL || 'https://example.netlify.app',
      'X-Title':'AI Agent Market Intelligence'
    },
    body:JSON.stringify({
      model,
      temperature:0.1,
      messages:[
        {role:'system',content:'You are a careful API market research analyst. Use only the supplied evidence. Do not invent adoption numbers, endpoint counts, pricing, MCP support or capabilities. Return valid JSON only.'},
        {role:'user',content:prompt}
      ]
    })
  });
  if (!r.ok) throw new Error(`LLM HTTP ${r.status}: ${await r.text()}`);
  const j=await r.json();
  return j.choices?.[0]?.message?.content || '';
}

function parseJson(s) {
  const clean=s.replace(/^```json\s*/,'').replace(/```$/,'').trim();
  return JSON.parse(clean);
}

async function evaluateProvider(category, p, previous) {
  const sourcePages = await Promise.all([p.website,p.docs].map(fetchText));
  const search = await tavilySearch(`${p.name} API AI agents MCP endpoints 2026`);
  const evidence = {
    provider:p,
    previous,
    direct_sources:sourcePages.map(x=>({url:x.url,ok:x.ok,status:x.status,text:x.text})),
    search_results:search
  };

  const prompt = `Evaluate this provider for category "${category}".
Scoring rubric:
- ecosystem_relevance 0-100: relevance to the category and actual workflows
- agent_readiness 0-100: structured APIs, OpenAPI/tool friendliness, MCP/agent support, predictable schemas
- data_quality 0-100: freshness, reliability indicators and depth visible in evidence
- coverage 0-100: asset/chain/instrument/function breadth
- accessibility 0-100: free/trial availability and ease of obtaining access
- documentation 0-100: clarity, examples, schemas and discoverability
- weekly_momentum 0-100: only based on evidence of recent changes, new agent features or ecosystem activity; if absent use 50, not a guess

Return exactly:
{
 "name": "...",
 "scores": {...},
 "mcp": true/false,
 "free": true/false,
 "evidence_urls": ["..."],
 "weekly_reason": "...",
 "tagline": "...",
 "confidence": 0-100
}

Evidence:
${JSON.stringify(evidence)}`;

  const raw=await llm(prompt);
  return parseJson(raw);
}

async function main() {
  let previous={categories:{}};
  try { previous=JSON.parse(await fs.readFile(outPath)); } catch {}

  const result={
    edition:new Date().toISOString().slice(0,10),
    generated_at:new Date().toISOString(),
    methodology_version:scoring.version,
    categories:{}
  };

  for (const [key,list] of Object.entries(candidates.categories)) {
    const prevRows=previous.categories?.[key]?.rankings || [];
    const evaluations=[];
    for (const p of list) {
      const prev=prevRows.find(x=>x.name===p.name) || null;
      try {
        const e=await evaluateProvider(key,p,prev);
        evaluations.push({...p,...e});
      } catch(err) {
        console.error(`Evaluation failed for ${p.name}:`,err.message);
      }
      await sleep(700);
    }

    const w=scoring.weights;
    for(const e of evaluations){
      e.score=Math.round(
        e.scores.ecosystem_relevance*w.ecosystem_relevance+
        e.scores.agent_readiness*w.agent_readiness+
        e.scores.data_quality*w.data_quality+
        e.scores.coverage*w.coverage+
        e.scores.accessibility*w.accessibility+
        e.scores.documentation*w.documentation+
        e.scores.weekly_momentum*w.weekly_momentum
      );
      e.agent_score=e.scores.agent_readiness;
      e.coverage_score=e.scores.coverage;
    }

    evaluations.sort((a,b)=>b.score-a.score);
    const oldRank={};
    prevRows.forEach((x,i)=>oldRank[x.name]=i+1);

    result.categories[key]={
      label:{crypto:'Crypto / DeFi',tradfi:'TradFi',meme:'Meme / Trenching'}[key],
      description:{
        crypto:'APIs agents can use to understand markets, protocols, wallets and on-chain activity.',
        tradfi:'Market data, fundamentals, macro, news and trading infrastructure.',
        meme:'DEX discovery, liquidity, social attention, wallet intelligence and emerging narratives.'
      }[key],
      rankings:evaluations.slice(0,10).map((x,i)=>{
        const old=oldRank[x.name];
        const delta=old ? old-i-1 : null;
        return {
          name:x.name,tagline:x.tagline,score:x.score,agent_score:x.agent_score,
          coverage_score:x.coverage_score,mcp:x.mcp,free:x.free,
          weekly_reason:x.weekly_reason,
          delta:delta,
          delta_label:delta===null?'NEW':delta===0?'—':delta>0?`↑${delta}`:`↓${Math.abs(delta)}`,
          evidence_urls:x.evidence_urls,
          confidence:x.confidence
        };
      })
    };
  }

  await fs.writeFile(outPath,JSON.stringify(result,null,2)+'\n');
  console.log('Wrote',outPath.pathname);
}
main().catch(e=>{console.error(e);process.exit(1)});
