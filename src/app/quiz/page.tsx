"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { AnswerTile, type AnswerState } from "@/components/AnswerTile";
import { GradientButton } from "@/components/GradientButton";
import { QuestionCard } from "@/components/QuestionCard";
import { RoundProgress } from "@/components/RoundProgress";
import {
  categoryIcon,
  categoryName,
  categoryThemeOf,
} from "@/lib/categories";
import {
  calculateEarnings,
  kshPerCorrect,
  questionsPerSection,
  secondsPerQuestion,
} from "@/lib/config";
import { getAnsweredToday, recordAnswer } from "@/lib/daily";
import { randomQuestions } from "@/lib/material";
import { playCorrect, playWrong } from "@/lib/sound";
import { supabase } from "@/lib/supabase";
import type { QuizItem, QuizSummary, Round } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const LETTERS = ["A", "B", "C", "D"];

type Phase =
  | "preparing"
  | "blocked"
  | "empty"
  | "playing"
  | "roundBreak"
  | "reviewPrompt"
  | "done";

function chunk(items: QuizItem[], size: number): Round[] {
  const rounds: Round[] = [];
  for (let i = 0; i < items.length; i += size) {
    rounds.push({ items: items.slice(i, i + size) });
  }
  return rounds;
}

export default function QuizPage() {
  const router = useRouter();
  const { isLoggedIn, isPremium, profile, balance, dailyLimit, addEarnings } =
    useAuth();

  const [phase, setPhase] = useState<Phase>("preparing");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inReview, setInReview] = useState(false);
  const [total, setTotal] = useState(0);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundEarnings, setRoundEarnings] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState<QuizItem[]>([]);
  const [answeredToday, setAnsweredToday] = useState(0);

  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(secondsPerQuestion);

  const scoreRef = useRef(0);
  const roundScoreRef = useRef(0);
  const totalEarnedRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const passMissRef = useRef<Map<string, QuizItem>>(new Map());

  const round = rounds[roundIndex];
  const item = round?.items[questionIndex];
  const theme = categoryThemeOf(item?.categoryId ?? "geography");

  // ---- Prepare the quiz -------------------------------------------------
  useEffect(() => {
    const raw = sessionStorage.getItem("tpweb_selected");
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (ids.length === 0) {
      router.replace("/");
      return;
    }
    setCategoryIds(ids);

    void (async () => {
      const gate = isLoggedIn && !isPremium && !!profile;
      let allowed = Number.MAX_SAFE_INTEGER;

      if (gate) {
        const answered = await getAnsweredToday(profile.id);
        setAnsweredToday(answered);
        allowed = (dailyLimit ?? 70) - answered;
        if (allowed <= 0) {
          setPhase("blocked");
          return;
        }
      }

      const items: QuizItem[] = [];
      for (const id of ids) {
        if (items.length >= allowed) break;
        const questions = randomQuestions(id, questionsPerSection);
        for (const question of questions) {
          if (items.length >= allowed) break;
          items.push({
            categoryId: id,
            categoryName: categoryName(id),
            question,
          });
        }
      }

      if (items.length === 0) {
        setPhase("empty");
        return;
      }

      setRounds(chunk(items, questionsPerSection));
      setTotal(items.length);
      setPhase("playing");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Answer handling --------------------------------------------------
  const commitAnswer = useCallback(
    (option: number) => {
      if (!item || answered) return;
      const correct = option === item.question.answer;

      setAnswered(true);
      setSelectedOption(option >= 0 ? option : null);

      if (correct) {
        scoreRef.current += 1;
        roundScoreRef.current += 1;
        streakRef.current += 1;
        bestStreakRef.current = Math.max(
          bestStreakRef.current,
          streakRef.current,
        );
        playCorrect();
      } else {
        streakRef.current = 0;
        passMissRef.current.set(
          `${item.categoryId}|${item.question.text}`,
          item,
        );
        playWrong();
      }

      setScore(scoreRef.current);
      setRoundScore(roundScoreRef.current);
      setStreak(streakRef.current);

      // Count every first-pass question against the daily allowance.
      if (!inReview && isLoggedIn && !isPremium && profile) {
        void recordAnswer(profile.id).then(setAnsweredToday);
      }
    },
    [item, answered, inReview, isLoggedIn, isPremium, profile],
  );

  // ---- Timer ------------------------------------------------------------
  // A single interval per question. The countdown lives in the effect closure
  // so a brand-new question can never inherit the previous 0-second state.
  const commitAnswerRef = useRef(commitAnswer);
  useEffect(() => {
    commitAnswerRef.current = commitAnswer;
  }, [commitAnswer]);

  useEffect(() => {
    if (phase !== "playing" || answered) return;
    let seconds = secondsPerQuestion;
    setRemaining(seconds);
    const timer = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        setRemaining(0);
        clearInterval(timer);
        commitAnswerRef.current(-1); // time's up counts as a wrong answer
        return;
      }
      setRemaining(seconds);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, answered, roundIndex, questionIndex]);

  // ---- Payout / flow ----------------------------------------------------
  const payoutRound = useCallback(async () => {
    const earned =
      !inReview && isLoggedIn ? calculateEarnings(roundScoreRef.current) : 0;
    if (earned > 0 && profile) {
      await addEarnings(earned);
      const firstCategory = round?.items[0]?.categoryId ?? categoryIds[0];
      void supabase.from("quiz_rounds").insert({
        user_id: profile.id,
        category_id: firstCategory,
        score: roundScoreRef.current,
        total: round?.items.length ?? 0,
        earned,
      });
    }
    totalEarnedRef.current += earned;
    setRoundEarnings(earned);
  }, [inReview, isLoggedIn, profile, addEarnings, round, categoryIds]);

  /** Writes the summary and moves to the results screen. */
  const goToResults = useCallback(() => {
    const summary: QuizSummary = {
      score: scoreRef.current,
      total,
      earned: totalEarnedRef.current,
      balance,
      categories: categoryIds,
      guest: !isLoggedIn,
    };
    sessionStorage.setItem("tpweb_summary", JSON.stringify(summary));
    router.push("/results");
  }, [total, balance, categoryIds, isLoggedIn, router]);

  /**
   * End of a pass: collect this pass's misses (and clear the map so the next
   * pass starts clean), then either offer a review or finish. "Skip" calls
   * [goToResults] directly, so it always leaves the prompt.
   */
  const finish = useCallback(() => {
    const misses = Array.from(passMissRef.current.values());
    passMissRef.current.clear();
    if (misses.length > 0) {
      setMissed(misses);
      setPhase("reviewPrompt");
      return;
    }
    goToResults();
  }, [goToResults]);

  const next = useCallback(async () => {
    if (!round) return;
    const isLastInRound = questionIndex === round.items.length - 1;

    if (!isLastInRound) {
      setAnswered(false);
      setSelectedOption(null);
      setQuestionIndex((i) => i + 1);
      return;
    }

    await payoutRound();

    if (roundIndex === rounds.length - 1) {
      finish();
      return;
    }

    setRoundScores((s) => [...s, roundScoreRef.current]);
    setPhase("roundBreak");
    setAnswered(false);
    setSelectedOption(null);
  }, [round, questionIndex, roundIndex, rounds.length, payoutRound, finish]);

  const continueRound = useCallback(() => {
    roundScoreRef.current = 0;
    setRoundScore(0);
    setRoundEarnings(0);
    setRoundIndex((i) => i + 1);
    setQuestionIndex(0);
    setAnswered(false);
    setSelectedOption(null);
    setPhase("playing");
  }, []);

  const startReview = useCallback(() => {
    const items = [...missed];
    passMissRef.current.clear();
    setMissed([]);
    roundScoreRef.current = 0;
    streakRef.current = 0;
    setRoundScore(0);
    setRoundEarnings(0);
    setRoundScores([]);
    setStreak(0);
    setRounds(chunk(items, questionsPerSection));
    setRoundIndex(0);
    setQuestionIndex(0);
    setInReview(true);
    setAnswered(false);
    setSelectedOption(null);
    setPhase("playing");
  }, [missed]);

  // ---- Derived UI -------------------------------------------------------
  const answerState = useMemo(() => {
    if (!item) return () => "idle" as AnswerState;
    return (index: number): AnswerState => {
      if (!answered) return "idle";
      if (index === item.question.answer) return "correct";
      if (index === selectedOption) return "wrong";
      return "muted";
    };
  }, [item, answered, selectedOption]);

  const timedOut = remaining <= 5 && !answered;
  const wasCorrect =
    answered && item ? selectedOption === item.question.answer : false;

  if (phase === "preparing") {
    return (
      <div className="gradient-brand flex min-h-screen flex-col items-center justify-center gap-4 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        <p className="font-semibold">Loading your questions…</p>
      </div>
    );
  }

  if (phase === "blocked") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl">⏰</span>
        <h1 className="text-2xl font-extrabold text-slate-900">
          You&apos;ve done your {dailyLimit ?? 70} for today!
        </h1>
        <p className="text-sm text-slate-500">
          Nice work — you&apos;ve answered every question for today. Your
          allowance resets at midnight, so come back tomorrow to keep earning.
        </p>
        <div className="rounded-2xl bg-slate-100 px-5 py-3 font-extrabold">
          Wallet: KSh {balance.toFixed(2)}
        </div>
        <GradientButton onClick={() => router.push("/")}>Back home</GradientButton>
        <button
          type="button"
          onClick={() => router.push("/premium")}
          className="text-sm font-bold text-purple-700"
        >
          Go Premium — unlimited
        </button>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl">📭</span>
        <h1 className="text-xl font-extrabold">No questions available</h1>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load questions for those categories yet. Please try
          again in a moment.
        </p>
        <GradientButton onClick={() => router.push("/")}>Back home</GradientButton>
      </div>
    );
  }

  if (phase === "roundBreak") {
    const completed = roundScores.length;
    const size = round?.items.length ?? 0;
    const accuracy = size === 0 ? 0 : Math.round((roundScore / size) * 100);
    return (
      <div
        className="flex min-h-screen items-center justify-center p-5"
        style={{
          backgroundImage: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        }}
      >
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
          <p className="text-sm font-bold text-slate-500">
            Round {completed} of {rounds.length} complete
          </p>
          <div className="mt-3 text-5xl">🎯</div>
          <p className="mt-1 text-sm text-slate-500">Round score</p>
          <p className="text-4xl font-extrabold text-slate-900">
            {roundScore} / {size}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold">
            <span
              className={`rounded-full px-3 py-1 ${
                accuracy >= 70
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {accuracy}% accuracy
            </span>
            {roundEarnings > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                +KSh {roundEarnings.toFixed(0)} added
              </span>
            )}
          </div>
          <AdBanner unit="medium" className="mt-5" />
          <div className="mt-6">
            <GradientButton onClick={continueRound}>Next round</GradientButton>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reviewPrompt") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900/50 p-5">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="text-4xl">🔁</div>
          <h2 className="mt-2 text-lg font-extrabold">
            {inReview ? "Still a few tricky ones!" : "Review your misses?"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            You missed {missed.length} question
            {missed.length === 1 ? "" : "s"}. Answer {missed.length === 1 ? "it" : "them"}{" "}
            again until {missed.length === 1 ? "it's" : "they're"} all correct —
            or skip for now.
          </p>
          <div className="mt-5 space-y-2">
            <GradientButton onClick={startReview}>Review now</GradientButton>
            <button
              type="button"
              onClick={goToResults}
              className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isLastInRound = questionIndex === round.items.length - 1;
  const nextLabel = isLastInRound
    ? roundIndex === rounds.length - 1
      ? "See results"
      : "Finish round"
    : "Next question";

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white"
            title="Quit round"
          >
            ✕
          </button>
          <div className="flex-1">
            <p className="text-base font-extrabold text-white">
              {item.categoryName}
            </p>
            <p className="text-xs font-semibold text-white/85">
              {inReview ? "Review • " : ""}Round {roundIndex + 1} of{" "}
              {rounds.length}
            </p>
          </div>
          {streak >= 2 && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-sm font-extrabold text-white">
              🔥 {streak}
            </span>
          )}
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold ${
              timedOut ? "bg-red-500 text-white" : "bg-white/20 text-white"
            }`}
          >
            {remaining}
          </span>
        </div>

        <div className="mt-3">
          <RoundProgress
            total={round.items.length}
            answered={questionIndex + (answered ? 1 : 0)}
            label={`Question ${questionIndex + 1} of ${round.items.length}`}
            right={
              inReview
                ? "Review — no payout"
                : isLoggedIn
                  ? isPremium
                    ? "Unlimited today 👑"
                    : `${Math.max(0, (dailyLimit ?? 70) - answeredToday)} left today`
                  : undefined
            }
          />
        </div>

        <AdBanner unit="mobile" className="mt-3" />

        <div className="mt-4 flex-1 overflow-y-auto">
          <QuestionCard
            question={item.question.text}
            image={item.question.image}
            categoryName={item.categoryName}
            icon={categoryIcon(item.categoryId)}
            theme={theme}
            pointsLabel={`+KSh ${kshPerCorrect.toFixed(0)}`}
            showPoints={isLoggedIn}
          />
          <div className="mt-4 space-y-2.5">
            {item.question.options.map((option, i) => (
              <AnswerTile
                key={i}
                letter={LETTERS[i] ?? "?"}
                label={option}
                state={answerState(i)}
                onSelect={answered ? undefined : () => commitAnswer(i)}
                disabled={answered}
              />
            ))}
          </div>

          <AdBanner unit="medium" className="mt-4" />
        </div>

        {answered && (
          <div className="animate-fade-in mt-4 rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{wasCorrect ? "✅" : "❌"}</span>
              <div className="flex-1">
                <p
                  className={`text-base font-extrabold ${
                    wasCorrect ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {wasCorrect
                    ? inReview
                      ? "Sahihi! 🔥"
                      : "Sahihi! Winnings added"
                    : "Not quite"}
                </p>
                <p className="text-xs text-slate-600">
                  {wasCorrect
                    ? !inReview && isLoggedIn
                      ? `+KSh ${kshPerCorrect.toFixed(0)} for this round`
                      : "Keep it up!"
                    : `Answer: ${item.question.options[item.question.answer]}`}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <GradientButton onClick={() => void next()}>
                {nextLabel}
              </GradientButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
