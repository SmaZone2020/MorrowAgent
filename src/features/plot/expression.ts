/**
 * A tiny expression evaluator for plotted functions. The model writes things
 * like `a*sin(b*x)` in a plot block, so the app needs to read that without
 * pulling in a full CAS: numbers, `x`, named sliders, the usual operators and
 * the elementary functions are enough for the curves Lumi draws.
 */
export interface ExpressionScope {
  [name: string]: number;
}

type Node =
  | { kind: "number"; value: number }
  | { kind: "name"; name: string }
  | { kind: "unary"; op: "-" | "+"; arg: Node }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  sin: ([v]) => Math.sin(v ?? NaN),
  cos: ([v]) => Math.cos(v ?? NaN),
  tan: ([v]) => Math.tan(v ?? NaN),
  asin: ([v]) => Math.asin(v ?? NaN),
  acos: ([v]) => Math.acos(v ?? NaN),
  atan: ([v]) => Math.atan(v ?? NaN),
  sqrt: ([v]) => Math.sqrt(v ?? NaN),
  abs: ([v]) => Math.abs(v ?? NaN),
  ln: ([v]) => Math.log(v ?? NaN),
  log: ([v]) => Math.log10(v ?? NaN),
  exp: ([v]) => Math.exp(v ?? NaN),
  floor: ([v]) => Math.floor(v ?? NaN),
  ceil: ([v]) => Math.ceil(v ?? NaN),
  round: ([v]) => Math.round(v ?? NaN),
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
  sign: ([v]) => Math.sign(v ?? NaN),
};

type Token = { type: "number" | "name" | "op" | "paren"; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let end = index;
      while (end < source.length && /[0-9.]/.test(source[end]!)) end += 1;
      tokens.push({ type: "number", value: source.slice(index, end) });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let end = index;
      while (end < source.length && /[A-Za-z_0-9]/.test(source[end]!)) end += 1;
      tokens.push({ type: "name", value: source.slice(index, end) });
      index = end;
      continue;
    }
    if ("+-*/^".includes(char)) {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }
    if ("(),".includes(char)) {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    throw new Error(`无法识别的字符：${char}`);
  }
  return tokens;
}

function parse(tokens: Token[]): Node {
  let cursor = 0;

  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];

  const parseExpression = (): Node => {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && (token.value === "+" || token.value === "-")) {
        take();
        left = {
          kind: "binary",
          op: token.value,
          left,
          right: parseTerm(),
        };
        continue;
      }
      return left;
    }
  };

  // Juxtaposition means multiplication: `2x` and `3sin(x)` are what people
  // actually type, and requiring an explicit `*` would be a papercut.
  const startsFactor = (token: Token | undefined) =>
    token !== undefined &&
    (token.type === "number" ||
      token.type === "name" ||
      (token.type === "paren" && token.value === "("));

  const parseTerm = (): Node => {
    let left = parseUnary();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && (token.value === "*" || token.value === "/")) {
        take();
        left = { kind: "binary", op: token.value, left, right: parseUnary() };
        continue;
      }
      if (startsFactor(token)) {
        left = { kind: "binary", op: "*", left, right: parseUnary() };
        continue;
      }
      return left;
    }
  };

  const parseUnary = (): Node => {
    const token = peek();
    if (token?.type === "op" && (token.value === "-" || token.value === "+")) {
      take();
      return {
        kind: "unary",
        op: token.value,
        arg: parseUnary(),
      };
    }
    return parsePower();
  };

  const parsePower = (): Node => {
    const base = parsePrimary();
    const token = peek();
    if (token?.type === "op" && token.value === "^") {
      take();
      // Right associative, and the exponent may itself be negative.
      return { kind: "binary", op: "^", left: base, right: parseUnary() };
    }
    return base;
  };

  const parsePrimary = (): Node => {
    const token = take();
    if (!token) throw new Error("表达式不完整");
    if (token.type === "number") {
      const value = Number(token.value);
      if (!Number.isFinite(value)) throw new Error(`数字无效：${token.value}`);
      return { kind: "number", value };
    }
    if (token.type === "name") {
      if (peek()?.type === "paren" && peek()?.value === "(") {
        take();
        const args: Node[] = [];
        if (!(peek()?.type === "paren" && peek()?.value === ")")) {
          args.push(parseExpression());
          while (peek()?.type === "paren" && peek()?.value === ",") {
            take();
            args.push(parseExpression());
          }
        }
        const close = take();
        if (close?.value !== ")") throw new Error("缺少右括号");
        if (!FUNCTIONS[token.value]) throw new Error(`未知函数：${token.value}`);
        return { kind: "call", name: token.value, args };
      }
      return { kind: "name", name: token.value };
    }
    if (token.type === "paren" && token.value === "(") {
      const inner = parseExpression();
      const close = take();
      if (close?.value !== ")") throw new Error("缺少右括号");
      return inner;
    }
    throw new Error(`多余的符号：${token.value}`);
  };

  const root = parseExpression();
  if (cursor < tokens.length) {
    throw new Error(`多余的符号：${tokens[cursor]!.value}`);
  }
  return root;
}

function evaluate(node: Node, scope: ExpressionScope): number {
  switch (node.kind) {
    case "number":
      return node.value;
    case "name":
      if (node.name in scope) return scope[node.name]!;
      if (node.name in CONSTANTS) return CONSTANTS[node.name]!;
      return NaN;
    case "unary": {
      const value = evaluate(node.arg, scope);
      return node.op === "-" ? -value : value;
    }
    case "binary": {
      const left = evaluate(node.left, scope);
      const right = evaluate(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          return left ** right;
      }
      return NaN;
    }
    case "call": {
      const fn = FUNCTIONS[node.name];
      if (!fn) return NaN;
      return fn(node.args.map((arg) => evaluate(arg, scope)));
    }
  }
}

/** Compiles once, evaluates many times: the plot samples hundreds of points. */
export function compileExpression(source: string): (scope: ExpressionScope) => number {
  const ast = parse(tokenize(source));
  return (scope) => evaluate(ast, scope);
}
