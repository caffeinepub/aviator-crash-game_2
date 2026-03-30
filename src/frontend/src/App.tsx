import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import HomePage from "./HomePage";

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = "waiting" | "flying" | "crashed";

interface CrashEntry {
  id: number;
  value: number;
}

interface BetRecord {
  id: number;
  slot: 1 | 2;
  betAmount: number;
  cashoutAt: number | null;
  profit: number;
  timestamp: number;
}

interface BetSlot {
  betAmount: number;
  isBetPlaced: boolean;
  cashedOut: number | null;
  autoCashout: boolean;
  autoCashoutTarget: number;
  autoCashoutInput: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GROWTH_RATE = 0.0001;
const WAITING_SECS = 5;
const CRASH_SHOW_MS = 3000;

// SVG canvas bezier control points (viewBox 0 0 800 420)
const P0 = { x: 55, y: 395 };
const BCP = { x: 280, y: 190 };
const P2 = { x: 760, y: 25 };

// ─── Bezier Utils ─────────────────────────────────────────────────────────────
function bezierPoint(t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * P0.x + 2 * mt * t * BCP.x + t * t * P2.x,
    y: mt * mt * P0.y + 2 * mt * t * BCP.y + t * t * P2.y,
  };
}

function bezierAngle(t: number) {
  const mt = 1 - t;
  const tx = 2 * mt * (BCP.x - P0.x) + 2 * t * (P2.x - BCP.x);
  const ty = 2 * mt * (BCP.y - P0.y) + 2 * t * (P2.y - BCP.y);
  return Math.atan2(ty, tx) * (180 / Math.PI);
}

function multToT(m: number) {
  return Math.min(0.96, 1 - Math.exp(-0.11 * (m - 1)));
}

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.01) return 1.0;
  return Math.max(1.01, Math.min(200, 0.99 / (1 - r)));
}

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── SVG Plane ────────────────────────────────────────────────────────────────
function Plane({
  x,
  y,
  angle,
  shaking,
  visible,
}: {
  x: number;
  y: number;
  angle: number;
  shaking: boolean;
  visible: boolean;
}) {
  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s" }}
    >
      <g className={shaking ? "plane-shake" : ""}>
        <ellipse cx="4" cy="0" rx="22" ry="14" fill="#FF3B3B" opacity="0.08" />
        <path d="M 26,0 L -6,-5 L -3,0 L -6,5 Z" fill="#FF4444" />
        <path d="M 6,-4 L -8,-22 L -11,-4 Z" fill="#CC2222" />
        <path d="M 6,4 L -8,22 L -11,4 Z" fill="#CC2222" />
        <path d="M -4,0 L -14,-9 L -14,-1 Z" fill="#AA1111" />
        <ellipse cx="5" cy="-8" rx="3.5" ry="2" fill="#BB2222" />
        <ellipse cx="5" cy="8" rx="3.5" ry="2" fill="#BB2222" />
        <ellipse cx="16" cy="-1" rx="4" ry="2.5" fill="#FF9999" opacity="0.5" />
        <path
          d="M -6,0 L -16,-2.5 L -13,0 L -16,2.5 Z"
          fill="#FF6600"
          opacity="0.8"
        />
        <path
          d="M -6,0 L -20,-1.5 L -17,0 L -20,1.5 Z"
          fill="#FFAA00"
          opacity="0.4"
        />
      </g>
    </g>
  );
}

// ─── Crash History Pill ───────────────────────────────────────────────────────
function CrashPill({ value }: { value: number }) {
  const cls =
    value >= 2
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      : value >= 1.5
        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
        : "bg-red-500/15 text-red-400 border-red-500/25";
  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap font-mono",
        cls,
      )}
    >
      {value.toFixed(2)}x
    </span>
  );
}

// ─── Utility Button ───────────────────────────────────────────────────────────
function StepBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-xl bg-[#0d1423] border border-[#24314A] text-white font-bold text-lg hover:bg-[#1a2540] hover:border-[#3a4f6e] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {children}
    </button>
  );
}

