// <Shania Start>
// src/data/shop.js — buyable characters/cosmetics (equipped as your profile avatar).
// "recruit" is free + owned by default. Images reuse the cropped mockup art.
const ITEMS = [
  { key: "recruit", name: "Recruit", price: 0, img: "/img/avatars/recruit.png", desc: "Every patrol starts here." },
  { key: "detective", name: "Detective", price: 300, img: "/img/avatars/detective.png", desc: "A seasoned scam-spotter." },
  { key: "chief", name: "Chief", price: 800, img: "/img/avatars/chief.png", desc: "Top brass — looks the part." },
  { key: "hoot", name: "Inspector Hoot", price: 1000, img: "/img/owl-mentor.png", desc: "Become the mentor himself." },
  { key: "fakebank", name: "Mr. FakeBank", price: 500, img: "/img/villains/fakebank.png", desc: "Wear the villain (for science)." },
  { key: "parcel", name: "Parcel Trickster", price: 500, img: "/img/villains/parcel.png", desc: "Your parcel could not be delivered." },
  { key: "loveliar", name: "Love Liar", price: 600, img: "/img/villains/loveliar.png", desc: "Heartbreaker cosmetic." },
  { key: "crypto", name: "Crypto Conman", price: 700, img: "/img/villains/crypto.png", desc: "To the moon (it's a scam)." },
];

function byKey(k) {
  return ITEMS.find((i) => i.key === k) || null;
}

module.exports = { ITEMS, byKey };
// <Shania End>
