// <Shania Start>
// src/data/missions.js — curated "Spot the Scam" field missions (no API cost).
// answer: "scam" | "legit". The client never receives `answer` or `why` until it submits.
const MISSIONS = [
  { id: "m1", kind: "SMS", difficulty: "easy", content: "Your parcel could not be delivered. Update your address + pay $1.20 fee: bit.ly/redeliver-now", answer: "scam", why: "Fake delivery + tiny fee to harvest card details. Real couriers don't text shortened links." },
  { id: "m2", kind: "SMS", difficulty: "easy", content: "Hi, it's Mum. I dropped my phone, this is my new number. Can you Whatsapp me?", answer: "scam", why: "Classic 'family in trouble' impersonation that leads to a money request." },
  { id: "m3", kind: "Email", difficulty: "easy", content: "Your Netflix payment failed. Update your billing within 24h or your account will be suspended: netflix-billing.support", answer: "scam", why: "Urgency + lookalike domain (not netflix.com). Phishing for card details." },
  { id: "m4", kind: "Email", difficulty: "medium", content: "Hi team, the Q3 report is attached. Let me know if you need changes before Friday's meeting. — Sarah", answer: "legit", why: "Normal work email, no links, no urgency, no requests for money or credentials." },
  { id: "m5", kind: "Website", difficulty: "medium", content: "https://secure-dbs-login.com asks for your full card number, PIN and OTP to 'verify' your account.", answer: "scam", why: "Banks never ask for PIN/OTP on a web form, and the domain isn't dbs.com.sg." },
  { id: "m6", kind: "SMS", difficulty: "easy", content: "Congratulations! You've won a $1,000 NTUC voucher. Claim now: short.link/claim before it expires!", answer: "scam", why: "Prize you never entered + urgency + shortened link = bait." },
  { id: "m7", kind: "Email", difficulty: "hard", content: "IRAS: You are eligible for a $480 tax rebate. Click to enter your bank details and Singpass to receive it.", answer: "scam", why: "Govt agencies never collect bank/Singpass via emailed links. Impersonation." },
  { id: "m8", kind: "SMS", difficulty: "medium", content: "Your OTP is 482913. Do not share it with anyone. — DBS", answer: "legit", why: "A genuine OTP notice that explicitly tells you NOT to share it and asks for nothing." },
  { id: "m9", kind: "Website", difficulty: "hard", content: "An 'investment coach' guarantees 30% monthly returns in crypto if you deposit via this private link today.", answer: "scam", why: "Guaranteed high returns + urgency + private link = investment scam." },
  { id: "m10", kind: "Email", difficulty: "medium", content: "Your Grab receipt for $14.20 — trip from Tampines to Orchard. Rate your driver in the app.", answer: "legit", why: "A normal receipt, no link asking for credentials or payment." },
  { id: "m11", kind: "SMS", difficulty: "hard", content: "POSB: suspicious login detected. Verify it wasn't you by calling 6555 0000 and confirming your iBanking PIN.", answer: "scam", why: "Banks never ask you to confirm your PIN over the phone. Vishing." },
  { id: "m12", kind: "Email", difficulty: "easy", content: "Your friend tagged you in a photo on Instagram. Open the app to see it.", answer: "legit", why: "Standard social notification with no credential request or odd link." },
  // Call / phone scams
  { id: "c1", kind: "Call", difficulty: "hard", content: "Caller: 'This is the Anti-Scam Centre. Your bank account is linked to crime. Transfer your savings to this safe account for protection.'", answer: "scam", why: "There is no 'safe account' — police/banks never ask you to transfer money to protect it." },
  { id: "c2", kind: "Call", difficulty: "hard", content: "Automated call: 'Your number will be disconnected in 2 hours. Press 1 to speak to an officer about your unpaid fine.'", answer: "scam", why: "Robocall + urgency + 'press 1' to a fake officer = classic government-impersonation scam." },
  { id: "c3", kind: "Call", difficulty: "medium", content: "Caller: 'Hi, this is your condo management — the lift servicing is on Saturday 9am, no action needed.'", answer: "legit", why: "Informational, asks for nothing, no money or credentials requested." },
  { id: "c4", kind: "Call", difficulty: "hard", content: "Caller claims to be Microsoft: 'Your PC has a virus. Install AnyDesk so I can fix it remotely and confirm your card to renew support.'", answer: "scam", why: "Tech-support scam: remote-access app + card details. Microsoft never cold-calls like this." },
  // Boss battle — the toughest, most convincing
  { id: "b1", kind: "Boss", difficulty: "expert", content: "A recruiter on LinkedIn offers a remote job: do simple 'tasks' to boost ratings, earn commission — but first top-up $200 to 'unlock' higher-paying tasks.", answer: "scam", why: "Job/task scam: paying to earn is the red flag; real jobs never ask you to top-up." },
  { id: "b2", kind: "Boss", difficulty: "expert", content: "Your 'friend' on WhatsApp (new number) asks you to help receive a PayNow transfer and forward it on, promising a small cut.", answer: "scam", why: "Money-mule recruitment: forwarding funds for a cut makes you a launderer. Verify the real friend." },
  { id: "b3", kind: "Boss", difficulty: "expert", content: "An official-looking IRAS letter by post asks you to scan a QR code to claim a $700 GST refund and log in with Singpass.", answer: "scam", why: "Quishing: a QR to a fake Singpass login. Agencies don't collect refunds via random QR codes." },
];

function publicMission(m) {
  return { id: m.id, kind: m.kind, difficulty: m.difficulty, content: m.content };
}

function randomMission() {
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
}

function byId(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

function randomByKind(kind) {
  const pool = MISSIONS.filter((m) => m.kind === kind);
  if (!pool.length) return randomMission();
  return pool[Math.floor(Math.random() * pool.length)];
}

const KINDS = ["Email", "SMS", "Website", "Call", "Boss"];

module.exports = { MISSIONS, publicMission, randomMission, randomByKind, byId, KINDS };
// <Shania End>
