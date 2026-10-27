# Hypercubic: How It Works & What Our Project Will Be

*Prepared October 26, 2026 · Project timeline: October 19 – November 2*

---

## Part 1 · How Hypercubic Works

### The company in one line

Hypercubic (YC Fall 2025) builds AI that captures how retiring mainframe experts think, so banks, insurers, airlines and governments can keep maintaining and modernizing COBOL systems after those experts leave.

### Key facts

| | |
| --- | --- |
| **Founders** | Sai Gurrapu (CEO) and Aayush Naik (CTO), former Apple AI/ML engineers |
| **Founded** | 2025, San Francisco; Y Combinator Fall 2025 |
| **Funding** | $5.3M seed (August 2026), led by CIV |
| **Customers** | Fortune 500 companies and governments running mainframes |
| **Why now** | ~70% of the Fortune 500 still run core apps on mainframes; the average COBOL developer was 58 in 2019, with ~10% retiring each year |

### The core insight

The hardest knowledge to replace is not in the code. It is the unwritten "tribal knowledge" in experts' heads: how they debug, which edge cases matter, and which local conventions to follow. Experts often don't realize everything they know, so asking them to write documentation is slow and incomplete.

### The working process (4 products, 4 stages)

```
1. MAP THE CODE        2. CAPTURE THE EXPERT     3. OPERATE              4. MODERNIZE
   HyperDocs      -->     HyperTwin          -->    Hopper          -->     HyperLoop
   (what the code         (why experts do          (AI agent works         (rewrite the code,
    does)                  what they do)            inside the mainframe)   prove it still
                                                                            behaves the same)
```

**Stage 1 · HyperDocs: map the code**
- Reads COBOL, JCL and PL/I codebases.
- Generates auto-updating documentation, architecture diagrams and dependency graphs.
- Result: a living map of the system.

**Stage 2 · HyperTwin: capture the expert** *(most relevant to our project)*
- Observes senior engineers while they work: workflows, screen interactions, and AI-driven interviews.
- Captures not just *what* the expert does, but *why*: how they diagnose problems and choose debugging strategies.
- Builds a "digital twin" of the expert's knowledge that newer engineers can query and get cited answers from.
- Result: expertise stays available after the expert retires.

**Stage 3 · Hopper: operate the mainframe**
- An agentic development environment: a real TN3270 terminal plus an AI agent.
- The agent can navigate ISPF, edit COBOL, submit JCL jobs, read job output and explain failures.

**Stage 4 · HyperLoop: modernize safely**
- Rewrites COBOL applications with AI.
- Uses formal verification to prove the new code behaves the same as the old code. This matters because these systems move money and pay benefits.

### North Star

> No critical mainframe knowledge should walk out the door. Every expert's reasoning is captured once and stays available to whoever maintains the system next, human or AI agent.

*(Check this against your notes from Sai Gurrapu's 10/19 talk.)*

### Main competitors to HyperTwin

| Company | What it does | How it differs |
| --- | --- | --- |
| **Viven** | Digital twin of every employee, trained on email, Slack and docs | Horizontal; no mainframe knowledge |
| **Mechanical Orchard** | AI mainframe modernization with verification | Captures code behavior, not expert reasoning |
| **Tavus** | Lifelike video AI humans | Built for sales, training and healthcare, not engineering knowledge |
| Seldon, Listen Labs | Simulated users / customer twins for research | Simulate user *types*, not specific experts |
| AWS IoT TwinMaker | Digital twins of physical equipment | Twins of machines, not people |

---

## Part 2 · What Our Project Will Be

### The brief

Reimagine what is possible with **synthetic personas and digital twins**, in the context of **knowledge preservation** as a large share of the workforce approaches retirement. Hypercubic's HyperTwin is the reference point and inspiration.

### Key definitions

- **Synthetic persona:** an AI-generated profile that imitates a *type* of user and can be interviewed like a real participant. Useful for early exploration; findings must be validated with real people.
- **Digital twin:** a virtual replica of one *specific* person or system, kept in sync with real data. A twin of an expert preserves and reuses what that particular person knows.

### Decision still open: creation or interaction?

The team must choose one focus:

| Option | Who we design for | Example moment |
| --- | --- | --- |
| **Creation** | The expert giving their knowledge | A retiring expert builds their twin with minimal effort, and feels credited, not replaced |
| **Interaction** | The person receiving the knowledge | A newer user asks the expert's twin for help in the middle of a task |

### Candidate directions (team to pick one)

1. **Intangible cultural heritage:** capture the knowledge and judgment of traditional craftspeople and make it accessible to future generations.
2. **Design software learning:** capture how experienced users work in Adobe, Figma, Blender, etc., and guide new learners step by step.
3. **Personal and family history:** help older generations record their stories through conversation, photos and objects, creating an interactive family archive.
4. **Personal work twin:** an agent that learns how an individual works and makes decisions, continues tasks while they're away, and lets them review its work afterward.

*Note: the assignment frames the problem as knowledge preservation **at a company**. Directions 2 and 4 fit that most directly. If we choose 1 or 3, we should explain why we're extending the idea beyond the workplace.*

### Our working hypothesis (draft)

If knowledge capture happens passively during an expert's real work, and the twin gives cited, context-aware answers inside the tools people already use, then newcomers will solve problems faster and organizations will lose less when experts leave.

Patterns from our literature review that the design should include:
- **Consent:** the expert opts in and controls what is captured.
- **Disclosure:** the twin is clearly labeled as AI, not the real person.
- **Citations:** every answer links back to where it came from.
- **Caveats:** the twin states the limits of what it knows.
- **Feedback and escalation:** users can flag gaps or reach the real expert.

### Methods and deliverables

1. Empathy maps
2. User journey map
3. MVP definition
4. User flows
5. High-fidelity prototype
6. Usability testing

### Timeline

| Dates | Phase | What happens |
| --- | --- | --- |
| Oct 19–21 | Discover | Design brief, literature review, competitor analysis |
| Oct 22–25 | Research | Empathy maps, journey map; choose direction and focus |
| Oct 26–27 | Define & design | MVP, user flows, high-fidelity prototype |
| **Oct 28 (Wed), 9–11am** | **Usability testing** | 6 participants (2 per team member), 30–45 min each; 10:30–11 to build slides |
| Oct 29–31 | Iterate | Synthesize findings, revise prototype |
| Nov 1–2 | Deliver | Final prototype, case study, presentation |

### Usability study plan (Oct 28)

- **Participants:** engineers, as close to the real users as possible; bonus if they have mainframe or COBOL experience.
- **Recruiting:** Berkeley CS PhD students and professors, Berkeley CS alumni on LinkedIn, ADPList.
- **Each team member:** schedule 2 sessions plus 1 backup; record time, date, first name, profession and company in the team Google Doc.
- **Diversity:** aim for a mix of genders, ages and backgrounds across the team.
- **Note-taking:** attend teammates' sessions to take notes; don't rely only on transcription tools.

---

## Sources

- Hypercubic on Y Combinator: https://www.ycombinator.com/companies/hypercubic
- Launch YC, Hypercubic: https://www.ycombinator.com/launches/Oh4-hypercubic-ai-to-maintain-and-modernize-cobol-mainframes
- HyperTwin product page: https://www.hypercubic.ai/hypertwin
- SiliconANGLE, Hypercubic raises $5.3M: https://siliconangle.com/?p=790234
- Hypercubic, COBOL retirement vs. training pipeline: https://www.hypercubic.ai/insights/cobol-developer-retirement-rate-vs-training-pipeline
