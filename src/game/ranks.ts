/**
 * The ranks, lowest first: edit titles, quips and thresholds here.
 *
 * Thresholds are shares of the whole game, from 0 to 1, so they scale as
 * content is added: `points` is the share of one-time points (levels, cards
 * and achievements; not Retain or Survival, which pay forever) and `stars`
 * the share of every star there is. A rank needs both. Each rank should ask
 * for at least as much as the one before. Ranks are never lost once
 * reached, so new content can't demote anyone.
 *
 * The quip shows beside the title in the trophy room.
 */
export type Rank = {
  title: string
  quip: string
  points?: number
  stars?: number
}

export const RANKS: Rank[] = [
  { title: "Game Modder", quip: "The roblox are mined and crafted" },
  {
    title: "The Spreadsheet Guy",
    quip: "Pivoting tables and smoking macros",
    points: 0.005,
  },
  {
    title: "Student Intern",
    quip: "omg I might actually get a job",
    points: 0.015,
    stars: 0.015,
  },
  {
    title: "Slopapotamus",
    quip: "Work pays the tokens, I make the memes",
    points: 0.03,
    stars: 0.04,
  },
  {
    title: "Junior Engineer",
    quip: "Do I even exist?",
    points: 0.07,
    stars: 0.09,
  },
  {
    title: "Engineer",
    quip: "I've caused my first production incident",
    points: 0.12,
    stars: 0.18,
  },
  {
    title: "Senior Engineer",
    quip: "ASi Señor, LGTM",
    points: 0.2,
    stars: 0.3,
  },
  {
    title: "Forward Deployed Engineer",
    quip: "AI took your job so you've pivoted to glorified consultant",
    points: 0.28,
    stars: 0.42,
  },
  {
    title: "Principal Engineer",
    quip: "You're back baby!",
    points: 0.38,
    stars: 0.55,
  },
  {
    title: "Distinguished Architect",
    quip: "Of lego. That's how much spare time you have after 10x'ing everything",
    points: 0.5,
    stars: 0.65,
  },
  {
    title: "A Token",
    quip: "You bow before the models. You are one with the models",
    points: 0.6,
    stars: 0.72,
  },
  {
    title: "Keeper of the Chaos Monkey",
    quip: "They call you Chaos Gorilla",
    points: 0.7,
    stars: 0.8,
  },
  {
    title: "Finder of the Five Nines",
    quip: "insert quip here",
    points: 0.8,
    stars: 0.87,
  },
  {
    title: "Linus Torvalds",
    quip: "insert quip here",
    points: 0.9,
    stars: 0.93,
  },
  {
    title: "Claude Shannon",
    quip: "insert quip here",
    points: 0.98,
    stars: 0.98,
  },
]
