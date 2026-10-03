/// Global TriviaPay configuration — mirrors `lib/config.dart` on mobile.

export const appName = "TriviaPay";

/** Amount earned per correct answer (KSh). */
export const kshPerCorrect = 10;

/** Minimum balance required to request an M-Pesa payout (KSh). */
export const minWithdrawal = 5000;

/** Minimum withdrawal for premium members (KSh). */
export const premiumMinWithdrawal = 100;

/** Premium subscription price (KSh). */
export const premiumPrice = 250;

/** Referral reward for a standard member (KSh). */
export const referralBonus = 200;

/** Referral reward for a premium member (KSh). */
export const referralBonusPremium = 500;

/** Welcome bonus credited on registration (KSh). */
export const signupBonus = 500;

/** One-time bonus for leaving a Play Store review (KSh). */
export const reviewBonus = 100;

/** Questions fetched for a single-category quiz (one full round). */
export const questionsSingleCategory = 10;

/** Questions per round (section). */
export const questionsPerSection = 10;

/** Maximum number of questions a signed-in player may answer per day. */
export const dailyQuestionLimit = 70;

/** Seconds allowed per question. */
export const secondsPerQuestion = 20;

/**
 * How many questions we pull from Supabase per request while loading a
 * category in the background. Small batches keep the progress bar honest and
 * let the first category become playable quickly.
 */
export const questionBatchSize = 10;

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://zhqzztsvetkvqbgnogjl.supabase.co";

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_8OCauT4cR1zH1HK2iX7wtg_dZ0WdyiU";

/** Earnings calculation: every correct answer pays [kshPerCorrect]. */
export const calculateEarnings = (correctAnswers: number): number =>
  correctAnswers * kshPerCorrect;

/** The withdrawal minimum that applies to a given plan. */
export const minWithdrawalFor = (premium: boolean): number =>
  premium ? premiumMinWithdrawal : minWithdrawal;

/** Referral reward that applies to the person who shared their phone number. */
export const referralBonusFor = (premium: boolean): number =>
  premium ? referralBonusPremium : referralBonus;
