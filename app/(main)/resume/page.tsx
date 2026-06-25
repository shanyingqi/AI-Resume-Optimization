import { Suspense } from "react";
import ResumeOptimizer from "@/app/components/ResumeOptimizer";

// 简历优化加载中
function ResumeOptimizerFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      加载中...
    </div>
  );
}

// 简历优化页面
export default function ResumePage() {
  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<ResumeOptimizerFallback />}>
        <ResumeOptimizer />
      </Suspense>
    </div>
  );
}
