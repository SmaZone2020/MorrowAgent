// Morrow Agent roadshow deck · slide templates (18 slides).
window.buildSlides = () => {
  const K = window.KATEX_PRE || {}; // pre-rendered KaTeX html snippets
  const formula = (key) => `<div class="katex-slot">${K[key] || ""}</div>`;

  // Screenshot slots stay wired to assets/shots/<id> from day one: drop a file
  // in and it appears with no code change; without it the placeholder shows.
  const mt = (id, caption) => `
    <div class="shot">
      <div class="ph-inner">${window.icon("image")}<p>截图预留 · ${caption}</p></div>
      <img src="assets/shots/${id}" alt="${caption}" onerror="this.remove()">
    </div>`;

  // Video slots follow the same rule: assets/shots/<id> or the placeholder.
  const vt = (id, caption) => `
    <div class="shot vshot">
      <div class="ph-inner">${window.icon("play")}<p>视频预留 · ${caption}</p></div>
      <video src="assets/shots/${id}" muted loop playsinline autoplay
             onloadeddata="this.closest('.shot').classList.add('has-media')"
             onerror="this.remove()"></video>
    </div>`;

  // Slide numbers derive from push order, so inserting a page never leaves a
  // stale "05" sitting next to a "06 / 21" footer.
  const num = () => String(slides.length + 1).padStart(2, "0");

  const slides = [];

  /* ---------- 1 · cover ---------- */
  slides.push(`
  <section class="slide cover" data-k="cover">
    <div class="grain"></div>
    <svg class="mtn" viewBox="0 0 1280 360" preserveAspectRatio="none">
      <path d="M0 360V220l180-90 160 80 210-140 190 110 170-70 180 90 190-60v220z" fill="#e2dbcf"/>
      <path d="M0 360V280l220-70 190 60 240-110 220 90 210-50 200 40v120z" fill="#d9d1c3"/>
    </svg>
    <div class="cover-brand a d1">
      <span class="cover-mark"><img src="assets/morrow-mark.png" alt="Morrow" data-noclip onerror="this.style.display='none'"></span>      <div class="div"></div><span>MORROW AGENT</span>
    </div>
    <div class="cover-comp a d2"><span class="dot"></span>汉中市第八届职业院校技能大赛</div>
    <h1 class="a d3">让每一个学生<br>都拥有<em>看得懂自己</em>的 AI 学伴</h1>
    <p class="slogan a d4">Morrow Agent · 面向自主学习的 AI 学习工作台</p>
    <div class="cover-meta a d5">
      <span class="pill">陕西航空职业技术学院</span>
      <span class="pill">Morrow 团队</span>
    </div>
    <div class="cover-lumi a-s d6">${LUMI_SVG()}</div>
  </section>`);

  /* ---------- 2 · policy ---------- */
  slides.push(`
  <section class="slide" data-k="policy">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">响应国家号召 · POLICY</span>
        <h2 class="slide-title a-l d2">我们响应的不是口号，是行动计划的原文</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <blockquote class="policy-quote a d3">
      <p>「研发智能学伴……根据学生能力、特质和爱好，动态优化学习路径」「推动智能技术在中西部地区、乡村学校的应用，促进学生自主学习，促进教育优质均衡」</p>
      <cite>—— 教育部等五部门《“人工智能+教育”行动计划》（教科信〔2026〕1号）</cite>
    </blockquote>
    <div class="policy-grid" data-stag=".09" data-d=".45">
      <div class="card pcard a">
        ${window.icon("brain")}<h3>研发智能学伴</h3>
        <p>行动计划明确要求研发智能学伴、建设学生数字档案。Morrow Agent 内置智能体 Lumi，正是面向这一方向的落地实践。</p>
        <span class="tag">第六条 · 赋能学生</span>
      </div>
      <div class="card pcard a">
        ${window.icon("map")}<h3>动态优化学习路径</h3>
        <p>以持续演化的学习者模型为核心，诊断、教学、训练、验证全流程由数据驱动，替代静态课程路径。</p>
        <span class="tag">第六条 · 数字档案</span>
      </div>
      <div class="card pcard a">
        ${window.icon("scale")}<h3>促进教育优质均衡</h3>
        <p>本地优先加开源开放，让中西部与县域学生同样获得持续、个性化的学习指导，推动优质教育资源普惠化。</p>
        <span class="tag">第六条 · 优质均衡</span>
      </div>
    </div>
  </section>`);

  /* ---------- 3 · problem ---------- */
  slides.push(`
  <section class="slide" data-k="problem">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">时代之问 · WHY</span>
        <h2 class="slide-title a-l d2">好老师不缺，缺的是“一直在你身边的老师”</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="pain-wrap">
      <div class="pain-list" data-stag=".1" data-d=".35">
        <div class="card pain a">${window.icon("clock")}<div><b>辅导不可及</b><p>能随时请教的优秀教师是稀缺资源，多数学生遇到问题只能自行搜索答案。</p></div></div>
        <div class="card pain a">${window.icon("alert")}<div><b>AI 答题工具的断点</b><p>通用 AI 只负责“答完这道题”，不理解学生真正没弄懂的地方，答案越快，依赖越深。</p></div></div>
        <div class="card pain a">${window.icon("book")}<div><b>错题本只收集不追踪</b><p>记下对错，却找不到前置知识缺口，更不会验证是否真的补上了。</p></div></div>
        <div class="card pain a">${window.icon("route")}<div><b>学习计划是静态的</b><p>计划不会根据实际学习成果动态调整，学生不知道下一步该学什么。</p></div></div>
      </div>
      <div class="pain-charts" data-stag=".12" data-d=".55">
        <div class="card pchart a">
          <h4>同等时间投入下的学习效果差异（示意）</h4>
          <div class="barline">
            <div class="b" style="height:88%"><em>持续辅导</em><i>一对一带教</i></div>
            <div class="b" style="height:52%"><em>录播课程</em><i>单向讲授</i></div>
            <div class="b low" style="height:34%"><em>自学刷题</em><i>无人指导</i></div>
          </div>
        </div>
        <div class="gapnote a d4">${window.icon("lightbulb")}<span>差距的根源不是天赋，而是能否获得持续、个性化的指导 —— 这正是 AI 可以补齐的部分。</span></div>
      </div>
    </div>
  </section>`);

  /* ---------- 4 · answer ---------- */
  slides.push(`
  <section class="slide" data-k="answer">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">我们的回答 · ANSWER</span>
        <h2 class="slide-title a-l d2">优质教育资源普惠化</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="answer-wrap">
      <div>
        <p class="answer-big a d2">Morrow Agent 是一个真正<em>理解学习者</em>的 AI 学习工作台：先诊断学生真正没弄懂的地方，针对那个缺口教学，再用新题验证是否真的补上了。</p>
        <div class="answer-points" data-stag=".1" data-d=".5">
          <div class="answer-point a">${window.icon("check")}<span>首发面向陕西专升本高等数学 —— 县域与职校学生的升学刚需</span></div>
          <div class="answer-point a">${window.icon("check")}<span>桌面与移动端本地应用，个人数据留在学生自己的设备里</span></div>
          <div class="answer-point a">${window.icon("check")}<span>开源开放（GPL-3.0），内容标准可被任何第三方复用</span></div>
        </div>
      </div>
      <figure class="card aviz a-r d3">
        <svg viewBox="0 0 420 260">
          <path d="M40 220 Q120 210 180 150 T 340 60" fill="none" stroke="#a59e95" stroke-width="2" stroke-dasharray="5 6"/>
          <path d="M40 230 Q140 225 220 180 T 400 100" fill="none" stroke="#4f6b57" stroke-width="3"/>
          <circle cx="40" cy="230" r="5" fill="#384248"/><circle cx="400" cy="100" r="5" fill="#4f6b57"/>
          <text x="46" y="212" font-size="12" fill="#6f6a63">今天的起点</text>
          <text x="300" y="88" font-size="12" fill="#4f6b57">每个人都能抵达</text>
        </svg>
        <figcaption>过去的成绩，不应该定义未来的可能性</figcaption>
      </figure>
    </div>
  </section>`);

  /* ---------- 5 · loop ---------- */
  const loopSteps = ["理解学习者","发现知识盲区","追溯根本原因","个性化教学","针对性训练","验证真实掌握","培养独立学习能力"];
  const N = 7, R = 112, CX = 210, CY = 196;
  const nodes = loopSteps.map((s, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const x = CX + R * Math.cos(ang);
    const y = CY + R * Math.sin(ang);
    return `<g class="node" data-seq-item>
      <circle cx="${x}" cy="${y}" r="29" fill="#faf7f1" stroke="#e2dbcf"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#384248" font-weight="700">${i + 1}</text>
      <text x="${x}" y="${y + 46}" text-anchor="middle" font-size="12" fill="#6f6a63">${s}</text>
    </g>`;
  }).join("");

  slides.push(`
  <section class="slide" data-k="loop">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">核心理念 · LOOP</span>
        <h2 class="slide-title a-l d2">七步学习闭环：AI 的终点，是让学生不再依赖 AI</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="loop-wrap">
      <div class="loop-left a-s d2">
        <svg class="loop-svg" viewBox="0 0 420 400" data-seq="380">
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#a59e95" stroke-width="1.6" class="edge"/>
          ${nodes}
          <g class="node" data-seq-item>
            <circle cx="${CX}" cy="${CY}" r="30" fill="#4f6b57" opacity=".14"/>
            <text x="${CX}" y="${CY - 2}" text-anchor="middle" font-size="12" fill="#4f6b57" font-weight="700">闭环</text>
            <text x="${CX}" y="${CY + 14}" text-anchor="middle" font-size="12" fill="#4f6b57" font-weight="700">证据</text>
          </g>
        </svg>
      </div>
      <div class="loop-right" data-stag=".08" data-d=".4">
        ${loopSteps.map((s, i) => `<div class="card loop-item a" data-seq-item><span class="n">${i + 1}</span>${s}</div>`).join("")}
        <div class="loop-cycle a d10">${window.icon("refresh")}<span>每一次交互都作为证据写回学习者模型</span></div>
      </div>
    </div>
  </section>`);

  /* ---------- 6 · lumi ---------- */
  slides.push(`
  <section class="slide" data-k="lumi">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">智能学伴 · LUMI</span>
        <h2 class="slide-title a-l d2">认识 Lumi，一位“一直在身边”的学伴</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="lumi-wrap">
      <div class="lumi-stage a-s d2">
        <div class="halo"></div>
        <div class="main" data-lumi role="button" tabindex="0" aria-label="点击 Lumi 看看它的反应">
          <svg class="lumi-engine" aria-hidden="true"></svg>
        </div>
        <div class="lumi-shadow"></div>
        <div class="lumi-bubble" data-lumi-bubble aria-hidden="true"></div>
        <span class="lumi-hintline">点一下 Lumi</span>
        <span class="chip c1">会分时段向你问好</span>
        <span class="chip c2">记得住你的薄弱点</span>
        <span class="chip c3">听得懂你的画板</span>
      </div>
      <div class="lumi-feats" data-stag=".1" data-d=".45">
        <div class="card lfeat a">${window.icon("message")}<div><b>对话里长出真实组件</b><p>题目卡片、公式输入、手写画板、函数图像、知识图谱直接在对话流中渲染，不是套壳聊天窗。</p></div></div>
        <div class="card lfeat a">${window.icon("pen")}<div><b>看得懂解题过程</b><p>画板笔迹按笔画聚合回传，Lumi 分析的是思路与根因，而不只判一个最终答案。</p></div></div>
        <div class="card lfeat a">${window.icon("heart")}<div><b>长期学习记忆</b><p>跨会话记住每个学生的错误类型、能力维度与学习偏好，越用越懂你。</p></div></div>
      </div>
    </div>
  </section>`);

  /* ---------- 7 · lumi style / appearance ---------- */
  const styles = [
    ["guided", "先问后讲", "先确认你卡在哪一步，再给出这一步的解法。", true],
    ["direct", "直接讲解", "直接给结论和完整过程，不反问。", false],
    ["socratic", "只提问", "不直接给答案，用问题一步步把你带到结论。", false],
  ];
  const personas = [
    ["warm", "温柔", "语气温和有耐心，犯错时不让学习者难堪。"],
    ["sharp", "干脆", "直接给结论，省下来的字都用在内容上。"],
    ["rigorous", "严谨", "每个结论都交代依据和成立条件。"],
    ["playful", "活泼", "像同学一样说话，但结论仍然准确。"],
  ];
  slides.push(`
  <section class="slide" data-k="style">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">智能学伴 · 个性化</span>
      <h2 class="slide-title a-l d2">同一个 Lumi，按你的方式教你</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="style-wrap">
      <div class="style-left">
        <div class="style-block a-l d3">
          <h4>教学风格 · 决定讲多少</h4>
          <div class="segs" data-stag=".07" data-d=".45">
            ${styles.map(([id, label, hint, on]) => `<div class="seg${on ? " on" : ""}"><b>${label}</b><span>${hint}</span></div>`).join("")}
          </div>
        </div>
        <div class="style-block a-l d4">
          <h4>对话人格 · 决定怎么讲</h4>
          <div class="persona-row" data-stag=".06" data-d=".6">
            ${personas.map(([id, label, hint]) => `<span class="chip-p" title="${hint}">${label}</span>`).join("")}
          </div>
          <p class="style-note">风格与人格是全局偏好：换一本教材、换一门课，你的 Lumi 还是同一个脾气。</p>
        </div>
      </div>
      <div class="style-right a-r d3">
        ${vt("theme.mp4", "主题切换与学习风格演示")}
        <div class="shot-cap">${window.icon("play")}演示：风格切换 · 护眼纸张 · 浅色 / 深色 / 跟随系统</div>
        <div class="appear-row" data-stag=".08" data-d=".7">
          <div class="appear card"><span class="sw" style="background:#efeae2;color:#384248">Aa</span><b>护眼纸张</b><span>雾白纸感底，长读不刺眼</span></div>
          <div class="appear card"><span class="sw sw-dark" style="background:#1c1f21;color:#e8e3da">Aa</span><b>三档主题</b><span>浅色 / 深色 / 跟随系统</span></div>
          <div class="appear card"><span class="sw sw-serif" style="background:#faf7f1;color:#384248">宋</span><b>四款界面字体</b><span>宋体 / 黑体 / 等宽 / 系统</span></div>
        </div>
      </div>
    </div>
  </section>`);

  /* ---------- 7 · modules ---------- */
  const mods = [
    ["message", "Lumi 工作台", "对话中渲染题目卡片、画板、函数图像与知识图谱，操作结构化回传。", ["题目卡片", "画板", "函数图", "知识图谱"], null],
    ["scan", "自适应诊断", "覆盖式测评、假设驱动追问、变式验证；弱项必须被证实才写入画像。", ["覆盖式诊断", "根因推断", "变式验证"], null],
    ["chart", "学习画像", "掌握度与置信度严格分离，记录错误类型、能力维度与长期记忆。", ["掌握度", "置信度", "长期记忆"], null],
    ["book", "错题本 · 专项训练", "自动收录原题、作答与归因，按知识点精准重做。", ["自动收录", "八类归因", "精准重做"], null],
    ["clock", "模拟考试", "真实题位试卷结构、固定计时、常驻答题卡与逐题分析。", ["真实题位", "固定计时", "逐题分析"], null],
    ["layers", "知识库 · 学习包", "章节树与知识图谱；带版本号的学习包可安装、可校验、可更新。", ["章节树", "知识图谱", "可校验"], "特色"],
  ];
  slides.push(`
  <section class="slide" data-k="modules">
    <div class="grain"></div>
    <div class="head">
      <div>
        <span class="kicker a-l d1">功能总览 · MODULES</span>
        <h2 class="slide-title a-l d2">一个工作台，覆盖“学、练、测、补”全流程</h2>
      </div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="mod-grid" data-stag=".08" data-d=".4">
      ${mods.map(([ic, t, p, chips, tag]) => `<div class="card mod a">${tag ? `<span class="star">${tag}</span>` : ""}<div class="wm"></div>${window.icon(ic)}<h3>${t}</h3><p>${p}</p><div class="chips">${chips.map((c) => `<span>${c}</span>`).join("")}</div></div>`).join("")}
    </div>
  </section>`);

  /* ---------- 8 · lumi workspace ---------- */
  slides.push(`
  <section class="slide" data-k="ws">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">功能细览 · 1/5</span>
      <h2 class="slide-title a-l d2">Lumi 工作台：对话即课堂</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="shot-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("message")}<div><b>交互组件直接在消息流中渲染</b><p>题目卡片、公式、画板、函数图像、知识图谱五种组件，用户的每次操作都成为 AI 的上下文。</p></div></div>
        <div class="card feat a">${window.icon("refresh")}<div><b>组件事件协议双向通信</b><p>受限、版本化的组件协议：AI 调用组件，组件回传证据，形成人机协同的学习环境。</p></div></div>
        <div class="card feat a">${window.icon("eye")}<div><b>流式输出，逐字上屏</b><p>增量流式响应、可随时中止；调用失败时保留已输入内容与已提交状态。</p></div></div>
      </div>
      <div class="shot-col a-r d3">${mt("lumi-chat-shot.png", "Lumi 工作台对话界面")}</div>
    </div>
  </section>`);

  /* ---------- 9 · diagnosis ---------- */
  slides.push(`
  <section class="slide" data-k="diag">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">功能细览 · 2/5</span>
      <h2 class="slide-title a-l d2">自适应诊断：从“答错了”追到“为什么错”</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="shot-wrap rev">
      <div class="shot-col a-l d3">${mt("zhenduan-shot.png", "诊断与画像界面")}</div>
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("scan")}<div><b>三段式诊断流程</b><p>覆盖性基础测评 → 假设驱动的追问 → 变式题验证迁移能力，最后生成诊断报告。</p></div></div>
        <div class="card feat a">${window.icon("search")}<div><b>根因链推断</b><p>导数定义题失分 → 疑似极限概念不清 → 疑似左右极限理解不完整 → 出验证题确认或排除。</p>
          <div class="feat-formula">${formula("law")}</div>
        </div></div>
        <div class="card feat a">${window.icon("shield")}<div><b>证据先行，不武断贴标签</b><p>疑似弱项必须被变式题证实才写入学习者画像，学生可随时纠正诊断结论。</p></div></div>
      </div>
    </div>
  </section>`);

  /* ---------- 10 · profile ---------- */
  slides.push(`
  <section class="slide" data-k="profile">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">功能细览 · 3/5</span>
      <h2 class="slide-title a-l d2">学习画像：给每个学生建一本“数字档案”</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="shot-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("chart")}<div><b>作答证据可视化</b><p>每个知识点的作答次数与正确率一目了然，可一键跳转专项训练。</p></div></div>
        <div class="card feat a">${window.icon("layers")}<div><b>掌握度与置信度分离</b><p>不确定的结论明确标注置信度，绝不把猜测当事实呈现给学生。</p></div></div>
        <div class="card feat a">${window.icon("db")}<div><b>历史不可篡改</b><p>作答记录随行存储题干快照与题目版本，知识包升级不影响历史数据。</p></div></div>
      </div>
      <div class="shot-col a-r d3">${mt("xuexihuaxiang-shot.png", "学习画像页")}</div>
    </div>
  </section>`);

  /* ---------- 11 · training ---------- */
  slides.push(`
  <section class="slide" data-k="train">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">功能细览 · 4/5</span>
      <h2 class="slide-title a-l d2">错题本 · 专项训练：让每一道错题都有归宿</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="shot-wrap rev">
      <div class="shot-col a-l d3">${mt("cuotiben.png", "专项训练 / 错题本")}</div>
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("book")}<div><b>自动收录与自动移出</b><p>答错自动进入错题本，重做答对自动移出，永远和作答历史保持同步。</p></div></div>
        <div class="card feat a">${window.icon("target")}<div><b>错误归因八类</b><p>概念理解、公式使用、计算失误、逻辑推理、方法选择、审题、迁移、表达不完整。</p></div></div>
        <div class="card feat a">${window.icon("route")}<div><b>精准跳转重做</b><p>“去重做”直达那道错题本身，而不是笼统的知识点页面。</p>
          <div class="feat-formula">${formula("variation")}</div>
        </div></div>
      </div>
    </div>
  </section>`);

  /* ---------- 12 · exam ---------- */
  slides.push(`
  <section class="slide" data-k="exam">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">功能细览 · 5/5</span>
      <h2 class="slide-title a-l d2">模拟考试：像真考一样练</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="shot-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("clock")}<div><b>真实试卷结构</b><p>按陕西专升本高数真实题位组卷，固定计时与常驻答题卡，完整模拟考场节奏。</p></div></div>
        <div class="card feat a">${window.icon("file")}<div><b>成绩总结与逐题分析</b><p>交卷即出总结报告，逐题定位失分原因并关联知识点。</p></div></div>
        <div class="card feat a">${window.icon("sparkles")}<div><b>与学习闭环打通</b><p>考试暴露的薄弱点自动进入画像与训练建议，考完就是新的学习起点。</p></div></div>
      </div>
      <div class="shot-col a-r d3">${mt("moni-kaoshi.png", "模拟考试界面")}</div>
    </div>
  </section>`);

  /* ---------- 13 · MLPS ---------- */
  slides.push(`
  <section class="slide" data-k="mlps">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">特色亮点 · 1/2</span>
      <h2 class="slide-title a-l d2">自研开放内容标准：MLPS 学习包</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="mlps-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("package")}<div><b>把一门学科装进标准包</b><p>知识点、题目、解析、词表与来源打包为一个带版本号的学习包归档，可安装、可校验、可更新。</p></div></div>
        <div class="card feat a">${window.icon("check")}<div><b>十项设计原则，全部机器可校验</b><p>内容与程序解耦、稳定标识、可追溯、可校验、AI 友好、本地优先、向后兼容，以 JSON Schema 强制约束。</p></div></div>
        <div class="card feat a">${window.icon("users")}<div><b>让“共享教案”成为可能</b><p>任何学校、任何老师都能按同一标准产出学习包 —— 这正是优质资源普惠化的基础设施。</p></div></div>
      </div>
      <div class="pkgbox card a-s d3">
        <div class="box">${window.icon("package")}<span class="stamp">可校验</span></div>
        <h4>.morrow 学习包</h4>
        <p>首个参考学习包：完整章节体系<br>知识点、题库与解析一一对应，通过全量校验</p>
      </div>
    </div>
  </section>`);

  /* ---------- 14 · local first ---------- */
  slides.push(`
  <section class="slide" data-k="local">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">特色亮点 · 2/2</span>
      <h2 class="slide-title a-l d2">本地优先：学生的数据，只属于学生</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="mlps-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("lock")}<div><b>密钥加密存储</b><p>模型密钥经操作系统级加密存储，永不进入网页层；无法加密的平台拒绝明文落盘。</p></div></div>
        <div class="card feat a">${window.icon("db")}<div><b>本地数据库，公共与个人严格分离</b><p>对话、作答、画像全部存在学生自己的设备里；学习包与个人数据永不混用。</p></div></div>
        <div class="card feat a">${window.icon("refresh")}<div><b>升级不伤历史</b><p>带迁移测试的顺序数据库升级机制：应用升级后，学习历史一条不丢。</p></div></div>
      </div>
      <div class="pkgbox card a-s d3">
        <div class="box">${window.icon("shield")}<span class="stamp">本地存储</span></div>
        <h4>本地数据目录</h4>
        <p>数据库 + 加密密钥 + 个人偏好<br>个人数据与公共学习包物理分离</p>
      </div>
    </div>
  </section>`);

  /* ---------- 15 · DeepSeek ---------- */
  slides.push(`
  <section class="slide" data-k="ds">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">国产化底座 · DOMESTIC</span>
      <h2 class="slide-title a-l d2">国产大模型驱动，全栈自主可控</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="ds-wrap">
      <div class="feat-list" data-stag=".1" data-d=".4">
        <div class="card feat a">${window.icon("sparkles")}<div><b>内置 DeepSeek 国产大模型供应商</b><p>在应用内即可登录国产模型服务，推理、诊断、教学全部由国产大模型驱动。</p></div></div>
        <div class="card feat a">${window.icon("cpu")}<div><b>协议适配层，不被任何厂商锁定</b><p>统一适配三种主流协议，国产模型可随时替换接入，业务逻辑零改动。</p></div></div>
        <div class="card feat a">${window.icon("code")}<div><b>后端直连，密钥不出本机</b><p>模型请求由本地后端发起，配合国产模型 API，实现数据不出设备、密钥不进网页。</p></div></div>
      </div>
      <div class="ds-hero card a-s d3">
        <div class="ds-badge">
          <div class="logo">
          <svg width="143" height="23" viewBox="0 0 23 23" fill="none" class="text-[var(--ds-color-brand-medium-reverse)]"><g clip-path="url(#clip0_logo)"><path d="M26.5174 3.39471C26.235 3.2567 26.1137 3.52006 25.9487 3.65346C25.8923 3.69659 25.8446 3.75294 25.7969 3.80469C25.3846 4.24516 24.9027 4.53439 24.2737 4.49989C23.3536 4.44814 22.5682 4.73737 21.8735 5.44119C21.7258 4.57349 21.2353 4.0554 20.4889 3.72304C20.0985 3.55054 19.7034 3.37746 19.4297 3.00197C19.2388 2.73459 19.1865 2.43673 19.091 2.14289C19.0301 1.96579 18.9697 1.78466 18.7656 1.75418C18.5442 1.71968 18.4574 1.90541 18.3705 2.06067C18.0232 2.69549 17.8887 3.39471 17.9019 4.10313C17.9324 5.6965 18.6051 6.96556 19.9421 7.86834C20.0939 7.97184 20.133 8.07535 20.0852 8.22658C19.9938 8.53766 19.8857 8.83955 19.7903 9.15063C19.7293 9.34901 19.6384 9.39271 19.4257 9.30588C18.692 8.9994 18.0583 8.54571 17.4982 7.99772C16.5477 7.07827 15.6881 6.06336 14.6162 5.26869C14.3644 5.08296 14.1125 4.91045 13.8521 4.746C12.7584 3.68394 13.9952 2.81164 14.2816 2.70814C14.5812 2.60003 14.3857 2.22857 13.4179 2.23317C12.4502 2.2372 11.5646 2.56151 10.4359 2.99335C10.2708 3.05832 10.0972 3.10547 9.91951 3.14457C8.8954 2.95022 7.83162 2.90709 6.72069 3.03245C4.62877 3.26533 2.95777 4.25436 1.72954 5.94261C0.254043 7.97184 -0.0932678 10.2777 0.33167 12.6824C0.778458 15.2171 2.07225 17.3153 4.06008 18.9558C6.12152 20.6567 8.49577 21.4905 11.2047 21.3306C12.8498 21.2358 14.6812 21.0155 16.7473 19.2669C17.2682 19.5262 17.8151 19.6297 18.7219 19.7074C19.4205 19.7723 20.0933 19.6729 20.6143 19.5648C21.4302 19.3923 21.3739 18.6367 21.0789 18.4981C18.6874 17.3843 19.2124 17.8374 18.7351 17.4706C19.9501 16.033 21.8063 13.4776 22.379 9.99821C22.4353 9.61409 22.5072 9.073 22.4986 8.76192C22.494 8.57216 22.5377 8.49856 22.7545 8.47671C23.3536 8.40771 23.935 8.24383 24.4692 7.94999C26.0188 7.10357 26.6439 5.71318 26.7911 4.04678C26.8129 3.79204 26.7865 3.52869 26.5174 3.39471ZM13.0143 18.3946C10.6964 16.5724 9.5722 15.9726 9.10816 15.9985C8.67402 16.0244 8.75222 16.5212 8.84768 16.8449C8.94773 17.1646 9.07768 17.3849 9.25996 17.6655C9.38589 17.8512 9.47272 18.1272 9.13404 18.3348C8.38766 18.7965 7.08985 18.1796 7.0289 18.1491C5.51833 17.2595 4.25559 16.0853 3.36546 14.4793C2.50581 12.9337 2.0067 11.2753 1.92447 9.50542C1.90262 9.07818 2.02855 8.92695 2.45406 8.84932C3.01413 8.74582 3.59144 8.72397 4.15093 8.80619C6.51656 9.15178 8.53027 10.2092 10.2185 11.8848C11.1822 12.8388 11.9114 13.979 12.6623 15.0929C13.461 16.2757 14.3201 17.4027 15.4144 18.3268C15.8008 18.6505 16.109 18.8966 16.404 19.0783C15.5144 19.1778 14.0297 19.1991 13.0143 18.3958V18.3946ZM14.1252 11.2489C14.1252 11.0591 14.277 10.9079 14.4679 10.9079C14.511 10.9079 14.5501 10.9165 14.5852 10.9292C14.6329 10.9464 14.6766 10.9723 14.7111 11.0114C14.7721 11.0718 14.8066 11.158 14.8066 11.2489C14.8066 11.4386 14.6548 11.5899 14.4639 11.5899C14.273 11.5899 14.1252 11.4386 14.1252 11.2489ZM17.5759 13.0188C17.3545 13.1096 17.1331 13.1873 16.9203 13.1959C16.5903 13.2131 16.2303 13.0791 16.0348 12.9153C15.7312 12.6605 15.5139 12.5179 15.423 12.0734C15.3839 11.8837 15.4057 11.5899 15.4402 11.4214C15.5185 11.0585 15.4316 10.8257 15.1757 10.614C14.9676 10.4415 14.7025 10.3938 14.4115 10.3938C14.3029 10.3938 14.2034 10.3461 14.1292 10.3076C14.0079 10.2472 13.9078 10.096 14.0033 9.91023C14.0338 9.84985 14.1815 9.70322 14.216 9.67734C14.6111 9.45251 15.0665 9.52612 15.488 9.6946C15.8784 9.85445 16.174 10.1477 16.5989 10.5623C17.033 11.0631 17.1112 11.2011 17.3585 11.5772C17.554 11.871 17.7317 12.1729 17.8536 12.5185C17.9272 12.7341 17.8317 12.9107 17.5759 13.0188Z" fill="currentColor"></path></g><defs><clipPath id="clip0_logo"><rect width="26.634" height="19.6" fill="white" transform="translate(0.163086 1.75)"></rect></clipPath></defs></svg>
          </div>
          <div><h3>DeepSeek</h3><p>国产大模型 · 内置供应商</p></div>
        </div>
        <div class="ds-chain">
          <span class="node">国产模型</span><span class="arr">→</span>
          <span class="node">协议适配层</span><span class="arr">→</span>
          <span class="node">本地后端</span><span class="arr">→</span>
          <span class="node">学生学习数据</span>
        </div>
        <div class="ds-stats">
          <div class="ds-stat"><b>3</b><span>协议兼容</span></div>
          <div class="ds-stat"><b>国产</b><span>模型自主可控</span></div>
          <div class="ds-stat"><b>本地</b><span>数据不出设备</span></div>
        </div>
      </div>
    </div>
  </section>`);

  /* ---------- 16 · DeepSeek native features ---------- */
  const coupling = [
    ["globe", "DeepSeek Search 联网检索", "教材之外的问题，Lumi 直接检索真实网页并给出可点击出处，答案不再受限于模型记忆。"],
    ["file", "Fetch 正文精读", "检索只是给候选；真正读的是抓取回来的清洗正文，避免被搜索结果摘要带偏。"],
    ["bolt", "思考强度可调", "四档深度：不思考 / 快 / 深入 / 最深。查定义省时间，做证明题再拉到最久。"],
    ["plug", "与国产厂商深度耦合", "思考开关与推理强度按 DeepSeek 接口语义下发，而不是套一层通用参数。"],
  ];
  slides.push(`
  <section class="slide" data-k="dsnative">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">国产化底座 · DEEP INTEGRATION</span>
      <h2 class="slide-title a-l d2">不只是“能接上”，是把国产模型用透</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="dsw-wrap">
      <div class="dsw-list" data-stag=".09" data-d=".4">
        ${coupling.map(([ic, t, p]) => `<div class="card feat a">${window.icon(ic)}<div><b>${t}</b><p>${p}</p></div></div>`).join("")}
      </div>
      <div class="dsw-right">
        <div class="card skill-card a-s d3">
          <div class="skill-head"><span class="dotk"></span><b>联网检索 · 可追溯</b></div>
          <div class="skill-flow">
            <span class="nd">提问</span><span class="ar">→</span>
            <span class="nd hi">Search</span><span class="ar">→</span>
            <span class="nd">Fetch</span><span class="ar">→</span>
            <span class="nd">带出处的回答</span>
          </div>
          <div class="skill-src">
            <span>来源可选</span><span>正文清洗</span><span>失败不编造</span>
          </div>
        </div>
        <div class="card effort-card a-s d4">
          <div class="skill-head"><span class="dotk"></span><b>思考强度</b></div>
          <div class="effort-row">
            ${["不思考", "快", "深入", "最深"].map((l, i) => `<div class="eff${i === 2 ? " on" : ""}"><span class="bar" style="height:${[16, 30, 46, 62][i]}px"></span><b>${l}</b></div>`).join("")}
          </div>
          <p class="effort-note">默认“深入”：推理与讲解都顾得上；难题再手动拉到“最深”。</p>
        </div>
        <div class="dsw-pill a d5">${window.icon("plug")}协议层同样兼容 OpenAI / Anthropic / Gemini，国产优先，但不被锁定</div>
      </div>
    </div>
  </section>`);

  /* ---------- 16 · policy map ---------- */
  const policyRows = [
    ["第六条", "研发智能学伴。建设学生数字档案，根据学生能力、特质和爱好，动态优化学习路径。", "Lumi 智能学伴 + 学习画像 + 动态学习计划", "brain"],
    ["第十二条", "推动智能终端应用，通过大数据分析构建学生用户画像，以学生为中心配置学习资源，支撑规模教育下的个性学习。", "本地优先的桌面与移动端，一人一份学习画像", "users"],
    ["第十一条", "建设人工智能学习社区，汇聚开源课程，鼓励师生参与开源生态建设，实现语料共建、模型共测、应用共创。", "GPL-3.0 开源 + MLPS 学习包标准，学校可共建共享", "package"],
    ["第十条", "分教育阶段研发人工智能教育大模型，强化价值对齐、逻辑推理、安全伦理等能力。", "内置 DeepSeek 国产大模型，全栈自主可控", "cpu"],
    ["第十六条", "建立人工智能教育应用的安全防护体系，保障人工智能应用安全、可信、可控。", "数据本地存储、密钥加密、数据不出设备", "shield"],
    ["总体要求", "坚持育人为本、素养为先、应用导向、智能向善。", "AI 的终点是让学生不再依赖 AI", "compass"],
  ];
  slides.push(`
  <section class="slide" data-k="policymap">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">政策对照 · POLICY MAP</span>
      <h2 class="slide-title a-l d2">政策条文，一条一条落在我们的功能里</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="pmap" data-stag=".08" data-d=".35">
      <div class="pmap-head">
        <span>条款</span><span>《“人工智能+教育”行动计划》原文</span><span>Morrow Agent 的落地</span>
      </div>
      ${policyRows.map(([no, quote, impl, ic]) => `
        <div class="pmap-row a">
          <span class="pmap-no">${no}</span>
          <p class="pmap-quote">${quote}</p>
          <div class="pmap-impl">${window.icon(ic)}<span>${impl}</span></div>
        </div>`).join("")}
    </div>
  </section>`);

  /* ---------- 17 · product philosophy ---------- */
  const credo = [
    ["把 AI 放在「辅助位」，不放在「替代位」", "产品里没有一键出答案的捷径。诊断先要求证据，讲解先确认你卡在哪一步 —— AI 强，但始终站在学生身后半步。"],
    ["先做减法，再做加法", "能不加的按钮就不加。一张纸、一个对话框、七个步骤，把复杂留给系统，把简单留给学生。"],
    ["宁可说「不确定」，也不假装确定", "掌握度与置信度分开呈现，证据不足就标注不足。在学习这件事上，一个虚假的确定性比一个诚实的问号更有害。"],
    ["好用不是炫技，是可持续", "本地优先、国产模型、开源标准，都是为了让一所学校在不追加预算的前提下，也能长期用下去。"],
  ];
  slides.push(`
  <section class="slide" data-k="creed">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">产品哲学 · CREDO</span>
      <h2 class="slide-title a-l d2">我们相信的四件小事</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="creed-wrap">
      <div class="creed-grid" data-stag=".1" data-d=".4">
        ${credo.map(([t, p], i) => `<div class="card creed a"><span class="cn">${String(i + 1).padStart(2, "0")}</span><div><h3>${t}</h3><p>${p}</p></div></div>`).join("")}
      </div>
      <p class="creed-foot a d5">不追求“什么都能做”，只追求“该做的那件事做到位”。</p>
    </div>
  </section>`);

  /* ---------- 18 · philosophy ---------- */
  slides.push(`
  <section class="slide" data-k="philo">
    <div class="grain"></div>
    <div class="head">
      <div><span class="kicker a-l d1">先进理念 · PHILOSOPHY</span>
      <h2 class="slide-title a-l d2">四个理念，回答“AI 教育应该是什么”</h2></div>
      <div class="num a d1">${num()}</div>
    </div>
    <div class="philo-grid" data-stag=".09" data-d=".35">
      <div class="card philo a">${window.icon("scale")}<div><h3>教育公平</h3><p>优质教育资源不应受地域、家庭与师资限制。<em>让每个学生都获得持续、个性化的学习指导。</em></p></div></div>
      <div class="card philo a">${window.icon("compass")}<div><h3>自主学习</h3><p>AI 不应让学生越来越依赖 AI，而应让学生<em>逐渐拥有不依赖 AI 的能力</em> —— 这是产品的第一设计原则。</p></div></div>
      <div class="card philo a">${window.icon("cpu")}<div><h3>AI Native Education</h3><p>不是给旧软件加 AI 按钮，而是<em>从底层重构学习系统</em>：Agent 理解意图、动态规划、验证效果。</p></div></div>
      <div class="card philo a">${window.icon("heart")}<div><h3>无限可能</h3><p><em>过去的成绩，不应该定义未来的可能性。</em>让每个曾被认定“学不好”的学生，重新发现自己能学会。</p></div></div>
    </div>
  </section>`);

  /* ---------- 18 · end ---------- */
  slides.push(`
  <section class="slide end" data-k="end">
    <div class="grain"></div>
    <svg class="mtn" viewBox="0 0 1280 360" preserveAspectRatio="none">
      <path d="M0 360V240l200-80 180 70 220-120 200 90 180-60 180 60 120-30v180z" fill="#e2dbcf"/>
    </svg>
    <div class="lumi-end a-s d1">${LUMI_SVG()}</div>
    <h1 class="a d2">把自学的能力<br>还给<em>每一个人</em></h1>
    <p class="sub a d3">期望构建开放、普惠、可持续演进的 AI 学习生态</p>
    <div class="thanks a d4">恳请各位评委指导</div>
    <p class="meta a d5">陕西航空职业技术学院 · Morrow 团队 · 汉中市第八届职业院校技能大赛</p>
  </section>`);

  return slides;
};
