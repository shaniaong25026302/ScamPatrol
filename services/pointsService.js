const users = [
  { id: 1, username: "Liam", points: 120, badges: ["Scam Hunter"] },
  { id: 2, username: "Rebecca", points: 90, badges: ["First Report"] },
  { id: 3, username: "Nivi", points: 70, badges: ["Helpful Commenter"] },
  { id: 4, username: "Shania", points: 50, badges: [] },
  { id: 5, username: "CG", points: 40, badges: [] },
  { id: 6, username: "Shawn", points: 30, badges: [] }
];

function getLeaderboard() {
  return [...users].sort((a, b) => b.points - a.points);
}

module.exports = {
  getLeaderboard
};
