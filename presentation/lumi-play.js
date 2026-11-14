// Slide 6 runs the product's real Lumi engine (src/features/lumi/engine, the
// GrokBot-derived character rig) instead of hand-written keyframes. Clicking —
// or pressing Enter/Space while focused — replays a benign reaction from the
// engine's own "Reactions" state group and never advances the deck.
window.LumiPlay = (() => {
  // Curated subset of the engine's Reactions group: expressive but never
  // negative, which suits a live demo in front of judges.
  const MOODS = [
    { state: "happy", bubble: "早上好，今天也一起把它搞懂。" },
    { state: "curious", bubble: "嗯……让我看看你卡在哪一步。" },
    { state: "excited", bubble: "这个思路对了，就差最后一下。" },
    { state: "proud", bubble: "你已经比上次更稳了。" },
    { state: "playful", bubble: "换个角度看，题就松动了。" },
    { state: "laughing", bubble: "别急，一步一步来就行。" },
    { state: "celebrate", bubble: "证完了，这一块可以收进档案。" },
    { state: "shy", bubble: "被夸了……那我再讲细一点。" },
    { state: "surprised", bubble: "原来你是这样想的，记下了。" },
    { state: "listening", bubble: "我在听，你继续往下说。" },
    { state: "confused", bubble: "这一步有歧义，我们拆开看。" },
  ];

  // `thinking` is deliberately excluded: it swaps the body for the engine's
  // three-dot overlay, which reads as the character disappearing mid-pitch.

  // Occasional flourish from the engine's own physics layer. Spin is skipped on
  // purpose: it fires the rainbow belt particles, which fight the paper palette.
  const TRICKS = ["bounce"];

  let engine = null;
  let lastMood = -1;
  let busy = false;

  const randomMood = () => {
    const pool = MOODS.map((_, i) => i).filter((i) => i !== lastMood);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastMood = next;
    return MOODS[next];
  };

  const say = (bubble, text) => {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove("show");
    void bubble.offsetWidth;
    bubble.classList.add("show");
    clearTimeout(say.timer);
    say.timer = setTimeout(() => bubble.classList.remove("show"), 2600);
  };

  const react = (stage) => {
    if (!engine || busy) return;
    const mood = randomMood();
    const bubble = stage.querySelector("[data-lumi-bubble]");

    engine.setMode("hold");
    engine.setState(mood.state, { resetEyes: true });
    say(bubble, mood.bubble);

    // One in two clicks adds an engine-native physical flourish on top.
    if (Math.random() < 0.5) {
      const trick = TRICKS[Math.floor(Math.random() * TRICKS.length)];
      if (trick === "spin") engine.spinOnce(1);
      else if (trick === "bounce") engine.bounceOnce();
      else engine.burstOnce();
    }

    // Brief cooldown so a rapid double-click cannot stack state resets.
    busy = true;
    setTimeout(() => (busy = false), 420);

    // Drift back to a friendly resting face instead of holding the reaction.
    clearTimeout(react.rest);
    react.rest = setTimeout(() => engine && engine.setState("happy", { resetEyes: true }), 5200);
  };

  const attach = (stage) => {
    const host = stage.querySelector("[data-lumi]");
    const svg = host?.querySelector("svg.lumi-engine");
    if (!host || !svg || host.dataset.lumiBound === "1") return null;
    host.dataset.lumiBound = "1";

    const Character = window.LumiCharacter;
    if (!Character) return null;

    const el = new Character(svg, {
      shape: "blob",
      color: "black",
      scheme: "light",
      mode: "hold",
      state: "happy",
      loginWrap: true,
      followPointer: true,
    });
    // Match the deck's ink and paper so the character reads as part of the page.
    el.setInk("#384248");
    el.setEyeColor("#efeae2");
    el.setEmphasis(true);
    el.moodN = 1;
    window.__lumi = el; // handy for poking states from the console

    const handler = (event) => {
      // Keep the click/keypress away from the deck's advance behaviour.
      event.stopPropagation();
      event.preventDefault();
      react(stage);
    };

    host.addEventListener("click", handler);
    host.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") handler(event);
    });
    host.addEventListener("pointerenter", () => el.setFollowPointer(true));

    return el;
  };

  const init = () => {
    document.querySelectorAll(".slide[data-k='lumi'] .lumi-stage").forEach((stage) => {
      const el = attach(stage);
      if (el) engine = el;
    });
  };

  return {
    init,
    // The rig keeps a rAF loop; pause it while slide 6 is off-screen.
    setActive(active) {
      if (engine) engine.setPaused(!active);
    },
    react: () => engine && react(document.querySelector(".slide[data-k='lumi'] .lumi-stage")),
  };
})();