// ─── Quick Chip ───────────────────────────────────────────────────────────────
function Chip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded-lg bg-[#0d1423] border border-[#24314A] text-xs font-semibold text-[#9AA7BD] hover:border-[#9DFF3A]/40 hover:text-[#9DFF3A] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

// ─── Default Bet Slot ─────────────────────────────────────────────────────────
function defaultSlot(): BetSlot {
  return {
    betAmount: 50,
    isBetPlaced: false,
    cashedOut: null,
    autoCashout: false,
    autoCashoutTarget: 2.0,
    autoCashoutInput: "2.00",
  };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function AviatorGame() {
  // Game state
  const [phase, setPhase] = useState<Phase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(WAITING_SECS);
  const [planeT, setPlaneT] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [crashedAt, setCrashedAt] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  // Player state
  const [balance, setBalance] = useState(() => {
    try {
      const s = localStorage.getItem("av_balance");
      const v = s ? Number.parseFloat(s) : Number.NaN;
      return Number.isNaN(v) || v < 0 ? 1000 : v;
    } catch {
      return 1000;
    }
  });

  // Deposit/Withdrawal modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState<"deposit" | "withdraw">("deposit");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletMsg, setWalletMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Dual bet slots
  const [bet1, setBet1] = useState<BetSlot>(() => {
    try {
      const s = localStorage.getItem("av_bet1_amount");
      const v = s ? Number.parseFloat(s) : Number.NaN;
      const slot = defaultSlot();
      if (!Number.isNaN(v) && v > 0) slot.betAmount = v;
      return slot;
    } catch {
      return defaultSlot();
    }
  });
  const [bet2, setBet2] = useState<BetSlot>(() => {
    try {
      const s = localStorage.getItem("av_bet2_amount");
      const v = s ? Number.parseFloat(s) : Number.NaN;
      const slot = defaultSlot();
      if (!Number.isNaN(v) && v > 0) slot.betAmount = v;
      return slot;
    } catch {
      return defaultSlot();
    }
  });

  // History
  const [crashHistory, setCrashHistory] = useState<CrashEntry[]>(() => {
    try {
      const s = localStorage.getItem("av_history");
      if (s) return JSON.parse(s);
    } catch {}
    return [
      { id: 1, value: 1.23 },
      { id: 2, value: 3.45 },
      { id: 3, value: 1.87 },
      { id: 4, value: 6.72 },
      { id: 5, value: 1.12 },
      { id: 6, value: 2.34 },
      { id: 7, value: 4.56 },
      { id: 8, value: 1.01 },
      { id: 9, value: 2.89 },
      { id: 10, value: 1.45 },
      { id: 11, value: 8.23 },
      { id: 12, value: 1.67 },
    ];
  });
  const [myBets, setMyBets] = useState<BetRecord[]>(() => {
    try {
      const s = localStorage.getItem("av_bets");
      if (s) return JSON.parse(s);
    } catch {}
    return [
      {
        id: 3,
        slot: 1 as const,
        betAmount: 25,
        cashoutAt: 1.87,
        profit: 21.75,
        timestamp: Date.now() - 90000,
      },
      {
        id: 2,
        slot: 2 as const,
        betAmount: 100,
        cashoutAt: null,
        profit: -100,
        timestamp: Date.now() - 60000,
      },
      {
        id: 1,
        slot: 1 as const,
        betAmount: 50,
        cashoutAt: 2.34,
        profit: 67,
        timestamp: Date.now() - 30000,
      },
    ];
  });

  // Refs for animation loop
  const balanceRef = useRef(balance);
  // Slot 1 refs
  const isBetPlacedRef1 = useRef(false);
  const cashedOutRef1 = useRef<number | null>(null);
  const betAmountRef1 = useRef(bet1.betAmount);
  const autoCashoutRef1 = useRef(false);
  const autoCashoutTargetRef1 = useRef(2.0);
  // Slot 2 refs
  const isBetPlacedRef2 = useRef(false);
  const cashedOutRef2 = useRef<number | null>(null);
  const betAmountRef2 = useRef(bet2.betAmount);
  const autoCashoutRef2 = useRef(false);
  const autoCashoutTargetRef2 = useRef(2.0);

  const crashPointRef = useRef(0);
  const phaseRef = useRef<Phase>("waiting");

  // Sync refs
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);
  useEffect(() => {
    betAmountRef1.current = bet1.betAmount;
    autoCashoutRef1.current = bet1.autoCashout;
    autoCashoutTargetRef1.current = bet1.autoCashoutTarget;
  }, [bet1]);
  useEffect(() => {
    betAmountRef2.current = bet2.betAmount;
    autoCashoutRef2.current = bet2.autoCashout;
    autoCashoutTargetRef2.current = bet2.autoCashoutTarget;
  }, [bet2]);

  // Persist
  useEffect(() => {
    localStorage.setItem("av_balance", String(balance));
  }, [balance]);
  useEffect(() => {
    localStorage.setItem("av_bet1_amount", String(bet1.betAmount));
  }, [bet1.betAmount]);
  useEffect(() => {
    localStorage.setItem("av_bet2_amount", String(bet2.betAmount));
  }, [bet2.betAmount]);
  useEffect(() => {
    localStorage.setItem(
      "av_history",
      JSON.stringify(crashHistory.slice(0, 20)),
    );
  }, [crashHistory]);
  useEffect(() => {
    localStorage.setItem("av_bets", JSON.stringify(myBets.slice(0, 20)));
  }, [myBets]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: gameKey is the intentional trigger
  useEffect(() => {
    let cancelled = false;
    let animId: number;
    let countdownInterval: ReturnType<typeof setInterval>;

    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    // Reset slot refs
    isBetPlacedRef1.current = false;
    cashedOutRef1.current = null;
    isBetPlacedRef2.current = false;
    cashedOutRef2.current = null;
    phaseRef.current = "waiting";

    setPhase("waiting");
    setMultiplier(1.0);
    setPlaneT(0);
    setShaking(false);
    setBet1((prev) => ({ ...prev, isBetPlaced: false, cashedOut: null }));
    setBet2((prev) => ({ ...prev, isBetPlaced: false, cashedOut: null }));

    let count = WAITING_SECS;
    setCountdown(count);

    countdownInterval = setInterval(() => {
      if (cancelled) return;
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        if (!cancelled) startFlying();
      }
    }, 1000);

    function startFlying() {
      if (cancelled) return;
      phaseRef.current = "flying";
      setPhase("flying");
      const t0 = performance.now();

      function frame(now: number) {
        if (cancelled) return;
        const elapsed = now - t0;
        const m = Math.E ** (GROWTH_RATE * elapsed);
        setMultiplier(m);
        setPlaneT(multToT(m));

        // Auto cashout slot 1
        if (
          isBetPlacedRef1.current &&
          cashedOutRef1.current === null &&
          autoCashoutRef1.current &&
          m >= autoCashoutTargetRef1.current
        ) {
          doCashout(1, m);
        }
        // Auto cashout slot 2
        if (
          isBetPlacedRef2.current &&
          cashedOutRef2.current === null &&
          autoCashoutRef2.current &&
          m >= autoCashoutTargetRef2.current
        ) {
          doCashout(2, m);
        }

        if (m >= crashPointRef.current) {
          const final = crashPointRef.current;
          setMultiplier(final);
          setPlaneT(multToT(final));
          doCrash(final);
          return;
        }

        animId = requestAnimationFrame(frame);
      }

      animId = requestAnimationFrame(frame);
    }

    function doCashout(slot: 1 | 2, atMult: number) {
      const isBetPlacedRef = slot === 1 ? isBetPlacedRef1 : isBetPlacedRef2;
      const cashedOutRef = slot === 1 ? cashedOutRef1 : cashedOutRef2;
      const betAmountRef = slot === 1 ? betAmountRef1 : betAmountRef2;
      const setBet = slot === 1 ? setBet1 : setBet2;

      if (cashedOutRef.current !== null || !isBetPlacedRef.current) return;
      cashedOutRef.current = atMult;
      setBet((prev) => ({ ...prev, cashedOut: atMult }));
      const win = betAmountRef.current * atMult;
      const newBal = balanceRef.current + win;
      balanceRef.current = newBal;
      setBalance(newBal);
      const rec: BetRecord = {
        id: Date.now() + slot,
        slot,
        betAmount: betAmountRef.current,
        cashoutAt: atMult,
        profit: win - betAmountRef.current,
        timestamp: Date.now(),
      };
      setMyBets((prev) => [rec, ...prev].slice(0, 20));
    }

    function doCrash(final: number) {
      if (cancelled) return;
      phaseRef.current = "crashed";
      setPhase("crashed");
      setCrashedAt(final);
      setShaking(true);

      const now = Date.now();
      const newRecs: BetRecord[] = [];
      if (isBetPlacedRef1.current && cashedOutRef1.current === null) {
        newRecs.push({
          id: now,
          slot: 1,
          betAmount: betAmountRef1.current,
          cashoutAt: null,
          profit: -betAmountRef1.current,
          timestamp: now,
        });
      }
      if (isBetPlacedRef2.current && cashedOutRef2.current === null) {
        newRecs.push({
          id: now + 1,
          slot: 2,
          betAmount: betAmountRef2.current,
          cashoutAt: null,
          profit: -betAmountRef2.current,
          timestamp: now,
        });
      }
      if (newRecs.length > 0) {
        setMyBets((prev) => [...newRecs, ...prev].slice(0, 20));
      }

      setCrashHistory((prev) =>
        [{ id: now, value: final }, ...prev].slice(0, 20),
      );

      setTimeout(() => {
        if (cancelled) return;
        setShaking(false);
        setGameKey((k) => k + 1);
      }, CRASH_SHOW_MS);
    }

    return () => {
      cancelled = true;
      clearInterval(countdownInterval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [gameKey]);

  // ── Bet Handlers ──────────────────────────────────────────────────────────
  function placeBet(slot: 1 | 2) {
    const bet = slot === 1 ? bet1 : bet2;
    const setBet = slot === 1 ? setBet1 : setBet2;
    const isBetPlacedRef = slot === 1 ? isBetPlacedRef1 : isBetPlacedRef2;
    if (
      phase !== "waiting" ||
      bet.isBetPlaced ||
      bet.betAmount <= 0 ||
      bet.betAmount > balance
    )
      return;
    const nb = balanceRef.current - bet.betAmount;
    balanceRef.current = nb;
    setBalance(nb);
    isBetPlacedRef.current = true;
    setBet((prev) => ({ ...prev, isBetPlaced: true }));
  }

  function cancelBet(slot: 1 | 2) {
    const bet = slot === 1 ? bet1 : bet2;
    const setBet = slot === 1 ? setBet1 : setBet2;
    const isBetPlacedRef = slot === 1 ? isBetPlacedRef1 : isBetPlacedRef2;
    if (phase !== "waiting" || !bet.isBetPlaced) return;
    const nb = balanceRef.current + bet.betAmount;
    balanceRef.current = nb;
    setBalance(nb);
    isBetPlacedRef.current = false;
    setBet((prev) => ({ ...prev, isBetPlaced: false }));
  }

  function cashOut(slot: 1 | 2) {
    const bet = slot === 1 ? bet1 : bet2;
    const isBetPlacedRef = slot === 1 ? isBetPlacedRef1 : isBetPlacedRef2;
    const cashedOutRef = slot === 1 ? cashedOutRef1 : cashedOutRef2;
    const setBet = slot === 1 ? setBet1 : setBet2;
    if (!isBetPlacedRef.current || cashedOutRef.current !== null) return;
    const atMult = multiplier;
    cashedOutRef.current = atMult;
    setBet((prev) => ({ ...prev, cashedOut: atMult }));
    const win = bet.betAmount * atMult;
    const nb = balanceRef.current + win;
    balanceRef.current = nb;
    setBalance(nb);
    const rec: BetRecord = {
      id: Date.now() + slot,
      slot,
      betAmount: bet.betAmount,
      cashoutAt: atMult,
      profit: win - bet.betAmount,
      timestamp: Date.now(),
    };
    setMyBets((prev) => [rec, ...prev].slice(0, 20));
  }

  function resetBalance() {
    balanceRef.current = 1000;
    setBalance(1000);
  }

  function handleWalletSubmit() {
    const amt = Number.parseFloat(walletAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setWalletMsg({ type: "err", text: "সঠিক পরিমাণ লিখুন" });
      return;
    }
    if (walletTab === "deposit") {
      const newBal = balanceRef.current + amt;
      balanceRef.current = newBal;
      setBalance(newBal);
      setWalletMsg({ type: "ok", text: `${amt} CR জমা হয়েছে` });
    } else {
      if (amt > balanceRef.current) {
        setWalletMsg({ type: "err", text: "পর্যাপ্ত ব্যালেন্স নেই" });
        return;
      }
      const newBal = balanceRef.current - amt;
      balanceRef.current = newBal;
      setBalance(newBal);
      setWalletMsg({ type: "ok", text: `${amt} CR উত্তোলন হয়েছে` });
    }
    setWalletAmount("");
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const planePos = bezierPoint(planeT);
  const planeAngle = bezierAngle(planeT);
  const trailCPX = P0.x + planeT * (BCP.x - P0.x);
  const trailCPY = P0.y + planeT * (BCP.y - P0.y);
  const trailPath = `M ${P0.x},${P0.y} Q ${trailCPX},${trailCPY} ${planePos.x},${planePos.y}`;

  const multColor =
    phase === "crashed"
      ? "#FF3B3B"
      : multiplier >= 2
        ? "#9DFF3A"
        : multiplier >= 1.5
          ? "#F5B800"
          : "#9DFF3A";
  const multGlowClass = phase === "crashed" ? "glow-red" : "glow-green";

  // ── Bet Panel ─────────────────────────────────────────────────────────────
  function BetPanel({ slot }: { slot: 1 | 2 }) {
    const bet = slot === 1 ? bet1 : bet2;
    const setBet = slot === 1 ? setBet1 : setBet2;
    const label = `Bet ${slot}`;
    const ocidPrefix = slot === 1 ? "bet1" : "bet2";

    const canBet =
      phase === "waiting" &&
      !bet.isBetPlaced &&
      bet.betAmount > 0 &&
      bet.betAmount <= balance;

    return (
      <div className="flex-1 min-w-0 rounded-2xl border border-[#1e2e48] bg-[#0d1526] p-2.5 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black",
                slot === 1
                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/40"
                  : "bg-[#9DFF3A]/20 text-[#9DFF3A] border border-[#9DFF3A]/40",
              )}
            >
              {slot}
            </span>
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#9AA7BD] font-bold">
              {label}
            </h3>
          </div>
          {bet.isBetPlaced && !bet.cashedOut && phase === "waiting" && (
            <span className="text-[9px] text-[#9DFF3A] font-bold uppercase tracking-wider">
              ● PLACED
            </span>
          )}
        </div>

        {/* Amount stepper */}
        <div className="flex items-center gap-1.5">
          <StepBtn
            onClick={() =>
              setBet((prev) => ({
                ...prev,
                betAmount: Math.max(1, prev.betAmount - 1),
              }))
            }
            disabled={phase !== "waiting" || bet.isBetPlaced}
          >
            −
          </StepBtn>
          <div className="flex-1">
            <Input
              type="number"
              value={bet.betAmount}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v))
                  setBet((prev) => ({
                    ...prev,
                    betAmount: Math.max(1, Math.min(balance, v)),
                  }));
              }}
              disabled={phase !== "waiting" || bet.isBetPlaced}
              min={1}
              max={balance}
              className="text-center font-black text-sm bg-[#070D1B] border-[#24314A] text-white font-mono h-8 disabled:opacity-60 focus:border-[#9DFF3A]/50"
              data-ocid={`${ocidPrefix}.input`}
            />
          </div>
          <StepBtn
            onClick={() =>
              setBet((prev) => ({
                ...prev,
                betAmount: Math.min(balance, prev.betAmount + 1),
              }))
            }
            disabled={phase !== "waiting" || bet.isBetPlaced}
          >
            +
          </StepBtn>
        </div>

        {/* Quick chips */}
        <div className="flex gap-1.5 flex-wrap">
          {[10, 25, 50, 100].map((amt) => (
            <Chip
              key={amt}
              label={String(amt)}
              onClick={() =>
                setBet((prev) => ({
                  ...prev,
                  betAmount: Math.min(balance, amt),
                }))
              }
              disabled={phase !== "waiting" || bet.isBetPlaced || amt > balance}
            />
          ))}
          <Chip
            label="½"
            onClick={() =>
              setBet((prev) => ({
                ...prev,
                betAmount: Math.max(1, Math.floor(balance / 2)),
              }))
            }
            disabled={phase !== "waiting" || bet.isBetPlaced || balance < 2}
          />
          <Chip
            label="MAX"
            onClick={() =>
              setBet((prev) => ({ ...prev, betAmount: Math.floor(balance) }))
            }
            disabled={phase !== "waiting" || bet.isBetPlaced || balance < 1}
          />
        </div>

        {/* Auto Cashout */}
        <div className="bg-[#070D1B] border border-[#1e2e48] rounded-xl p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-[#E8EEF9] cursor-pointer">
              Auto Cash Out
            </Label>
            <Switch
              checked={bet.autoCashout}
              onCheckedChange={(v) =>
                setBet((prev) => ({ ...prev, autoCashout: v }))
              }
              data-ocid={`${ocidPrefix}.switch`}
            />
          </div>

          {bet.autoCashout && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] text-[#9AA7BD] whitespace-nowrap uppercase tracking-wide">
                Target:
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    const v = Math.max(
                      1.1,
                      Number.parseFloat(
                        (bet.autoCashoutTarget - 0.1).toFixed(2),
                      ),
                    );
                    setBet((prev) => ({
                      ...prev,
                      autoCashoutTarget: v,
                      autoCashoutInput: v.toFixed(2),
                    }));
                  }}
                  className="w-7 h-7 rounded-lg bg-[#111A2B] border border-[#24314A] text-white text-sm hover:bg-[#1a2540] transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <Input
                  type="number"
                  value={bet.autoCashoutInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setBet((prev) => ({ ...prev, autoCashoutInput: raw }));
                    const v = Number.parseFloat(raw);
                    if (!Number.isNaN(v) && v >= 1.1) {
                      setBet((prev) => ({
                        ...prev,
                        autoCashoutTarget: v,
                      }));
                    }
                  }}
                  step={0.1}
                  min={1.1}
                  className="w-20 text-center font-black font-mono bg-[#111A2B] border-[#24314A] text-[#9DFF3A] h-7 text-xs focus:border-[#9DFF3A]/60"
                  data-ocid={`${ocidPrefix}.input`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = Number.parseFloat(
                      (bet.autoCashoutTarget + 0.1).toFixed(2),
                    );
                    setBet((prev) => ({
                      ...prev,
                      autoCashoutTarget: v,
                      autoCashoutInput: v.toFixed(2),
                    }));
                  }}
                  className="w-7 h-7 rounded-lg bg-[#111A2B] border border-[#24314A] text-white text-sm hover:bg-[#1a2540] transition-colors flex items-center justify-center"
                >
                  +
                </button>
                <span className="text-[#9DFF3A] font-mono font-black text-sm">
                  x
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <AnimatePresence mode="wait">
          {phase === "waiting" && !bet.isBetPlaced && (
            <motion.button
              key={`${ocidPrefix}-bet-btn`}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              onClick={() => placeBet(slot)}
              disabled={!canBet}
              className={cn(
                "w-full h-9 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-150 active:scale-[0.98] text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-lg",
                slot === 1
                  ? "bg-[#F59E0B] hover:bg-[#FBBF24]"
                  : "bg-[#9DFF3A] hover:bg-[#B0FF55]",
              )}
              style={{
                boxShadow: canBet
                  ? slot === 1
                    ? "0 4px 20px rgba(245,158,11,0.35)"
                    : "0 4px 20px rgba(157,255,58,0.35)"
                  : "none",
              }}
              data-ocid={`${ocidPrefix}.primary_button`}
            >
              BET {fmt(bet.betAmount)}
            </motion.button>
          )}

          {phase === "waiting" && bet.isBetPlaced && (
            <motion.div
              key={`${ocidPrefix}-placed`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-1.5"
            >
              <div className="w-full h-8 rounded-xl font-black text-[10px] uppercase tracking-wider bg-[#9DFF3A]/10 border border-[#9DFF3A]/30 text-[#9DFF3A] flex items-center justify-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="#9DFF3A"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M5 8L7 10L11 6"
                    stroke="#9DFF3A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {fmt(bet.betAmount)} Placed
              </div>
              <button
                type="button"
                onClick={() => cancelBet(slot)}
                className="w-full py-1.5 text-xs text-[#9AA7BD] hover:text-white transition-colors"
                data-ocid={`${ocidPrefix}.cancel_button`}
              >
                Cancel Bet
              </button>
            </motion.div>
          )}

          {phase === "flying" && bet.isBetPlaced && bet.cashedOut === null && (
            <motion.button
              key={`${ocidPrefix}-cashout-btn`}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => cashOut(slot)}
              className="w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-100 bg-[#9DFF3A] hover:bg-[#B0FF55] active:scale-[0.97] text-black neon-pulse"
              data-ocid={`${ocidPrefix}.primary_button`}
            >
              CASH OUT @ {multiplier.toFixed(2)}x
              <div className="text-[10px] font-semibold opacity-75 mt-0.5 normal-case">
                = {fmt(bet.betAmount * multiplier)} cr
              </div>
            </motion.button>
          )}

          {phase === "flying" && bet.isBetPlaced && bet.cashedOut !== null && (
            <motion.div
              key={`${ocidPrefix}-cashed`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-wider bg-[#9DFF3A]/10 border border-[#9DFF3A]/30 text-[#9DFF3A] flex flex-col items-center justify-center"
            >
              <span>✓ @ {bet.cashedOut.toFixed(2)}x</span>
              <span className="text-[10px] font-medium opacity-70 mt-0.5 normal-case">
                +{fmt(bet.betAmount * bet.cashedOut - bet.betAmount)} profit
              </span>
            </motion.div>
          )}

          {phase === "flying" && !bet.isBetPlaced && (
            <div
              key={`${ocidPrefix}-flying-idle`}
              className="w-full h-12 rounded-xl bg-[#070D1B] border border-[#1e2e48] text-[#9AA7BD] flex items-center justify-center text-xs font-semibold uppercase tracking-wider"
              data-ocid={`${ocidPrefix}.loading_state`}
            >
              Round in progress…
            </div>
          )}

          {phase === "crashed" && (
            <div
              key={`${ocidPrefix}-crashed`}
              className="w-full h-12 rounded-xl bg-[#FF3B3B]/10 border border-[#FF3B3B]/25 text-[#FF6666] flex items-center justify-center text-xs font-bold uppercase tracking-wider"
              data-ocid={`${ocidPrefix}.error_state`}
            >
              {bet.isBetPlaced && bet.cashedOut === null
                ? `Lost ${fmt(bet.betAmount)}`
                : bet.cashedOut !== null
                  ? `Won @ ${bet.cashedOut.toFixed(2)}x`
                  : `Crashed @ ${crashedAt.toFixed(2)}x`}
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#E8EEF9] flex flex-col">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-[#1d2d47] bg-[#060B18]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <path d="M28,16 L8,6 L11,16 L8,26 Z" fill="#FF3B3B" />
              <path d="M11,15 L3,10 L3,16 Z" fill="#CC2222" />
              <path d="M11,17 L3,22 L3,16 Z" fill="#CC2222" />
              <path d="M11,15 L5,13 L5,17 Z" fill="#AA1111" />
            </svg>
            <span className="text-xl font-black tracking-widest text-white uppercase">
              Aviator
            </span>
            <span className="hidden sm:inline-block text-[10px] text-[#9DFF3A] border border-[#9DFF3A]/30 rounded px-1.5 py-0.5 font-bold tracking-wider">
              CRASH
            </span>
          </div>

          <div className="flex items-center gap-3">
            {balance < 10 && (
              <button
                type="button"
                onClick={resetBalance}
                className="text-xs text-amber-400 border border-amber-400/30 hover:border-amber-400/60 rounded-lg px-3 py-1.5 transition-colors"
                data-ocid="nav.button"
              >
                Refill 1000
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setWalletTab("deposit");
                setWalletMsg(null);
                setWalletAmount("");
                setShowWalletModal(true);
              }}
              className="text-xs text-[#9DFF3A] border border-[#9DFF3A]/40 hover:border-[#9DFF3A]/80 hover:bg-[#9DFF3A]/10 rounded-lg px-3 py-1.5 transition-colors font-semibold"
              data-ocid="nav.deposit"
            >
              + Deposit
            </button>
            <button
              type="button"
              onClick={() => {
                setWalletTab("withdraw");
                setWalletMsg(null);
                setWalletAmount("");
                setShowWalletModal(true);
              }}
              className="text-xs text-red-400 border border-red-400/40 hover:border-red-400/80 hover:bg-red-400/10 rounded-lg px-3 py-1.5 transition-colors font-semibold"
              data-ocid="nav.withdraw"
            >
              Withdraw
            </button>
            <div className="flex items-center gap-2 bg-[#111A2B] border border-[#24314A] rounded-xl px-4 py-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#9DFF3A"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 7.5L6.5 9L9 5.5"
                  stroke="#9DFF3A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xs text-[#9AA7BD] uppercase tracking-wide font-semibold">
                Balance
              </span>
              <span className="font-black text-[#9DFF3A] font-mono text-sm">
                {fmt(balance)}
              </span>
              <span className="text-[10px] text-[#9AA7BD] uppercase tracking-wide">
                CR
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Wallet Modal ── */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <dialog
            open
            aria-modal="true"
            className="bg-[#0d1526] border border-[#24314A] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">ওয়ালেট</h2>
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="text-[#9AA7BD] hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => {
                  setWalletTab("deposit");
                  setWalletMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${walletTab === "deposit" ? "bg-[#9DFF3A] text-black" : "bg-[#111A2B] text-[#9AA7BD] hover:text-white"}`}
              >
                💰 Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletTab("withdraw");
                  setWalletMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${walletTab === "withdraw" ? "bg-red-500 text-white" : "bg-[#111A2B] text-[#9AA7BD] hover:text-white"}`}
              >
                💸 Withdraw
              </button>
            </div>
            <div className="mb-3">
              <p className="text-[#9AA7BD] text-xs mb-1">বর্তমান ব্যালেন্স</p>
              <p className="text-[#9DFF3A] font-black text-2xl font-mono">
                {fmt(balance)}{" "}
                <span className="text-sm font-normal text-[#9AA7BD]">CR</span>
              </p>
            </div>
            <div className="mb-3">
              <label
                htmlFor="wallet-amount-input"
                className="text-[#9AA7BD] text-xs mb-1 block"
              >
                {walletTab === "deposit" ? "জমার পরিমাণ" : "উত্তোলনের পরিমাণ"} (CR)
              </label>
              <input
                type="number"
                min="1"
                value={walletAmount}
                onChange={(e) => {
                  setWalletAmount(e.target.value);
                  setWalletMsg(null);
                }}
                id="wallet-amount-input"
                className="w-full bg-[#111A2B] border border-[#24314A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#9DFF3A]/50"
                placeholder="পরিমাণ লিখুন..."
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {[100, 250, 500, 1000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setWalletAmount(String(q));
                    setWalletMsg(null);
                  }}
                  className="flex-1 bg-[#111A2B] border border-[#24314A] hover:border-[#9DFF3A]/40 text-white text-xs rounded-lg py-1.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            {walletMsg && (
              <p
                className={`text-xs mb-3 text-center font-semibold ${walletMsg.type === "ok" ? "text-[#9DFF3A]" : "text-red-400"}`}
              >
                {walletMsg.text}
              </p>
            )}
            <button
              type="button"
              onClick={handleWalletSubmit}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${walletTab === "deposit" ? "bg-[#9DFF3A] text-black hover:bg-[#b5ff6e]" : "bg-red-500 text-white hover:bg-red-400"}`}
            >
              {walletTab === "deposit" ? "জমা করুন" : "উত্তোলন করুন"}
            </button>
          </dialog>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-4">
        {/* ── Game Card ── */}
        <div className="rounded-2xl border border-[#1e2e48] bg-[#0d1526] overflow-hidden">
          {/* Crash History Bar */}
          <div className="border-b border-[#1e2e48] px-4 py-2.5 bg-[#0a1020]">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#9AA7BD] uppercase tracking-widest font-bold shrink-0">
                HISTORY
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
                {crashHistory.length === 0 ? (
                  <span className="text-xs text-[#9AA7BD] italic">
                    No rounds yet
                  </span>
                ) : (
                  crashHistory.slice(0, 20).map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.7, x: -8 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <CrashPill value={entry.value} />
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SVG Game Canvas */}
          <div
            className="relative bg-[#070D1B] overflow-hidden"
            style={{ aspectRatio: "800/420" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  phase === "crashed"
                    ? "radial-gradient(ellipse 50% 40% at 50% 60%, rgba(255,59,59,0.06) 0%, transparent 70%)"
                    : "radial-gradient(ellipse 60% 50% at 30% 70%, rgba(157,255,58,0.04) 0%, transparent 70%)",
              }}
            />

            <svg
              viewBox="0 0 800 420"
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id="planeGlow"
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="trailGlow"
                  x="-10%"
                  y="-100%"
                  width="120%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient
                  id="trailGrad"
                  gradientUnits="userSpaceOnUse"
                  x1={P0.x}
                  y1={P0.y}
                  x2={planePos.x}
                  y2={planePos.y}
                >
                  <stop offset="0%" stopColor="#FF3B3B" stopOpacity="0.05" />
                  <stop offset="60%" stopColor="#FF3B3B" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#FF6644" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((v) => (
                <line
                  key={`h${v}`}
                  x1="0"
                  y1={v * 420}
                  x2="800"
                  y2={v * 420}
                  stroke="#1a2840"
                  strokeWidth="0.5"
                  strokeDasharray="6,10"
                />
              ))}
              {[0.2, 0.4, 0.6, 0.8].map((v) => (
                <line
                  key={`v${v}`}
                  x1={v * 800}
                  y1="0"
                  x2={v * 800}
                  y2="420"
                  stroke="#1a2840"
                  strokeWidth="0.5"
                  strokeDasharray="6,10"
                />
              ))}

              {(phase === "flying" || phase === "crashed") && planeT > 0.01 && (
                <>
                  <path
                    d={trailPath}
                    stroke="#FF3B3B"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.15"
                    filter="url(#trailGlow)"
                  />
                  <path
                    d={trailPath}
                    stroke="url(#trailGrad)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={trailPath}
                    stroke="#FF8866"
                    strokeWidth="0.8"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </>
              )}

              {(phase === "flying" || phase === "crashed") && (
                <g filter="url(#planeGlow)">
                  <Plane
                    x={planePos.x}
                    y={planePos.y}
                    angle={planeAngle}
                    shaking={shaking}
                    visible={
                      phase === "flying" || (phase === "crashed" && shaking)
                    }
                  />
                </g>
              )}
            </svg>

            {/* Multiplier Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <AnimatePresence mode="wait">
                {phase === "waiting" && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    <div className="text-[#9AA7BD] text-xs uppercase tracking-[0.3em] mb-3 font-semibold">
                      Next round in
                    </div>
                    <div
                      className="font-black text-white font-mono leading-none countdown-pulse"
                      style={{
                        fontSize: "clamp(64px,10vw,96px)",
                        textShadow: "0 0 30px rgba(255,255,255,0.2)",
                      }}
                    >
                      {countdown}
                    </div>
                    <div className="mt-4 text-sm">
                      {bet1.isBetPlaced || bet2.isBetPlaced ? (
                        <span className="text-[#9DFF3A] font-semibold flex items-center gap-1.5 justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="7"
                              cy="7"
                              r="6"
                              stroke="#9DFF3A"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M4.5 7L6 8.5L9.5 5"
                              stroke="#9DFF3A"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          {bet1.isBetPlaced && bet2.isBetPlaced
                            ? `Both bets placed · ${fmt(bet1.betAmount + bet2.betAmount)}`
                            : bet1.isBetPlaced
                              ? `Bet 1 placed · ${fmt(bet1.betAmount)}`
                              : `Bet 2 placed · ${fmt(bet2.betAmount)}`}
                        </span>
                      ) : (
                        <span className="text-[#9AA7BD]">
                          Place your bets below
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {phase === "flying" && (
                  <motion.div
                    key="flying"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    <div
                      className={cn(
                        "font-black font-mono leading-none",
                        multGlowClass,
                      )}
                      style={{
                        fontSize: "clamp(60px,12vw,100px)",
                        color: multColor,
                        transition: "color 0.3s",
                      }}
                    >
                      {multiplier.toFixed(2)}x
                    </div>
                    {/* Show cashout badges */}
                    <div className="flex flex-col items-center gap-1 mt-2">
                      {bet1.cashedOut !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="inline-flex items-center gap-2 bg-[#9DFF3A]/15 border border-[#9DFF3A]/30 rounded-full px-3 py-1"
                        >
                          <span className="text-[#9DFF3A] font-bold text-xs">
                            Bet 1 @ {bet1.cashedOut.toFixed(2)}x · +
                            {fmt(
                              bet1.betAmount * bet1.cashedOut - bet1.betAmount,
                            )}
                          </span>
                        </motion.div>
                      )}
                      {bet2.cashedOut !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="inline-flex items-center gap-2 bg-[#9DFF3A]/15 border border-[#9DFF3A]/30 rounded-full px-3 py-1"
                        >
                          <span className="text-[#9DFF3A] font-bold text-xs">
                            Bet 2 @ {bet2.cashedOut.toFixed(2)}x · +
                            {fmt(
                              bet2.betAmount * bet2.cashedOut - bet2.betAmount,
                            )}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {phase === "crashed" && (
                  <motion.div
                    key="crashed"
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="text-center"
                  >
                    <div className="text-[#FF3B3B] text-xs uppercase tracking-[0.4em] mb-2 font-bold">
                      CRASHED AT
                    </div>
                    <div
                      className="font-black font-mono leading-none glow-red"
                      style={{
                        fontSize: "clamp(56px,11vw,88px)",
                        color: "#FF3B3B",
                      }}
                    >
                      {crashedAt.toFixed(2)}x
                    </div>
                    {((bet1.isBetPlaced && bet1.cashedOut === null) ||
                      (bet2.isBetPlaced && bet2.cashedOut === null)) && (
                      <div className="mt-3 text-[#FF7777] text-sm font-semibold">
                        Lost{" "}
                        {fmt(
                          (bet1.isBetPlaced && bet1.cashedOut === null
                            ? bet1.betAmount
                            : 0) +
                            (bet2.isBetPlaced && bet2.cashedOut === null
                              ? bet2.betAmount
                              : 0),
                        )}{" "}
                        credits
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Dual Bet Controls ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <BetPanel slot={1} />
          <BetPanel slot={2} />
        </div>

        {/* ── Bet History ── */}
        <div className="rounded-2xl border border-[#1e2e48] bg-[#0d1526] overflow-hidden">
          <div className="border-b border-[#1e2e48] px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#9AA7BD] font-bold">
              MY BETS
            </h3>
            {myBets.length > 0 && (
              <span className="text-xs text-[#9AA7BD] font-mono">
                {myBets.length} bet{myBets.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {myBets.length === 0 ? (
            <div
              className="py-14 text-center text-[#9AA7BD] text-sm"
              data-ocid="bets.empty_state"
            >
              <div className="text-3xl mb-3 opacity-30">✈</div>
              No bets yet. Place a bet to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-[#1e2e48] hover:bg-transparent">
                    <TableHead className="text-[#9AA7BD] text-[10px] uppercase tracking-widest font-bold pl-5">
                      Slot
                    </TableHead>
                    <TableHead className="text-[#9AA7BD] text-[10px] uppercase tracking-widest font-bold">
                      Bet
                    </TableHead>
                    <TableHead className="text-[#9AA7BD] text-[10px] uppercase tracking-widest font-bold">
                      Cash Out
                    </TableHead>
                    <TableHead className="text-[#9AA7BD] text-[10px] uppercase tracking-widest font-bold text-right pr-5">
                      Profit / Loss
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBets.map((bet, i) => (
                    <TableRow
                      key={bet.id}
                      className="border-b-[#1a2840] hover:bg-[#0a1220] transition-colors"
                      data-ocid={`bets.item.${i + 1}`}
                    >
                      <TableCell className="pl-5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-14 h-5 rounded-full text-[9px] font-black uppercase tracking-wide",
                            bet.slot === 1
                              ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                              : "bg-[#9DFF3A]/15 text-[#9DFF3A] border border-[#9DFF3A]/30",
                          )}
                        >
                          Bet {bet.slot}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-[#E8EEF9] text-sm">
                        {fmt(bet.betAmount)}
                      </TableCell>
                      <TableCell>
                        {bet.cashoutAt != null ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono">
                            {bet.cashoutAt.toFixed(2)}x
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">
                            BUST
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono font-black text-sm pr-5",
                          bet.profit > 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {bet.profit > 0 ? "+" : ""}
                        {fmt(bet.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1e2e48] mt-6 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-xs text-[#9AA7BD]">
            <span>ABOUT AVIATOR</span>
            <span className="w-px h-3 bg-[#24314A]" />
            <span>RESPONSIBLE GAMING</span>
            <span className="w-px h-3 bg-[#24314A]" />
            <span>TERMS &amp; CONDITIONS</span>
          </div>
          <p className="text-xs text-[#9AA7BD]/60">
            This is a virtual game with no real money. For entertainment
            purposes only.
          </p>
          <p className="text-xs text-[#9AA7BD]/50">
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-red-400">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9DFF3A]/70 hover:text-[#9DFF3A] transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [showGame, setShowGame] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!showGame ? (
        <HomePage key="home" onEnter={() => setShowGame(true)} />
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AviatorGame />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
