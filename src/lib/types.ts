export type Question = {
  category: string;
  difficulty: string;
  text: string;
  options: string[];
  answer: number;
  image: string | null;
};

export type Profile = {
  id: string;
  phone: string | null;
  username: string | null;
  name: string;
  balance: number;
  premium: boolean;
  premium_since: string | null;
};

/** A question paired with the category it was drawn from. */
export type QuizItem = {
  categoryId: string;
  categoryName: string;
  question: Question;
};

/** A round of questions played together and paid out as one batch. */
export type Round = {
  items: QuizItem[];
};

export type QuizSummary = {
  score: number;
  total: number;
  earned: number;
  balance: number;
  categories: string[];
  guest: boolean;
};
