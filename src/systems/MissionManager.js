const PHASES = [
  { name: "Liftoff",             alt: 0,     vel: 0,     time: 0 },
  { name: "Max-Q",               alt: 13,    vel: 0.7,   time: 70 },
  { name: "S-IC Separation",     alt: 67,    vel: 2.4,   time: 160 },
  { name: "S-II Separation",     alt: 175,   vel: 6.9,   time: 540 },
  { name: "LEO Insertion",       alt: 190,   vel: 7.8,   time: 700 },
  { name: "TLI Burn",            alt: 190,   vel: 10.8,  time: 900 },
  { name: "Lunar Descent",       alt: 15,    vel: -0.05, time: 11000 },
  { name: "Splashdown",          alt: 0,     vel: -8,    time: 360000 }
];
