export type DiffCellType = "equal" | "insert" | "delete" | "empty";

export interface DiffCell {
  type: DiffCellType;
  text: string;
}

export interface DiffRow {
  left: DiffCell;
  right: DiffCell;
}

type DiffOp =
  | { type: "equal"; text: string }
  | { type: "insert"; text: string }
  | { type: "delete"; text: string };

/** 构建最长公共子序列的动态规划表 */
function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/** 从动态规划表回溯差异操作序列 */
function backtrackOps(a: string[], b: string[], dp: number[][]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: "equal", text: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "insert", text: b[j - 1] });
      j -= 1;
    } else {
      ops.unshift({ type: "delete", text: a[i - 1] });
      i -= 1;
    }
  }

  return ops;
}

/** 将差异操作序列转换为对齐的行 */
function opsToRows(ops: DiffOp[]): DiffRow[] {
  return ops.map((op) => {
    if (op.type === "equal") {
      return {
        left: { type: "equal", text: op.text },
        right: { type: "equal", text: op.text },
      };
    }
    if (op.type === "delete") {
      return {
        left: { type: "delete", text: op.text },
        right: { type: "empty", text: "" },
      };
    }
    return {
      left: { type: "empty", text: "" },
      right: { type: "insert", text: op.text },
    };
  });
}

/** 按行对比原文与优化版，生成左右对齐的差异行 */
export function diffResumeLines(original: string, optimized: string): DiffRow[] {
  const a = original.split("\n");
  const b = optimized.split("\n");
  const dp = buildLcsTable(a, b);
  return opsToRows(backtrackOps(a, b, dp));
}
