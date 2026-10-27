// Demo content for the prototype. Edit freely — nothing here is real data.
window.SEED = {
  user: null,
  twinName: "Claims Batch System",
  sources: [],
  // Knowledge points on the Brain Graph (Desktop - 1 / Desktop - 3).
  // x/y are positions on a 1440 x 1024 canvas, matching the Figma frame.
  points: [
    { id: "p1", label: "Nightly batch cycle", x: 220, y: 300, status: "complete", links: ["p2", "p5"],
      body: "CLMPROC kicks off at 01:00 after the ledger close. Three steps: extract, rate, post. If extract runs past 02:30, hold the rate step — it reads a half-written file.",
      sources: ["system_diagram.pdf"] },
    { id: "p2", label: "JCL restart procedure", x: 400, y: 190, status: "incomplete", links: ["p3"],
      body: "Restart from STEP030, never from the top. Delete the GDG generation created by the failed run first.",
      missing: "Which datasets have to be cleaned up before a restart? The runbook lists two; the job references four.",
      sources: ["runbook_2019.docx"] },
    { id: "p3", label: "Abend S0C7 debugging", x: 560, y: 330, status: "incomplete", links: ["p4", "p6"],
      body: "Nine times out of ten it's a packed-decimal field with spaces from the upstream feed.",
      missing: "How do you find which record caused it? Describe the steps you take in the dump.",
      sources: ["CLMPROC.cbl"] },
    { id: "p4", label: "Copybook conventions", x: 760, y: 250, status: "complete", links: ["p7"],
      body: "Every field prefixed by its record type (CL-, PY-, RT-). Never REDEFINE a COMP-3 field — the 1998 incident.",
      sources: ["CLMPROC.cbl", "system_diagram.pdf"] },
    { id: "p5", label: "Month-end edge cases", x: 300, y: 520, status: "incomplete", links: ["p6"],
      body: "Month-end runs the rate step twice: once for regular claims, once for backdated ones.",
      missing: "What happens when month-end falls on a Sunday? The schedule and your interview disagree.",
      inconsistent: true,
      sources: ["interview_0921.m4a"] },
    { id: "p6", label: "DB2 lock timeouts", x: 600, y: 560, status: "complete", links: ["p8"],
      body: "-911 during posting means the online region is still up. Check CICS first, then rerun POST only.",
      sources: ["runbook_2019.docx"] },
    { id: "p7", label: "Legacy rate tables", x: 980, y: 380, status: "incomplete", links: ["p9"],
      body: "Rate tables before 2004 use a different rounding rule.",
      missing: "Which rounding rule, and where is it implemented?",
      sources: [] },
    { id: "p8", label: "Who to call", x: 840, y: 640, status: "complete", links: [],
      body: "Storage: Dana (ext. 4410). Scheduler: ops on-call. Anything touching rates: finance, not IT.",
      sources: ["interview_0921.m4a"] },
    { id: "p9", label: "Why CLMPROC runs twice", x: 1150, y: 560, status: "incomplete", links: [],
      body: "",
      missing: "Nobody else knows this one. Tell the story in your own words — sketch it if it's easier.",
      sources: [] },
    { id: "p10", label: "Release checklist", x: 1180, y: 250, status: "complete", links: ["p7"],
      body: "Freeze Thursday, promote Friday 18:00, never on month-end week.",
      sources: ["runbook_2019.docx"] }
  ],
  starterSources: [
    { name: "system_diagram.pdf", kind: "Document" },
    { name: "runbook_2019.docx", kind: "Document" },
    { name: "CLMPROC.cbl", kind: "Code" },
    { name: "interview_0921.m4a", kind: "Recording" }
  ],
  // Final validation: the agent and the expert answer the same question.
  testQuestion: "The nightly run abended with S0C7 in the rate step. What do you do first?",
  agentAnswer: "Check the upstream feed for spaces in packed-decimal fields — that's the cause about 90% of the time. Don't restart from the top: delete the failed GDG generation and restart from STEP030. If it's month-end, confirm which of the two rate passes failed before rerunning.",
  // Canned answers for "Enter to Use / Test".
  chat: [
    { match: ["s0c7", "abend", "decimal"], answer: "Most S0C7s here come from spaces in a packed-decimal field sent by the upstream feed. Find the failing record in the dump, then restart from STEP030 — not from the top.", cites: ["CLMPROC.cbl", "Abend S0C7 debugging"] },
    { match: ["restart", "jcl", "rerun"], answer: "Restart from STEP030. Delete the GDG generation the failed run created first, otherwise the rate step reads stale data.", cites: ["runbook_2019.docx", "JCL restart procedure"] },
    { match: ["month", "sunday", "end"], answer: "Month-end runs the rate step twice — regular claims, then backdated ones. Robert flagged that the Sunday case is still unresolved, so check with ops before acting.", cites: ["interview_0921.m4a", "Month-end edge cases"], caveat: true },
    { match: ["call", "who", "contact", "help"], answer: "Storage issues: Dana (ext. 4410). Scheduling: ops on-call. Anything touching rates goes to finance, not IT.", cites: ["interview_0921.m4a", "Who to call"] },
    { match: ["lock", "911", "db2"], answer: "A -911 during posting usually means the online region is still up. Check CICS first, then rerun only the POST step.", cites: ["runbook_2019.docx", "DB2 lock timeouts"] }
  ]
};
