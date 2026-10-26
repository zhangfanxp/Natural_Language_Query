"use client";

import { useEffect, useState } from "react";
import { Activity, Database, MessageSquareText, Sparkles } from "lucide-react";

type ThinkingOverlayProps = {
  open: boolean;
  question: string;
};

export function ThinkingOverlay({ open, question }: ThinkingOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

  return (
    <div className="thinking-backdrop fixed inset-0 z-[100] grid place-items-center overflow-hidden p-4" role="dialog" aria-modal="true" aria-labelledby="thinking-title" aria-describedby="thinking-description">
      <div className="thinking-card relative w-full max-w-[540px] overflow-hidden rounded-[30px] border border-white/10 text-white shadow-[0_32px_120px_rgba(3,12,28,.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(95,129,255,.23),transparent_38%),radial-gradient(circle_at_100%_78%,rgba(64,211,181,.16),transparent_35%),linear-gradient(145deg,#172642_0%,#101c32_56%,#0b1628_100%)]" />
        <div className="thinking-glow pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-400/15 blur-[80px]" />
        <div className="thinking-glow thinking-glow-delay pointer-events-none absolute -bottom-36 -left-12 h-72 w-72 rounded-full bg-emerald-300/10 blur-[90px]" />

        <div className="relative px-6 pb-6 pt-6 sm:px-9 sm:pb-8 sm:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[.08] text-[#82e5ce] shadow-inner shadow-white/5"><Database size={18} /></div>
              <div>
                <div className="text-[11px] font-semibold tracking-[.2em] text-white/90">WREN</div>
                <div className="mt-0.5 text-[9px] tracking-[.16em] text-blue-100/45">INTELLIGENCE ENGINE</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-1.5 text-[10px] font-medium text-emerald-100/80">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#70dfc3]" /></span>
              LIVE ANALYSIS
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center text-center sm:mt-9">
            <div className="relative flex h-[126px] w-[126px] items-center justify-center">
              <div className="absolute inset-[8px] rounded-full border border-white/[.07]" />
              <div className="thinking-orbit absolute inset-0 rounded-full border border-transparent border-r-[#6ce0c3]/50 border-t-[#a6b8ff]" />
              <div className="thinking-orbit-reverse absolute inset-[17px] rounded-full border border-transparent border-b-[#6ce0c3]/70 border-l-white/20" />
              <div className="thinking-core relative flex h-[76px] w-[76px] items-center justify-center rounded-[26px] border border-white/15 bg-gradient-to-br from-[#526fe1]/80 to-[#1b9d91]/75 shadow-[0_0_45px_rgba(104,151,255,.28)]">
                <Sparkles size={29} strokeWidth={1.5} className="thinking-sparkle text-white" />
              </div>
              <span className="absolute right-[15px] top-[22px] h-2 w-2 rounded-full bg-[#7be5cc] shadow-[0_0_13px_#7be5cc]" />
              <span className="absolute bottom-[15px] left-[22px] h-1.5 w-1.5 rounded-full bg-[#9cafff] shadow-[0_0_12px_#9cafff]" />
            </div>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-[.22em] text-[#8ea9ff]">AI DATA ANALYSIS</div>
            <h2 id="thinking-title" className="mt-2 text-[22px] font-semibold tracking-tight text-white sm:text-[25px]">正在为你组织答案</h2>
            <p id="thinking-description" className="mt-2 max-w-sm text-xs leading-6 text-blue-100/60 sm:text-[13px]">
              正在理解问题、查询相关数据，并整理分析结果。完成后这个窗口会自动关闭。
            </p>
          </div>

          {question && <div className="mt-6 rounded-2xl border border-white/[.08] bg-white/[.045] px-4 py-3 text-left backdrop-blur-sm">
            <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-blue-100/40"><MessageSquareText size={11} />本次问题</div>
            <p className="line-clamp-2 text-xs leading-5 text-white/85">{question}</p>
          </div>}

          <div className="mt-6 grid grid-cols-3 divide-x divide-white/[.08] rounded-2xl border border-white/[.07] bg-black/[.08] py-3">
            <ThinkingStage icon={<Sparkles size={13} />} label="理解问题" />
            <ThinkingStage icon={<Database size={13} />} label="查询数据" />
            <ThinkingStage icon={<Activity size={13} />} label="整理结果" />
          </div>

          <div className="thinking-progress-track mt-6 h-[3px] overflow-hidden rounded-full bg-white/10"><div className="thinking-progress-bar h-full w-[38%] rounded-full" /></div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-blue-100/45">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#70dfc3]" />模型正在处理请求</span>
            <span aria-label={`已等待 ${elapsedSeconds} 秒`} className="tabular-nums">已等待 {minutes}:{seconds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingStage({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex flex-col items-center gap-1.5 px-2 text-[10px] text-blue-100/55"><span className="text-[#8ea9ff]/80">{icon}</span><span>{label}</span></div>;
}
