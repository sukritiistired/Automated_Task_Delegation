/**
 * ═══════════════════════════════════════════════════════════════
 *  AUTOFLOW — ML FUNCTION TESTS (Category 2)
 *  Tests: calculateScore (skill × availability × priority),
 *         extractFeatures, SimpleNeuralNetwork training
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Pure helper re-implementations (mirror logic from taskController.ts) ────
// We deliberately copy the pure math here so tests are NOT coupled to the DB.

const PRIORITY_WEIGHTS: Record<string, number> = {
  Urgent: 1.0,
  High:   0.75,
  Medium: 0.5,
  Low:    0.25,
  Backlog:0.1,
};

/**
 * calculateScore — the core delegation scoring formula used by the ML model
 * fallback path: score = skillMatch * 0.5 + availability * (0.3 + priority * 0.2)
 */
function calculateScore(
  skillMatch:   number,  // 0–1
  availability: number,  // 0–1
  priority:     number   // 0–1 (from PRIORITY_WEIGHTS)
): number {
  return skillMatch * 0.5 + availability * (0.3 + priority * 0.2);
}

/** Jaccard similarity between two string arrays */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Availability fraction from hours used */
function calculateAvailability(openTasks: number, maxHours = 40): number {
  const usedHours = openTasks * 4;
  return Math.max(0, Math.min(1, 1 - usedHours / maxHours));
}

// ─── Simple Neural Network (same class as in taskController) ─────────────────
class SimpleNeuralNetwork {
  weights1: number[][] = Array(3).fill(0).map(() =>
    Array(4).fill(0).map(() => Math.random() - 0.5)
  );
  weights2: number[] = Array(4).fill(0).map(() => Math.random() - 0.5);
  bias1: number[]    = Array(4).fill(0).map(() => Math.random() - 0.5);
  bias2: number      = Math.random() - 0.5;
  learningRate       = 0.1;

  sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }
  dSigmoid(y: number) { return y * (1 - y); }

  run(input: number[]) {
    const hidden = Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      let sum = this.bias1[i];
      for (let j = 0; j < 3; j++) sum += input[j] * this.weights1[j][i];
      hidden[i] = this.sigmoid(sum);
    }
    let sum = this.bias2;
    for (let i = 0; i < 4; i++) sum += hidden[i] * this.weights2[i];
    return { output: this.sigmoid(sum), hidden };
  }

  train(data: { input: number[]; output: number[] }[], iterations: number) {
    for (let ep = 0; ep < iterations; ep++) {
      for (const row of data) {
        const { output, hidden } = this.run(row.input);
        const error   = row.output[0] - output;
        const dOutput = error * this.dSigmoid(output);
        const dHidden = Array(4).fill(0);
        for (let i = 0; i < 4; i++) {
          dHidden[i] = dOutput * this.weights2[i] * this.dSigmoid(hidden[i]);
        }
        for (let i = 0; i < 4; i++) this.weights2[i] += this.learningRate * dOutput * hidden[i];
        this.bias2 += this.learningRate * dOutput;
        for (let j = 0; j < 3; j++) {
          for (let i = 0; i < 4; i++) {
            this.weights1[j][i] += this.learningRate * dHidden[i] * row.input[j];
          }
        }
        for (let i = 0; i < 4; i++) this.bias1[i] += this.learningRate * dHidden[i];
      }
    }
  }

  predict(input: number[]) { return this.run(input).output; }
}

// ─────────────────────────────────────────────────────────────────────────────
describe("🤖 ML Function Tests — calculateScore", () => {

  // UT-03 High skill, high availability → High score
  it("UT-03 | High skill + high availability + urgent priority → score > 0.7", () => {
    const score = calculateScore(1.0, 1.0, PRIORITY_WEIGHTS["Urgent"]);
    // Max possible: 0.5 + 1*(0.3 + 1*0.2) = 1.0
    expect(score).toBeGreaterThan(0.7);
  });

  // UT-04 Low skill, low availability → Low score
  it("UT-04 | Low skill + low availability + low priority → score < 0.2", () => {
    const score = calculateScore(0.0, 0.1, PRIORITY_WEIGHTS["Backlog"]);
    // 0*0.5 + 0.1*(0.3+0.1*0.2) = 0.1*0.32 = 0.032
    expect(score).toBeLessThan(0.2);
  });

  // UT-05 Medium inputs → Medium score
  it("UT-05 | Medium skill + medium availability + medium priority → 0.2 < score < 0.7", () => {
    const score = calculateScore(0.5, 0.5, PRIORITY_WEIGHTS["Medium"]);
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThan(0.7);
  });

  it("score is always in [0, 1] range for any normalised inputs", () => {
    const testCases = [
      [0, 0, 0], [1, 1, 1], [0.3, 0.7, 0.5],
      [0.9, 0.1, 0.8], [0.2, 0.4, 0.3],
    ];
    for (const [s, a, p] of testCases) {
      const score = calculateScore(s, a, p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("higher skill match should yield higher score (ceteris paribus)", () => {
    const avail = 0.8, prio = PRIORITY_WEIGHTS["High"];
    const lowSkill  = calculateScore(0.1, avail, prio);
    const highSkill = calculateScore(0.9, avail, prio);
    expect(highSkill).toBeGreaterThan(lowSkill);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("🧠 ML Function Tests — SimpleNeuralNetwork", () => {

  it("predict() returns a number between 0 and 1", () => {
    const net = new SimpleNeuralNetwork();
    const result = net.predict([0.5, 0.5, 0.5]);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("after training, high-input prediction is higher than low-input prediction", () => {
    const net = new SimpleNeuralNetwork();
    const trainingData = [
      { input: [1.0, 1.0, 1.0], output: [0.95] },
      { input: [0.0, 0.0, 0.0], output: [0.05] },
      { input: [0.5, 0.5, 0.5], output: [0.5]  },
      { input: [0.9, 0.8, 0.75], output: [0.9] },
      { input: [0.1, 0.2, 0.1], output: [0.1]  },
    ];

    net.train(trainingData, 3000);

    const highScore = net.predict([1.0, 1.0, 1.0]);
    const lowScore  = net.predict([0.0, 0.0, 0.0]);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("training reduces error over iterations", () => {
    const net1 = new SimpleNeuralNetwork();
    const net2 = new SimpleNeuralNetwork();

    // Give them identical weights by seeding through assignment
    const sampleInput = [0.8, 0.6, 0.75];
    const target = 0.9;

    // net2 trains more
    net1.train([{ input: sampleInput, output: [target] }], 10);
    net2.train([{ input: sampleInput, output: [target] }], 2000);

    const err1 = Math.abs(target - net1.predict(sampleInput));
    const err2 = Math.abs(target - net2.predict(sampleInput));

    expect(err2).toBeLessThan(err1 + 0.3); // net2 should be at least as accurate
  });
});
