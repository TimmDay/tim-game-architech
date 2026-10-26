/**
 * The ranks, lowest first: edit titles, quips and thresholds here.
 *
 * A rank is reached once every requirement it lists is met. Early ranks need
 * points and stars; the top ones need a share of the whole game (`done`, 0
 * to 1, from `completion` in ./achievements). The quip shows beside the
 * title in the trophy room.
 */
export type Rank = {
  title: string
  quip: string
  points?: number
  stars?: number
  done?: number
}

export const RANKS: Rank[] = [
  { title: "Game Modder", quip: "insert quip here" },
  { title: "The Spreadsheet Guy", quip: "insert quip here", points: 25 },
  { title: "Student", quip: "insert quip here", points: 75, stars: 2 },
  { title: "Intern", quip: "insert quip here", points: 150, stars: 5 },
  {
    title: "Junior Engineer",
    quip: "insert quip here",
    points: 300,
    stars: 12,
  },
  { title: "Engineer", quip: "insert quip here", points: 550, stars: 24 },
  {
    title: "Senior Engineer",
    quip: "insert quip here",
    points: 900,
    stars: 40,
  },
  {
    title: "Staff Engineer",
    quip: "insert quip here",
    points: 1300,
    stars: 56,
  },
  {
    title: "Principal Engineer",
    quip: "insert quip here",
    points: 1800,
    stars: 72,
  },
  {
    title: "Distinguished Architect",
    quip: "insert quip here",
    points: 2400,
    stars: 88,
  },
  { title: "Chaos Monkey Tamer", quip: "insert quip here", done: 0.7 },
  { title: "Keeper of the Five Nines", quip: "insert quip here", done: 0.8 },
  { title: "Linus Torvalds", quip: "insert quip here", done: 0.9 },
  { title: "Claude Shannon", quip: "insert quip here", done: 0.98 },
]
