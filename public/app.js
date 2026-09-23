const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function load() {
  const res = await fetch('/data/rankings.json');
  const data = await res.json();
  document.querySelector('#edition').textContent = `Edition ${data.edition} · Updated ${data.generated_at.slice(0,10)}`;

  const tabs = document.querySelector('#tabs');
  const content = document.querySelector('#content');

  const cats = Object.keys(data.categories);
  let active = cats[0];

  function renderTabs() {
    tabs.innerHTML = cats.map((c,i)=>`<button class="${c===active?'active':''}" data-cat="${esc(c)}">${esc(data.categories[c].label)}</button>`).join('');
    tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.cat;renderTabs();renderCategory();});
  }

  function renderCategory() {
    const c = data.categories[active];
    content.innerHTML = `
      <h2 class="category-title">${esc(c.label)}</h2>
      <p class="category-desc">${esc(c.description)}</p>
      <div class="cards">
      ${c.rankings.map((x,i)=>`
        <article class="card">
          <div class="rank">#${i+1}</div>
          <div>
            <div class="provider">${esc(x.name)}</div>
            <div class="tagline">${esc(x.tagline)}</div>
            <div class="why">${esc(x.weekly_reason)}</div>
            <div class="meta">
              <span class="pill">Agent ${x.agent_score}/100</span>
              <span class="pill">Coverage ${x.coverage_score}/100</span>
              <span class="pill">${x.mcp ? 'MCP' : 'REST/API'}</span>
              ${x.free ? '<span class="pill">Free access</span>' : ''}
            </div>
          </div>
          <div class="score">
            <b>${x.score}</b>
            <div class="movement">${x.delta_label}</div>
          </div>
        </article>`).join('')}
      </div>`;
  }
  renderTabs(); renderCategory();
}
load().catch(e=>document.querySelector('#content').innerHTML=`<p>Could not load rankings: ${esc(e.message)}</p>`);