// Demo story: AI Optimization Research. Built from a participant's bachelor's thesis, shared for the
// usability test: a reinforcement learning agent that picks which surrogate model guides an evolutionary
// optimizer on expensive black-box problems. The text is a summary in our own words; the author's name and
// details are left out, and the demo account is made up. Numbers come from the thesis's tables.
//
// The "projects" here are the three bodies of work in the thesis: the final framework, the earlier versions
// it replaced, and the BBOB experiments. Point fields are the same as in demo/design.js. Formulas are TeX,
// drawn by js/math.js. In TESTS, {name} becomes the expert's first name.

const THESIS = 'thesis_surrogate_recommendation.pdf';
const src = (...wheres) => wheres.map((where) => ({ file: THESIS, where }));
const at = (where) => `${THESIS} · ${where}`;

const FILES = [{ name: THESIS, size: 1782580, type: 'PDF' }];

const PROJECTS = [
  { id: 'final', name: 'Final framework', what: 'the method as submitted' },
  { id: 'early', name: 'Earlier versions', what: 'designs tried and dropped' },
  { id: 'bbob', name: 'BBOB experiments', what: 'benchmark runs and ablations' },
];

const SECTIONS = [
  { id: 'problem', title: '1. Problem and motivation' },
  { id: 'theory', title: '2. Foundations' },
  { id: 'design', title: '3. Framework design' },
  { id: 'train', title: '4. Training and implementation' },
  { id: 'exp', title: '5. Experiments' },
  { id: 'next', title: '6. Lessons and next steps' },
];

// status: complete | missing (a gap the expert needs to fill) | conflict (results that don't fit together)
const POINTS = [
  // ----- 1. Problem and motivation -----
  {
    id: 'pm-expensive', section: 'problem', title: 'Expensive black-box optimization', status: 'complete', projects: ['final', 'bbob'],
    summary: 'Some problems can only be scored by running something slow: a simulation, a lab test, a full training run. There’s no formula and no gradient, and one evaluation can take minutes or days. The whole method is about reaching a good answer with as few real evaluations as possible.',
    challenge: 'Standard evolutionary algorithms and gradient methods need thousands of real evaluations. On these problems the budget runs out before they converge.',
    why: 'It shapes every design choice that follows: anything that saves a real evaluation is worth a lot, and anything that wastes one is expensive.',
    how: [
      'Write the problem as minimizing f(x) over a search space, with any constraints.',
      'Check whether f has a formula or gradients. If it doesn’t, treat it as a black box.',
      'Estimate what one evaluation costs, and set the evaluation budget from that.',
      'Plan to replace most real evaluations with cheap predictions.',
    ],
    solution: 'Treat every real evaluation as the scarce resource. Count them, budget them, and spend them only where a prediction isn’t good enough.',
    figure: {
      kind: 'formula', at: 'summary', caption: 'Equation 2-1.',
      tex: String.raw`\min_{x \in \Omega} f(x) \quad \text{s.t.}\ g(x) \le 0,\ h(x) = 0`,
      note: 'x is a D-dimensional decision vector in the search space Ω. f has no closed form and no gradient.',
    },
    examples: [
      { project: 'final', text: 'Typical cases are aerospace design, materials discovery and hyperparameter tuning, where one evaluation is a simulation or a full training run.', source: at('section 1.1') },
      { project: 'bbob', text: 'The experiments cap each run at 20,000 evaluations of a 10-dimensional function, so every method spends the same budget.', source: at('section 4.1.4') },
    ],
    sources: src('section 1.1', 'section 2.1.1'),
    links: ['pm-sao'], keywords: ['expensive', 'black-box', 'blackbox', 'evaluation', 'evaluations', 'gradient', 'budget', 'simulation', 'problem'],
  },
  {
    id: 'pm-sao', section: 'problem', title: 'Surrogate-assisted optimization', status: 'complete', projects: ['final', 'bbob'],
    summary: 'A surrogate is a cheap model that predicts what a real evaluation would say. The optimizer screens candidates with the surrogate, spends real evaluations only on the most promising ones, then retrains the surrogate on the new data.',
    challenge: 'A surrogate is only as good as its training data, and accurate surrogates need many real samples, which is exactly what you’re trying to save.',
    why: 'It cuts the number of expensive evaluations dramatically, which is why it’s the main approach to expensive black-box problems.',
    how: [
      'Sample starting points, for example with Latin hypercube sampling, and evaluate them for real.',
      'Train a surrogate on that data.',
      'Use the surrogate to rank new candidates.',
      'Evaluate the best candidates for real and add them to the data.',
      'Retrain and repeat until the budget is spent.',
    ],
    solution: 'Let the surrogate do the screening and the real function do the deciding. Never trust predictions far from the data the surrogate has seen.',
    figure: [
      { kind: 'steps', at: 'how', caption: 'The surrogate-assisted loop. It repeats until the budget is spent.', items: ['Sample', 'Train surrogate', 'Screen candidates', 'Evaluate the best', 'Update the data'] },
      {
        kind: 'table', at: 'how', caption: 'Common surrogates, from section 2.1.2.',
        head: ['Surrogate', 'Strength', 'Weakness'],
        rows: [
          ['Gaussian process (Kriging)', 'Gives uncertainty; supports expected improvement', 'O(N³) training; slow beyond about 20 dimensions'],
          ['Polynomial and SVR', 'Fast to train', 'Depends on the kernel and hand-made features'],
          ['RBF network', 'Closed-form training, about O(N); easy to parallelize', 'Can fail locally on rugged, high-dimensional landscapes'],
          ['MLP', 'Strong non-linear fit', 'Overfits small samples; many hyperparameters'],
        ],
      },
    ],
    examples: [
      { project: 'final', text: 'The method uses radial basis function networks as surrogates, because they train in closed form and are cheap enough to call every generation.', source: at('section 2.1.2') },
      { project: 'bbob', text: 'Each surrogate is pre-trained on 110 Latin hypercube samples: 11 × D, with D = 10.', source: at('section 4.1.4') },
    ],
    sources: src('section 2.1.2'),
    links: ['pm-expensive', 'th-rbfn', 'pm-static'], keywords: ['surrogate', 'sao', 'assisted', 'cheap', 'kriging', 'gaussian', 'process', 'loop', 'predict', 'prediction'],
  },
  {
    id: 'pm-static', section: 'problem', title: 'Why one fixed surrogate isn’t enough', status: 'complete', projects: ['final', 'early'],
    summary: 'Most surrogate-assisted methods pick one surrogate, or a fixed blend, and keep it for the whole run. But different problems, and different stages of the same run, need different surrogates.',
    challenge: 'Early in a run the population is spread out and needs a smooth surrogate that captures the overall trend. Late in a run it has gathered near an optimum and needs a sharp, local one. Rugged regions and flat regions want different settings again.',
    why: 'A surrogate that fits a stage badly overfits or underfits. Its prediction errors pile up, and the search stalls in a local optimum.',
    how: [
      'Name the stage: global exploration (spread out) or local exploitation (clustered).',
      'Look at the landscape: many peaks, steep boundaries or flat regions.',
      'Match the surrogate to both: wide, smooth ones for exploration and flat regions, narrow, sensitive ones for exploitation and rugged regions.',
      'Switch as the stage changes, instead of fixing one choice up front.',
    ],
    solution: 'Choose the surrogate per stage and per problem, not once per project. That choice is a decision to learn from data, not a rule to hand-tune.',
    figure: {
      kind: 'table', at: 'how', caption: 'From section 2.1.3.',
      head: ['Situation', 'What the surrogate needs'],
      rows: [
        ['Global exploration', 'Smooth, wide receptive fields that follow the overall trend'],
        ['Local exploitation', 'High resolution and narrow fields that catch local detail'],
        ['Many peaks or steep boundaries', 'Narrow fields and dense centres'],
        ['Flat transition regions', 'Wide fields and strong smoothing'],
      ],
    },
    examples: [
      { project: 'final', text: 'The method turns this into a learned decision: every generation, an agent picks which of 13 surrogates guides the search.', source: at('section 3.2') },
      { project: 'early', text: 'The static choice is the baseline: each of the 13 surrogates used alone for the whole budget.', source: at('section 4.1.3') },
    ],
    sources: src('section 1.1', 'section 2.1.3'),
    links: ['pm-sao', 'ds-mdp', 'ds-library'], keywords: ['fixed', 'static', 'one', 'single', 'surrogate', 'enough', 'stage', 'exploration', 'exploitation', 'why'],
  },
  {
    id: 'pm-related', section: 'problem', title: 'Related work', status: 'complete', projects: ['final'],
    summary: 'The work sits where three lines of research meet: surrogate-assisted optimization, reinforcement learning that controls evolutionary algorithms, and meta-learning for black-box optimization (MetaBBO).',
    why: 'Knowing what each line already does shows the gap: nobody had treated the choice between different surrogates as a sequential decision, learned end to end.',
    how: [
      'Start with Jones et al. (1998), EGO, for the surrogate-assisted loop.',
      'Read Sun et al. (2021) and Ma et al. (2024) on reinforcement learning that controls evolution.',
      'Read the MetaBox papers for the MetaBBO platform and the learning-to-optimize setting.',
      'Read Schulman et al. (2017) for PPO.',
    ],
    solution: 'The contribution is the missing piece: surrogate choice as a Markov decision process, with state features that show how each individual sits relative to each surrogate.',
    figure: {
      kind: 'table', at: 'summary', caption: 'From section 1.2.',
      head: ['Line of work', 'Key idea', 'What was missing'],
      rows: [
        ['Surrogate-assisted optimization (EGO, 1998)', 'Cheap predictions; real evaluations for the best points', 'One surrogate, fixed for the run'],
        ['RL-controlled evolution (2021, 2024)', 'Learn operators and parameters from experience', 'Controls DE itself, not which surrogate to use'],
        ['Dynamic surrogate management (2025)', 'A deep RL agent switches surrogates', 'Rules and global statistics; no individual-to-surrogate matching'],
        ['Meta-black-box optimization', 'Learn optimizers across tasks', 'No end-to-end scheduling of a mixed surrogate library'],
      ],
    },
    sources: src('section 1.2'),
    links: ['pm-static', 'th-ppo'], keywords: ['related', 'literature', 'papers', 'read', 'prior', 'ego', 'metabbo', 'reading', 'references'],
  },

  // ----- 2. Foundations -----
  {
    id: 'th-de', section: 'theory', title: 'Differential evolution', status: 'complete', projects: ['final'],
    summary: 'Differential evolution (DE) improves a population of real-valued vectors by adding scaled differences between its members. Each generation has three steps: mutation, crossover and greedy selection.',
    challenge: 'DE is very sensitive to its scale factor F and crossover rate CR. A large F overshoots the optimum; a small F converges too early. And random mutations create many weak candidates, which waste real evaluations.',
    why: 'It’s the optimizer the surrogate guides. Its structure, one population moving together, shapes how the surrogate choice has to work.',
    how: [
      'Mutation (current-to-best/1): move each individual towards the best one, and add the difference of two random others.',
      'Binomial crossover: take each coordinate from the mutant with probability CR, and always at least one.',
      'Selection: keep the better of the parent and the trial vector.',
    ],
    solution: 'In the framework, DE runs with fixed F₁ = F₂ = 0.5 and CR = 0.9, and the surrogate’s prediction stands in for f in the selection step.',
    figure: {
      kind: 'formula', at: 'how', caption: 'Equations 2-2 and 2-3, and the selection rule.',
      items: [
        { tex: String.raw`v_i^{(g)} = x_i^{(g)} + F \cdot \left(x_{\mathrm{best}}^{(g)} - x_i^{(g)}\right) + F \cdot \left(x_{r1}^{(g)} - x_{r2}^{(g)}\right)`, note: 'Mutation, current-to-best/1.' },
        { tex: String.raw`u_{i,j}^{(g)} = \begin{cases} v_{i,j}^{(g)} & \text{if } \mathrm{rand}_j \le CR \text{ or } j = j_{\mathrm{rand}} \\ x_{i,j}^{(g)} & \text{otherwise} \end{cases}`, note: 'Binomial crossover.' },
        { tex: String.raw`x_i^{(g+1)} = \argmin \left\{ f\left(u_i^{(g)}\right),\ f\left(x_i^{(g)}\right) \right\}`, note: 'Greedy selection. With a surrogate, f is the prediction.' },
      ],
    },
    examples: [
      { project: 'final', text: 'The optimizer is the learnable DE from the metaevobox library, with current-to-best/1 mutation, binomial crossover and boundary handling.', source: at('section 3.6.3') },
    ],
    sources: src('section 2.2.1', 'section 2.2.2', 'section 3.6.3'),
    links: ['th-rbfn', 'nx-de', 'tr-loop'], keywords: ['differential', 'evolution', 'de', 'mutation', 'crossover', 'selection', 'scale', 'factor', 'cr'],
  },
  {
    id: 'th-rbfn', section: 'theory', title: 'Radial basis function networks', status: 'complete', projects: ['final'],
    summary: 'An RBF network predicts a value as a weighted sum of bell-shaped functions, each centred on a point in the search space. With enough centres it can fit any smooth function, and it trains in a single closed-form step.',
    challenge: 'Its fit depends almost entirely on where the centres sit and how wide each bell is. Random centres leave gaps or crowd together; the wrong width over-smooths or overfits.',
    why: 'Those two settings give each surrogate its character, so varying them on purpose produces a library of surrogates with different strengths.',
    how: [
      'Choose the centres, usually with k-means clustering on the training samples.',
      'Choose the widths σ from the distances between centres: the mean nearest-neighbour distance gives wide, smooth fields, and the maximum gives narrow, sensitive ones.',
      'Solve the output weights in closed form, with least squares or a pseudo-inverse, so there’s no gradient descent.',
      'Predict with the weighted sum of Gaussians.',
    ],
    solution: 'Centres decide where the network pays attention; widths decide how far it generalizes. Mean distance for smooth and global, maximum distance for sharp and local.',
    figure: {
      kind: 'formula', at: 'how', caption: 'Equation 2-4.',
      tex: String.raw`\hat{f}(x) = \sum_{k=1}^{K} w_k\, \phi\left(\lVert x - c_k \rVert;\ \sigma_k\right), \qquad \phi = \exp\left(-\frac{\lVert x - c_k \rVert^2}{2\sigma_k^2}\right)`,
      note: 'c are the centres, σ the receptive-field widths and w the output weights.',
    },
    examples: [
      { project: 'final', text: 'All 13 surrogates in the library are RBF networks that differ only in how they place their centres and set their widths.', source: at('section 3.3') },
    ],
    sources: src('section 2.3.1', 'section 2.3.2'),
    links: ['th-de', 'ds-library', 'pm-sao'], keywords: ['rbf', 'rbfn', 'radial', 'basis', 'network', 'centres', 'centers', 'width', 'sigma', 'gaussian', 'kmeans'],
  },
  {
    id: 'th-mdp', section: 'theory', title: 'Markov decision processes', status: 'complete', projects: ['final'],
    summary: 'A Markov decision process (MDP) describes a decision made over and over: in each state the agent takes an action, the environment moves to a new state and returns a reward. The goal is a policy that maximizes the discounted sum of rewards.',
    challenge: 'Hand-written schedules for when to use which surrogate can’t adapt. Writing the choice as an MDP turns it into something a learning algorithm can optimize.',
    why: 'Choosing a surrogate every generation is exactly this kind of repeated decision: each choice changes the population the next choice sees.',
    how: [
      'Define the state: what the agent sees each generation.',
      'Define the actions: the choices it can make.',
      'The transition is whatever happens next; here, DE steps and real evaluations, unknown to the agent.',
      'Define the reward that scores each step.',
      'Pick the discount γ, close to 1 for long-term planning.',
    ],
    solution: 'If a choice repeats and affects what comes next, model it as an MDP. Then the hard part is designing the state, the actions and the reward.',
    figure: {
      kind: 'formula', at: 'how', caption: 'Section 2.4.1 and equation 3-1.',
      items: [
        { tex: String.raw`\mathcal{M} = \left(\mathcal{S},\ \mathcal{A},\ \mathcal{P},\ \mathcal{R},\ \gamma\right)`, note: 'States, actions, transitions, rewards and the discount.' },
        { tex: String.raw`J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\left[\sum_{t=0}^{T} \gamma^t r_t\right]`, note: 'The objective: the expected discounted return of trajectories under the policy.' },
      ],
    },
    sources: src('section 2.4.1', 'section 3.2'),
    links: ['ds-mdp', 'th-ppo'], keywords: ['mdp', 'markov', 'decision', 'process', 'state', 'action', 'discount', 'policy', 'sequential'],
  },
  {
    id: 'th-ppo', section: 'theory', title: 'Proximal policy optimization', status: 'complete', projects: ['final'],
    summary: 'PPO trains a policy network directly, and keeps each update small by clipping how far the new policy can move from the old one. That makes it stable enough for noisy, changing environments like an optimization run.',
    challenge: 'Plain policy-gradient updates can jump too far, collapse the policy or blow up the gradients, especially when the environment keeps changing.',
    why: 'The surrogate-choosing agent learns from relatively few, noisy episodes, so it needs updates that are both sample-efficient and safe.',
    how: [
      'Collect trajectories with the current policy.',
      'Estimate advantages: how much better each action did than expected.',
      'Compute the probability ratio between the new and the old policy.',
      'Clip the ratio to 1 ± ε and take the more pessimistic of the clipped and unclipped objectives.',
      'Update the actor and the critic together, with an entropy bonus to keep exploring.',
    ],
    solution: 'Use PPO-Clip with ε = 0.2 and gradient clipping at 1.0. Together they stop the policy from collapsing in a non-stationary environment.',
    figure: {
      kind: 'formula', at: 'how', caption: 'Equation 2-5.',
      items: [
        { tex: String.raw`L^{\mathrm{CLIP}}(\theta) = \mathbb{E}_t\left[\min\left(r_t(\theta)\,\hat{A}_t,\ \mathrm{clip}\left(r_t(\theta),\ 1-\epsilon,\ 1+\epsilon\right)\hat{A}_t\right)\right]` },
        { tex: String.raw`r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\mathrm{old}}}(a_t \mid s_t)}`, note: 'The probability ratio. ε = 0.2 in the framework.' },
      ],
    },
    examples: [
      { project: 'final', text: 'The framework uses PPO with an actor-critic network, AdamW at a learning rate of 10⁻⁴, γ = 0.99 and 3 update epochs.', source: at('section 3.6.1') },
    ],
    sources: src('section 2.4.2', 'section 3.6.2'),
    links: ['th-mdp', 'tr-network'], keywords: ['ppo', 'proximal', 'policy', 'optimization', 'clip', 'clipping', 'actor', 'critic', 'advantage', 'gae'],
  },

  // ----- 3. Framework design -----
  {
    id: 'ds-mdp', section: 'design', title: 'Surrogate choice as a decision', status: 'complete', projects: ['final'],
    summary: 'The framework treats picking a surrogate as an MDP. Each generation, a PPO agent looks at the population and recommends one of 13 surrogates; DE uses it to choose survivors; real evaluations then score how well that choice worked.',
    challenge: 'The agent never sees the black-box function itself. It has to learn which surrogate helps in which situation purely by trying.',
    why: 'It replaces expert rules with a policy learned from data, which can adapt to the problem and to the stage of the run.',
    how: [
      'State: distances between individuals and each surrogate, plus five numbers about the run’s progress.',
      'Action: the index of one surrogate, 0 to 12, applied to the whole population.',
      'Transition: DE mutation, crossover and selection with that surrogate, then real evaluation.',
      'Reward: a four-part score of what that generation achieved.',
      'Discount: γ = 0.99, so long-term progress counts.',
    ],
    solution: 'The state, the actions and the reward are the whole design. Get them right and PPO does the rest.',
    figure: { kind: 'steps', at: 'summary', caption: 'The loop from figure 3-1. It runs once per generation.', items: ['Population', 'Feature extractor', 'PPO agent', 'Surrogate index', 'DE step with that surrogate', 'Real evaluation', 'Reward'] },
    examples: [
      { project: 'final', at: 'summary', text: 'The system has five modules: the input population, feature extraction, the RL agent, the surrogate library, and the DE optimizer with its evaluation branch.', source: at('figure 3-1') },
    ],
    sources: src('chapter 3', 'section 3.2'),
    links: ['th-mdp', 'ds-state', 'ds-action', 'ds-reward'], keywords: ['framework', 'architecture', 'mdp', 'decision', 'agent', 'recommend', 'recommendation', 'works', 'system', 'overview'],
  },
  {
    id: 'ds-library', section: 'design', title: 'The surrogate library', status: 'complete', projects: ['final', 'early'],
    summary: 'The agent chooses from 13 RBF network surrogates. They’re built to differ on purpose, covering the range from smooth and global to sharp and local, so every choice means something.',
    challenge: 'Surrogates that are too alike give the agent nothing to choose between; too many make the choice hard to learn.',
    why: 'The library is the agent’s action space. Its variety sets the ceiling on what the scheduling can achieve.',
    how: [
      'Vary the number of centres: √n for smooth fits, d for sensitive ones, all n samples for exact interpolation.',
      'Vary the width rule: mean nearest-neighbour distance (wide) or maximum (narrow), plus global formulas.',
      'Vary the basis function: Gaussian, thin-plate spline, multiquadric and inverse multiquadric.',
      'Vary where the centres start: near the boundaries, in sparse regions, by two-stage clustering, or along the principal components.',
      'Pair each starting strategy with both width rules.',
    ],
    solution: 'Build a small library whose members disagree in useful ways. Thirteen clearly different surrogates beat a bigger pool of near-duplicates.',
    figure: [
      {
        kind: 'table', at: 'how', caption: 'Section 3.3. v6 to v9 each come in a mean and a max version, which makes 13.',
        head: ['Variant', 'Centres', 'Width or basis', 'Good for'],
        rows: [
          ['v1 global smooth', '√n, by k-means', 'Mean distance (wide)', 'Overall trends, flat regions'],
          ['v2 local sensitive', 'd centres', 'Max distance (narrow)', 'Many peaks, steep boundaries'],
          ['v3 dense interpolation', 'All n samples', 'Global formula', 'Exact local interpolation'],
          ['v4 large scale', '√n', 'Global formula × 2¹²', 'Sparse, very flat landscapes'],
          ['v5 analytic bases', 'All n', 'TPS, MQ or IMQ basis', 'Stable solves, better extrapolation'],
          ['v6 boundary-first', 'Start near the bounds', 'Mean or max', 'Constraint edges, steep gradients'],
          ['v7 low-density', 'Start in sparse regions', 'Mean or max', 'Filling gaps in exploration'],
          ['v8 two-stage clustering', 'Clusters of clusters', 'Mean or max', 'More representative centres'],
          ['v9 PCA projection', 'Along principal axes', 'Mean or max', 'Separable, high-dimensional functions'],
        ],
      },
      {
        kind: 'formula', at: 'how', caption: 'Centre count for v1 and v4, and the width rule for v3.',
        tex: String.raw`k = \lfloor \sqrt{n} \rfloor, \qquad \sigma_{v3} \propto d_{\max} \cdot (d \cdot n)^{-1/d}`,
        note: 'n is the number of samples and d the dimension.',
      },
    ],
    examples: [
      { project: 'final', text: '13 surrogates: v1 to v5 once each, and v6 to v9 in mean and max versions.', source: at('section 3.3') },
      { project: 'early', text: 'An earlier 31-surrogate pool added regional “specialist” surrogates. It lost on 9 of the 12 test problems and trained about half as fast.', source: at('section 4.3') },
    ],
    sources: src('section 3.3', 'section 4.3'),
    links: ['th-rbfn', 'nx-pool', 'ds-action'], keywords: ['library', 'pool', 'surrogates', '13', 'variants', 'rbfn', 'v1', 'v6', 'centres', 'which'],
  },
  {
    id: 'ds-state', section: 'design', title: 'State features', status: 'complete', projects: ['final', 'early', 'bbob'],
    summary: 'The agent sees two things each generation. Micro features are distances that show how each individual sits relative to each surrogate; macro features are five numbers about where the run is. A small attention network fuses them into one state vector.',
    challenge: 'Global statistics like population variance can’t tell whether a surrogate fits the region an individual is in. Raw features also mix very different scales, which makes training unstable.',
    why: 'Without the right view, the agent can’t tell exploration from exploitation, and its choices oscillate on multimodal problems.',
    how: [
      'Compute three distance channels for every individual and every surrogate: to the surrogate’s nearest centre, to the nearest training sample, and to the fifth nearest. Normalize by the largest distance.',
      'Embed each channel from 13 to 16 dimensions, concatenate them, and compress with a linear layer, LayerNorm and LeakyReLU.',
      'Add sinusoidal positional encoding across the population, then one multi-head self-attention layer, then mean pooling.',
      'Compute the five macro features, and fuse them with the pooled micro features into the 16-dimensional state.',
    ],
    solution: 'Give the agent both views: micro features to match surrogates to regions, macro features to know the stage. Either one alone fails.',
    figure: [
      {
        kind: 'table', at: 'how', caption: 'The five macro features, section 3.4.3.',
        head: ['Feature', 'What it measures', 'What it tells the agent'],
        rows: [
          ['Diversity', 'Spread of the normalized coordinates', 'High: still exploring, so use wide surrogates'],
          ['Convergence', 'Variance of the current fitness values', 'With diversity, warns of early stagnation'],
          ['Progress', 'Evaluations used ÷ budget', 'Don’t keep exploring too late'],
          ['Stagnation', 'Generations without a new best', 'High: switch to a strongly exploring surrogate'],
          ['Reward trend', 'Mean reward over the last 5 steps', 'Whether recent choices worked'],
        ],
      },
      {
        kind: 'formula', at: 'how', caption: 'Equations 3-2, 3-3 and 3-6.',
        items: [
          { tex: String.raw`M = \mathrm{LeakyReLU}\left(\mathrm{LayerNorm}\left(W_m\left[C \,\Vert\, S_1 \,\Vert\, S_5\right] + b_m\right)\right)`, note: 'Fusing the three distance channels.' },
          { tex: String.raw`PE_{(pos,\,2i)} = \sin\left(\frac{pos}{10000^{2i/h}}\right), \qquad PE_{(pos,\,2i+1)} = \cos\left(\frac{pos}{10000^{2i/h}}\right)`, note: 'Sinusoidal positional encoding, with h = 16.' },
          { tex: String.raw`s_t = \mathrm{LeakyReLU}\left(\mathrm{LayerNorm}\left(W_{\mathrm{fuse}}\left[h_{\mathrm{spatial}} \,\Vert\, h_{\mathrm{macro}}\right] + b_{\mathrm{fuse}}\right)\right)`, note: 'The final state vector.' },
        ],
      },
    ],
    examples: [
      { project: 'final', text: 'Each distance channel is a [batch × population × 13] matrix; the state is a 16-dimensional vector.', source: at('section 3.4') },
      { project: 'early', text: 'The first version used micro features only. It couldn’t tell early exploration from late fine-tuning.', source: at('section 4.3') },
      { project: 'bbob', text: 'Removing the macro features made all five test problems worse: by 41.7% on f12 and 28.8% on f15.', source: at('table 4-3') },
    ],
    sources: src('section 3.4', 'table 4-3'),
    links: ['ds-mdp', 'ex-ablation', 'tr-network'], keywords: ['state', 'features', 'representation', 'micro', 'macro', 'distance', 'attention', 'positional', 'encoding', 'diversity', 'stagnation'],
  },
  {
    id: 'ds-action', section: 'design', title: 'Population-level actions', status: 'complete', projects: ['final', 'early', 'bbob'],
    summary: 'Each generation the agent outputs one surrogate index, and the whole population uses that surrogate. It sounds coarse, but it beat giving every individual its own surrogate on 11 of 12 problems.',
    challenge: 'Choosing per individual looks better in theory, because individuals sit in different parts of the landscape. In practice the action space grows with the population.',
    why: 'Two reasons. DE relies on one shared view of the landscape within a generation, and mixing surrogates breaks its selection. And a 13-way choice keeps PPO’s probability ratios, and so its updates, stable.',
    how: [
      'Keep the action space as small as the library: 13 discrete choices.',
      'Apply the chosen surrogate to every individual in that generation.',
      'Choose again next generation, so the schedule can still change over time.',
    ],
    solution: 'One surrogate per generation for everyone. Change it over time, not across individuals.',
    figure: {
      kind: 'bars', at: 'summary', caption: 'Problems won out of 12, when only the scope of the action changed. Table 4-5.',
      bars: [{ label: 'Population-level', value: 11, strong: true }, { label: 'Individual-level', value: 1 }], max: 12,
    },
    examples: [
      { project: 'final', text: 'The action is one index from 0 to 12, applied to the whole population of 100.', source: at('section 3.5.1') },
      { project: 'early', text: 'An earlier version gave each individual its own surrogate. Policy updates oscillated, and DE’s selection lost its direction.', source: at('section 4.3') },
      { project: 'bbob', text: 'Population-level actions won on 11 of 12 problems. Individual-level actions won only on f15, by under 1%.', source: at('table 4-5') },
    ],
    sources: src('section 3.5.1', 'table 4-5'),
    links: ['ds-mdp', 'ex-f15', 'th-ppo'], keywords: ['action', 'actions', 'population', 'individual', 'level', 'space', 'index', 'per', 'generation'],
  },
  {
    id: 'ds-reward', section: 'design', title: 'The composite reward', status: 'complete', projects: ['final', 'early', 'bbob'],
    summary: 'The reward has four parts: how much the population’s ranking improved, how much the best value improved, a bonus for breaking the record, and a score for how trustworthy the chosen surrogate’s predictions were.',
    challenge: 'A reward based only on ranking improvement was short-sighted, went silent on plateaus and in local optima, and let the agent keep trusting surrogates that were wrong.',
    why: 'The reward is the only thing the agent learns from. Each of the four parts fixes one failure of the single-part version.',
    how: [
      'Ranking gain: the average positive improvement from parents to offspring, after normalizing. It gives a signal every generation.',
      'Best-value gain: the improvement in the best value, relative to the first best value, so early big drops don’t explode the gradients.',
      'Record bonus: 1.0 when the offspring beat the best value ever seen, otherwise 0. It rewards breakthroughs.',
      'Surrogate quality: mostly whether the surrogate predicted the direction of change correctly, minus a penalty for large errors.',
      'Add them with weights of 0.4, 0.2, 0.2 and 0.2.',
    ],
    solution: 'Reward progress every step, reward breakthroughs, and reward trusting the right surrogate. Leaving out the trust part is what breaks it.',
    figure: [
      {
        kind: 'formula', at: 'how', caption: 'Equations 3-7 and 3-10.',
        items: [
          { tex: String.raw`r_t = \alpha\, r_{\mathrm{ind}} + \beta\, r_{\mathrm{gbest}} + \gamma\, r_{\mathrm{sparse}} + \delta\, r_{\mathrm{surrogate}}`, note: 'α = 0.4, β = γ = δ = 0.2.' },
          { tex: String.raw`r_{\mathrm{surrogate}} = 0.7 \cdot \mathbb{I}\left(\text{predicted direction} = \text{true direction}\right) + 0.3 \cdot e^{-2 \cdot \mathrm{MAE}_{\mathrm{norm}}} - 0.5`, note: 'Getting the direction right counts most; the exponential term penalizes large errors.' },
        ],
      },
      {
        kind: 'bars', at: 'how', caption: 'The four weights.',
        bars: [{ label: 'Ranking gain', value: 0.4, strong: true }, { label: 'Best-value gain', value: 0.2 }, { label: 'Record bonus', value: 0.2 }, { label: 'Surrogate quality', value: 0.2 }], max: 0.5,
      },
    ],
    examples: [
      { project: 'final', text: 'Four parts, weighted 0.4, 0.2, 0.2 and 0.2.', source: at('section 3.5.2') },
      { project: 'early', text: 'The first version used only the ranking gain. It chased short-term gains and stalled on plateaus.', source: at('section 3.5.2') },
      { project: 'bbob', text: 'Without the surrogate-quality part, f12 got 169% worse and f20 179% worse.', source: at('table 4-4') },
    ],
    sources: src('section 3.5.2', 'table 4-4'),
    links: ['ds-weights', 'ex-ablation', 'ds-mdp'], keywords: ['reward', 'rewards', 'composite', 'function', 'ranking', 'sparse', 'bonus', 'quality', 'trust', 'components', 'four'],
  },
  {
    id: 'ds-weights', section: 'design', title: 'Choosing the reward weights', status: 'missing', projects: ['final'],
    summary: 'The thesis fixes the reward weights at 0.4, 0.2, 0.2 and 0.2, but doesn’t say how they were chosen, or whether they should change for a new problem.',
    why: 'The weights decide what the agent cares about. Anyone applying the method to a new problem will want to know whether to tune them, and how.',
    examples: [
      { project: 'final', at: 'summary', text: 'The weights are stated as the current setting. No search over weights or sensitivity study is reported.', source: at('section 3.5.2') },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your thesis gives the weights, but not how you arrived at them.',
      ask: 'How did you choose the reward weights, and how should someone adjust them for a new problem?',
      example: 'I started with equal weights, then gave the ranking gain more once I saw it was the only signal that never went silent. I checked the reward curves on a few problems, like f3 and f12. If training stalls on plateaus, raise the record bonus; if the agent keeps picking surrogates that predict badly, raise the quality term. I wouldn’t tune them per problem until the defaults clearly fail.',
    },
    sources: src('section 3.5.2'),
    links: ['ds-reward'], keywords: ['weights', 'weight', 'alpha', 'beta', 'tune', 'tuning', 'adjust', 'choose', 'set'],
  },

  // ----- 4. Training and implementation -----
  {
    id: 'tr-network', section: 'train', title: 'The network and its settings', status: 'complete', projects: ['final', 'bbob'],
    summary: 'The actor and the critic share one small feature extractor. The actor gives a probability for each of the 13 surrogates; the critic estimates how good the current state is. Everything is kept small, and the settings favour stability.',
    challenge: 'A big network overfits one problem; an over-confident critic biases the advantage estimates. And an optimization run is non-stationary, so aggressive settings make the policy collapse.',
    why: 'The state is already compact and clean, so small heads learn faster. Most failed training runs come from settings, not from the idea.',
    how: [
      'Feature extractor: three 13 → 16 embeddings, a 48 → 16 fusion layer, then one 8-head self-attention layer with a feed-forward size of 16.',
      'Actor: 16 → 128 → 32 → 13, with a softmax over the surrogates. Critic: 16 → 16 → 8 → 1.',
      'Train with AdamW at 10⁻⁴, with weight decay so the policy doesn’t memorize one problem.',
      'Collect 10 steps per update from 16 parallel environments, run 3 epochs with ε = 0.2, and clip the gradient norm at 1.0.',
    ],
    solution: 'Share the features, keep both heads small, and make the critic the simplest part. Small, clipped, parallel updates: stability first.',
    figure: {
      kind: 'table', at: 'how', caption: 'Table 4-1.',
      head: ['Setting', 'Value', 'Note'],
      rows: [
        ['Population size', '100', 'Individuals per generation'],
        ['Evaluation budget', '20,000', 'Ends the run'],
        ['F₁, F₂ and CR', '0.5, 0.5 and 0.9', 'DE mutation and crossover'],
        ['Learning rate', '10⁻⁴', 'AdamW'],
        ['Discount γ', '0.99', 'Long-term credit'],
        ['Rollout length', '10 steps', 'Per update'],
        ['Epochs per update', '3', 'Standard for PPO'],
        ['Clip ε', '0.2', 'Limits each policy update'],
        ['Max gradient norm', '1.0', 'Stops gradients exploding'],
        ['Parallel environments', '16', 'The batch size'],
        ['Training epochs', '50', 'Per problem'],
      ],
    },
    examples: [
      { project: 'final', text: 'The 32-dimensional bottleneck in the actor acts as regularization; the critic is deliberately light so the baseline stays stable.', source: at('section 3.6.1') },
      { project: 'bbob', text: 'Every function gets its own model, trained with these settings and tested on 5 independent runs.', source: at('section 4.1.6') },
    ],
    sources: src('section 3.6.1', 'table 4-1'),
    links: ['th-ppo', 'tr-size', 'tr-metatrain'], keywords: ['network', 'architecture', 'actor', 'critic', 'hyperparameters', 'settings', 'learning', 'rate', 'epochs', 'batch', 'parameters'],
  },
  {
    id: 'tr-size', section: 'train', title: 'Sizing the network', status: 'missing', projects: ['final'],
    summary: 'The sizes, 16 hidden dimensions, 8 attention heads and one attention layer, come with short reasons, but not with how they were found.',
    why: 'Anyone adapting the method to a different library or population size will need to resize the network.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your thesis explains why the network is small, but not how you picked these exact sizes.',
      ask: 'How did you choose the hidden size, the number of heads and the number of layers? What would you change for a bigger library?',
      example: 'I started bigger and shrank the network until training got worse. 16 dimensions was the smallest size that still told the surrogates apart, and 8 heads cost almost nothing at that size. A second attention layer made the features too smooth and training noisier. For a bigger library I’d widen the actor’s output first and keep the feature extractor as it is.',
    },
    sources: src('section 3.6.1'),
    links: ['tr-network'], keywords: ['size', 'sizing', 'hidden', 'heads', 'layers', 'dimension', 'dimensions', 'bigger'],
  },
  {
    id: 'tr-loop', section: 'train', title: 'The optimizer–agent loop', status: 'complete', projects: ['final'],
    summary: 'Each generation follows the same six steps: build the state, pick a surrogate, mutate and cross over, select with the surrogate’s predictions, evaluate for real and score the step, then update the counters.',
    challenge: 'The surrogate has to do real work, choosing survivors instead of real evaluations, or the method saves nothing. But the reward still has to come from real values.',
    why: 'Predictions guide the selection, while real evaluations compute the reward. That split keeps the optimization cheap and the learning honest.',
    how: [
      'Build the state from normalized coordinates: the distance matrices and the macro statistics.',
      'The actor samples a surrogate index. A fixed-surrogate baseline returns its preset index instead.',
      'Run DE mutation and crossover with F₁ = F₂ = 0.5 and CR = 0.9 to get the trial vectors.',
      'Predict the trial vectors and the parents with the chosen surrogate, and select on those predictions.',
      'Evaluate both for real, compute the four-part reward and log the true convergence curve.',
      'Update the best value, the stagnation counter and the reward window, and build the next state.',
    ],
    solution: 'The prediction picks the survivors; reality scores the choice.',
    figure: { kind: 'steps', at: 'how', caption: 'Section 3.6.3.', items: ['State', 'Pick a surrogate', 'Mutate and cross over', 'Select by prediction', 'Evaluate and reward', 'Update counters'] },
    sources: src('section 3.6.3'),
    links: ['ds-mdp', 'th-de', 'ds-reward'], keywords: ['loop', 'interaction', 'generation', 'steps', 'optimizer', 'select', 'predict', 'evaluate'],
  },
  {
    id: 'tr-metatrain', section: 'train', title: 'Training and testing on MetaBBO', status: 'complete', projects: ['final', 'bbob'],
    summary: 'Training runs on the MetaBBO platform: many environments in parallel, short rollouts, then a PPO update. Testing freezes every weight and runs the agent without any updates.',
    challenge: 'Experience from one environment at a time is strongly correlated, which makes the advantage estimates noisy.',
    why: 'Parallel, varied rollouts let each update see different starting populations and random paths, so the policy learns the real pattern faster.',
    how: [
      'For each training epoch, set up several environments of the same function with different random seeds.',
      'Run them in separate processes and collect states, actions and rewards together.',
      'After 10 steps, pause and run the PPO update.',
      'Watch policy loss, value error, KL divergence and return in TensorBoard, and save checkpoints regularly.',
      'To test, switch training off and run without gradients, so nothing updates.',
    ],
    solution: 'Train in parallel, monitor everything, checkpoint often, and test with the weights frozen.',
    examples: [
      { project: 'final', text: 'Testing needs no human tuning, no surrogate fine-tuning and no hyperparameter search.', source: at('section 3.7.2') },
      { project: 'bbob', text: 'The reward is still computed during testing, but only for the logs and curves.', source: at('section 3.7.2') },
    ],
    sources: src('section 3.7.1', 'section 3.7.2'),
    links: ['tr-network', 'tr-checkpoint', 'tr-debug'], keywords: ['metabbo', 'meta', 'training', 'train', 'testing', 'parallel', 'tensorboard', 'checkpoints', 'platform', 'frozen'],
  },
  {
    id: 'tr-checkpoint', section: 'train', title: 'Choosing the checkpoint to test', status: 'missing', projects: ['bbob'],
    summary: 'The experiment plan says to choose the best-performing model for testing, but not what “best” means or how it was measured.',
    why: 'If a checkpoint is chosen on the same runs it’s tested on, the results look better than they are.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your plan says you test the best-performing checkpoint, but not how you pick it.',
      ask: 'How do you choose which checkpoint to test, and on which runs do you judge it?',
      example: 'I pick the checkpoint with the best average return over the last few training epochs, not the single best epoch, because single epochs are noisy. Then I test it on fresh seeds that weren’t used in training, so the five test runs aren’t the ones I chose it on.',
    },
    sources: src('section 4.1.6'),
    links: ['tr-metatrain', 'ex-metrics'], keywords: ['checkpoint', 'checkpoints', 'best', 'model', 'pick', 'select', 'test'],
  },
  {
    id: 'tr-debug', section: 'train', title: 'Telling learning from oscillation', status: 'missing', projects: ['bbob'],
    summary: 'On f8 the training loss and reward oscillated, yet the test results were good. The thesis explains that case, but not how to tell, in general, whether an agent is learning.',
    why: 'Newcomers often stop a run that’s fine, or trust one that’s quietly failing.',
    examples: [
      { project: 'bbob', at: 'summary', text: 'On f8, several surrogates were good enough everywhere, so the agent didn’t have to choose precisely. Training oscillated, but testing beat most baselines.', source: at('section 4.2.2') },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your thesis explains the f8 case, but not the checks you use on a new problem.',
      ask: 'When the training curves oscillate, how do you tell whether the agent is learning or broken?',
      example: 'I compare it with the fixed-surrogate baselines on test runs first. If it beats most of them, the oscillation usually means several surrogates are equally good, like on f8. Then I look at which surrogates it picks during a run: if the choice changes with the stage, it’s learning; if it’s random from start to finish, it isn’t. A reward curve that drifts upward while it oscillates is fine; a flat one isn’t.',
    },
    sources: src('section 4.2.2'),
    links: ['tr-metatrain', 'ex-f8'], keywords: ['oscillation', 'oscillating', 'oscillates', 'debug', 'debugging', 'learning', 'broken', 'curve', 'loss', 'unstable'],
  },

  // ----- 5. Experiments -----
  {
    id: 'ex-bbob', section: 'exp', title: 'Benchmark and baselines', status: 'complete', projects: ['bbob'],
    summary: 'Experiments use the 24 noise-free BBOB functions in 10 dimensions, grouped by landscape type. The method is compared with each of the 13 surrogates used alone, and with random search that evaluates everything for real.',
    challenge: 'One function says little; the method has to hold up across very different landscapes. And comparing only with other surrogate methods hides what approximation costs.',
    why: 'The fixed surrogates answer “is it better than choosing once?”; random search answers “how far is it from the true values?”',
    how: [
      'Use all 24 functions in 10 dimensions, and train and test one model per function.',
      'Pre-train every surrogate on 110 Latin hypercube samples.',
      'Run each algorithm 5 times, with a budget of 20,000 evaluations and a population of 100.',
      'Compare with every fixed surrogate, and with random search on real evaluations as an accuracy anchor.',
    ],
    solution: 'Cover every landscape group, keep the budget fixed, repeat each run five times, and always include a no-surrogate anchor.',
    figure: {
      kind: 'table', at: 'summary', caption: 'Section 4.1.2.',
      head: ['Group', 'Functions'],
      rows: [
        ['Separable', 'f1–f5: Sphere, Ellipsoidal, Rastrigin, Büche-Rastrigin, Linear slope'],
        ['Moderate conditioning', 'f6–f9: Attractive sector, Step ellipsoidal, Rosenbrock, rotated Rosenbrock'],
        ['High conditioning', 'f10–f14: Ellipsoidal, Discus, Bent cigar, Sharp ridge, Different powers'],
        ['Multimodal', 'f15–f19: Rastrigin, Weierstrass, two Schaffers F7, Griewank-Rosenbrock'],
        ['Weakly structured', 'f20–f24: Schwefel, two Gallagher peaks functions, Katsuura, Lunacek bi-Rastrigin'],
      ],
    },
    examples: [
      { project: 'bbob', text: 'On 11 of the 24 functions the best and worst surrogate were within 20% of each other, so the comparisons focus on the other 12.', source: at('section 4.2.1') },
      { project: 'bbob', text: 'Training and testing on the same function is deliberate for now; generalizing across problems is future work.', source: at('section 4.1.2') },
    ],
    sources: src('section 4.1.2', 'section 4.1.3', 'section 4.1.4'),
    links: ['ex-metrics', 'ex-random'], keywords: ['bbob', 'benchmark', 'coco', 'functions', 'suite', 'baselines', 'baseline', 'dimensions', 'setup'],
  },
  {
    id: 'ex-metrics', section: 'exp', title: 'Measuring results', status: 'complete', projects: ['bbob'],
    summary: 'Three measures: the mean best value over 5 runs, convergence curves on a log scale with the spread shaded, and the average rank across functions.',
    why: 'Final values show accuracy, curves show speed and stability, and ranks make functions whose values differ by orders of magnitude comparable.',
    how: [
      'Record the best value each run reached within the budget, and average over the runs.',
      'Plot the running best against evaluations on a log scale, with ±1 standard deviation shaded.',
      'Rank the algorithms on each function by mean best value, 1 being best, and average the ranks.',
    ],
    solution: 'Report means with their spread, show curves on a log scale, and compare with average ranks.',
    figure: {
      kind: 'formula', at: 'how', caption: 'Equations 4-1, 4-2 and 4-4.',
      items: [
        { tex: String.raw`\bar{f}_{\mathrm{best}} = \frac{1}{R}\sum_{r=1}^{R} f_{\mathrm{best}}^{(r)}, \qquad f_{\mathrm{best}}^{(r)} = \min_{t \in [1,\, T_{\max}]} f\left(x_{\mathrm{bs}}^{(r)}(t)\right)`, note: 'Mean best fitness over R = 5 runs.' },
        { tex: String.raw`\bar{R}_j = \frac{1}{M}\sum_{i=1}^{M} \mathrm{rank}_{i,j}`, note: 'Average rank of algorithm j over M functions.' },
      ],
    },
    sources: src('section 4.1.5'),
    links: ['ex-results', 'tr-checkpoint'], keywords: ['metrics', 'measure', 'measuring', 'mean', 'rank', 'ranking', 'curves', 'convergence', 'evaluate'],
  },
  {
    id: 'ex-results', section: 'exp', title: 'Main results', status: 'complete', projects: ['bbob'],
    summary: 'On the 12 functions where the surrogates differ, the recommendation model ranks first on average, at 2.33. The best fixed surrogate averages 4.67, and the worst 11.83.',
    challenge: 'No single surrogate is best everywhere. RBFN_v2, for example, beats the model on f12 but ranks only fourth overall.',
    why: 'This is the central claim: scheduling surrogates adaptively beats choosing one up front.',
    how: [
      'Compare on the 12 functions where the surrogates really differ.',
      'Look at the average rank first, then each function’s mean and spread.',
      'Check the convergence curves for when each method stops improving.',
    ],
    solution: 'Learned scheduling wins on average even though it never wins everywhere. That’s the point: the best surrogate changes with the problem and the stage.',
    figure: [
      {
        kind: 'bars', at: 'summary', caption: 'Average rank on 12 BBOB functions, lower is better. Table 4-2.', max: 12,
        bars: [
          { label: 'Recommender', value: 2.333, strong: true }, { label: 'RBFN_v6_max', value: 4.667 }, { label: 'RBFN_v7_max', value: 5.833 },
          { label: 'RBFN_v2', value: 6.417 }, { label: 'RBFN_v9_mean', value: 6.917 }, { label: 'RBFN_v6_mean', value: 6.917 },
          { label: 'RBFN_v9_max', value: 7 }, { label: 'RBFN_v7_mean', value: 8.083 }, { label: 'RBFN_v3', value: 8.25 },
          { label: 'RBFN_v8_max', value: 8.833 }, { label: 'RBFN_v5', value: 8.833 }, { label: 'RBFN_v1', value: 9.5 },
          { label: 'RBFN_v8_mean', value: 9.5 }, { label: 'RBFN_v4', value: 11.833 },
        ],
      },
      {
        kind: 'lines', at: 'how', caption: 'f12 (Bent cigar), redrawn from figure 4-5. Approximate; log scale, mean of 5 runs.',
        x: { label: 'Function evaluations', max: 20000, ticks: [0, 5000, 10000, 15000, 20000] },
        y: { label: 'Best fitness', log: true, min: 5e6, max: 3e9, ticks: [1e7, 1e8, 1e9] },
        series: [
          { name: 'Recommender', points: [[400, 2.0e8], [1000, 1.3e8], [1500, 1.0e8], [2500, 7.5e7], [3300, 7.0e7], [3600, 4.3e7], [5000, 4.2e7], [7500, 4.1e7], [10000, 3.9e7], [15000, 3.8e7], [20000, 3.78e7]] },
          { name: 'RBFN_v2', points: [[400, 7.5e7], [900, 4.0e7], [1300, 3.1e7], [2000, 3.15e7], [5000, 3.2e7], [20000, 3.2e7]] },
          { name: 'RBFN_v3', points: [[400, 2.0e8], [1200, 3.0e8], [1800, 8.0e8], [2500, 1.6e9], [3500, 1.8e9], [20000, 1.84e9]] },
          { name: 'Random search', points: [[400, 3.5e7], [900, 2.0e7], [1500, 1.6e7], [3500, 1.4e7], [10000, 1.35e7], [11500, 1.2e7], [16000, 1.1e7], [20000, 1.04e7]] },
        ],
      },
    ],
    examples: [
      { project: 'bbob', text: 'On f12 the recommender ended at 3.78 × 10⁷, RBFN_v2 at 3.20 × 10⁷, and RBFN_v3 diverged to 1.84 × 10⁹.', source: at('appendix, table 4') },
      { project: 'bbob', text: 'On f20 the recommender reached 3.31 × 10³, against 4.27 × 10³ for the best fixed surrogate, RBFN_v9_max.', source: at('appendix, table 7') },
    ],
    sources: src('section 4.2.1', 'table 4-2', 'figure 4-5'),
    links: ['ex-metrics', 'ex-random', 'ex-f8'], keywords: ['results', 'result', 'rank', 'ranking', 'performance', 'better', 'best', 'compare', 'works', 'win', 'does'],
  },
  {
    id: 'ex-random', section: 'exp', title: 'Losing to random search', status: 'complete', projects: ['bbob'],
    summary: 'Random search with real evaluations beat every surrogate method on most functions; the recommender won only on f8 and f9. The thesis traces this to approximation error, not to the scheduling.',
    challenge: 'Reporting a result like this honestly, without hiding it or overstating it.',
    why: 'It marks the real limit of selecting by prediction: every prediction error costs some accuracy, however well the surrogate is chosen.',
    how: [
      'Separate the causes: the surrogates’ approximation error, and a reward that makes the policy cautious early on.',
      'Check that random search’s lead comes from exact values, not from a smarter search.',
      'Turn it into future work: more accurate surrogates, uncertainty estimates, or mixing surrogate and real evaluations.',
    ],
    solution: 'Scheduling can’t beat the accuracy ceiling of its surrogates. Say so plainly, and work on the surrogates next.',
    figure: {
      kind: 'table', at: 'summary', caption: 'Mean best fitness, lower is better. Appendix table 9; the recommender won the two bold rows.',
      head: ['Function', 'Recommender', 'Random search'],
      rows: [
        ['f1 Sphere', '7.02 × 10²', '1.34 × 10¹'],
        ['f3 Rastrigin', '4.28 × 10²', '1.18 × 10²'],
        { cells: ['f8 Rosenbrock', '1.59 × 10³', '1.69 × 10³'], strong: true },
        { cells: ['f9 Rosenbrock, rotated', '1.55 × 10³', '1.97 × 10³'], strong: true },
        ['f12 Bent cigar', '3.78 × 10⁷', '1.04 × 10⁷'],
        ['f20 Schwefel', '3.31 × 10³', '3.53 × 10²'],
      ],
    },
    examples: [
      { project: 'bbob', text: 'The surrogate-quality penalty also pushed the policy towards cautious, wide surrogates early in training, while random search has no such bias.', source: at('section 4.2.1') },
    ],
    sources: src('section 4.2.1', 'appendix, table 9'),
    links: ['ex-bbob', 'nx-limits'], keywords: ['random', 'search', 'lose', 'loses', 'losing', 'worse', 'real', 'why', 'ceiling', 'error'],
  },
  {
    id: 'ex-ablation', section: 'exp', title: 'Ablation studies', status: 'complete', projects: ['bbob', 'early'],
    summary: 'Two ablations test the parts most likely to be unnecessary. Removing the macro features made every test problem worse. Removing the surrogate-quality reward made most of them much worse.',
    challenge: 'Showing a part matters takes the same budget, problems and runs as the full model, with only that part removed.',
    why: 'Without ablations, a complex design can’t show which parts earn their place.',
    how: [
      'Pick one function per landscape group: f3, f8, f12, f15 and f20.',
      'Remove one part, and keep everything else the same.',
      'Compare the mean best values, and report the change as a percentage.',
    ],
    solution: 'Keep both: the macro features tell the agent the stage, and the quality reward stops it trusting bad surrogates.',
    figure: {
      kind: 'bars', at: 'how', caption: 'How much worse each ablation did, in percent. Higher is worse. Tables 4-3 and 4-4.', unit: '%',
      series: ['No macro features', 'No surrogate-quality reward'],
      bars: [
        { label: 'f3', values: [14.46, 30.85] },
        { label: 'f8', values: [3.91, 31.7] },
        { label: 'f12', values: [41.68, 169.12] },
        { label: 'f15', values: [28.76, -0.15] },
        { label: 'f20', values: [1.27, 179.03] },
      ],
    },
    examples: [
      { project: 'bbob', text: 'Without the quality reward, f12 got 169% worse and f20 179% worse: misleading surrogates set off a cycle of bad guidance and real penalties.', source: at('table 4-4') },
      { project: 'early', text: 'Both parts were added after earlier versions failed without them.', source: at('section 4.3') },
    ],
    sources: src('section 4.2.3', 'table 4-3', 'table 4-4'),
    links: ['ds-state', 'ds-reward', 'ex-f15'], keywords: ['ablation', 'ablations', 'remove', 'removing', 'without', 'macro', 'quality', 'necessary', 'parts'],
  },
  {
    id: 'ex-f15', section: 'exp', title: 'The f15 exception', status: 'conflict', projects: ['bbob'],
    summary: 'f15, the rotated Rastrigin function, breaks two patterns. Removing the surrogate-quality reward made it slightly better, and individual-level actions beat population-level ones only there.',
    why: 'If a component helps everywhere except one problem, a newcomer needs to know whether that’s a real effect or noise before dropping it.',
    figure: {
      kind: 'table', at: 'summary', caption: 'Tables 4-4 and 4-5. Mean best fitness, lower is better, with the standard deviation.',
      head: ['On f15', 'Full model', 'Variant'],
      rows: [
        ['Without the quality reward', '1.996 × 10³ (± 31.9)', '1.993 × 10³ (± 22.5)'],
        ['Individual-level actions', '1.996 × 10³ (± 31.9)', '1.980 × 10³ (± 9.7)'],
      ],
    },
    gap: {
      kind: 'differ', at: 'solution', label: 'Your results differ.', ruleLabel: 'Rule · when results differ',
      note: 'Removing the surrogate-quality reward hurt f12 by 169% and f20 by 179%, but made f15 0.15% better. Individual-level actions also won only on f15.',
      sides: [
        { source: 'Table 4-4 · f12 and f20', claim: 'Without the quality reward: 169% and 179% worse.' },
        { source: 'Tables 4-4 and 4-5 · f15', claim: 'Without it: 0.15% better. Individual-level actions: 0.8% better.' },
      ],
      ask: 'Is f15 really different, or is it within run-to-run noise? What should someone conclude from it?',
      example: 'It’s noise. On f15 the differences are smaller than one standard deviation of the full model’s runs. f15 has a huge number of evenly spread local optima, so no surrogate predicts it well and the choice barely matters. I wouldn’t drop the quality reward or switch to individual actions because of it.',
    },
    sources: src('table 4-4', 'table 4-5'),
    links: ['ex-ablation', 'ds-action'], keywords: ['f15', 'rastrigin', 'exception', 'noise', 'outlier', 'different', 'drop'],
  },
  {
    id: 'ex-f8', section: 'exp', title: 'The f8 case: noisy training, good results', status: 'complete', projects: ['bbob'],
    summary: 'On f8 (Rosenbrock), the training loss and reward oscillated, yet the model beat most baselines and even random search. Several surrogates were good enough there, so precise choices didn’t matter.',
    challenge: 'It looks like success, but the agent hadn’t learned a fine-grained schedule. The pool’s redundancy was carrying it.',
    why: 'It shows a design principle: the agent learns best when each surrogate is clearly best at some stage, not when many are good overall.',
    how: [
      'When training oscillates but testing is good, check how many surrogates do well alone on that problem.',
      'If many do, the reward surface is flat and the agent gets little signal.',
      'Build pools from stage-best surrogates, so each choice makes a real difference.',
    ],
    solution: 'A good score with oscillating training can mean the pool is doing the work. Build pools where each member is best at something.',
    figure: {
      kind: 'table', at: 'summary', caption: 'Appendix tables 3 and 9.',
      head: ['f8 (Rosenbrock)', 'Mean best fitness'],
      rows: [
        { cells: ['Recommender', '1.587 × 10³'], strong: true },
        ['RBFN_v9_mean, the best fixed surrogate', '1.487 × 10³'],
        ['RBFN_v1', '1.741 × 10³'],
        ['RBFN_v7_max', '1.822 × 10³'],
        ['Random search', '1.685 × 10³'],
        ['RBFN_v3, the worst', '1.414 × 10⁵'],
      ],
    },
    sources: src('section 4.2.2', 'appendix, table 3'),
    links: ['ex-results', 'tr-debug', 'nx-pool'], keywords: ['f8', 'rosenbrock', 'noisy', 'redundancy', 'safety', 'net', 'oscillated'],
  },

  // ----- 6. Lessons and next steps -----
  {
    id: 'nx-pool', section: 'next', title: 'A smaller library won', status: 'complete', projects: ['early', 'bbob'],
    summary: 'A 31-surrogate pool with extra regional specialists did well on a few problems, but worse overall. The 13-surrogate library won on 9 of 12 problems and trained about twice as fast.',
    challenge: 'More choices look like more power, but every extra surrogate makes the action space harder to explore.',
    why: 'Occam’s razor, applied to the action space: fewer, clearly different choices give the agent a sharper signal.',
    how: [
      'Start with a small library of clearly different surrogates.',
      'Add a surrogate only if it wins somewhere the others don’t.',
      'Grow the library only once the agent can reliably tell the existing ones apart.',
    ],
    solution: 'Keep the library as small as the decision needs. Add surrogates one at a time, and only when they earn it.',
    figure: {
      kind: 'bars', at: 'summary', caption: 'Problems won out of 12 with each library. Table 4-6.',
      bars: [{ label: '13 surrogates', value: 9, strong: true }, { label: '31 surrogates', value: 3 }], max: 12,
    },
    examples: [
      { project: 'early', text: 'The 31-surrogate pool won on f2, f9 and f13.', source: at('table 4-6') },
      { project: 'bbob', text: 'The 13-surrogate library won the other nine, and converged about twice as fast in training.', source: at('section 4.3') },
    ],
    sources: src('section 4.3', 'table 4-6'),
    links: ['ds-library', 'ex-f8'], keywords: ['pool', 'library', '31', '13', 'smaller', 'bigger', 'size', 'occam', 'more', 'surrogates'],
  },
  {
    id: 'nx-limits', section: 'next', title: 'Limitations and future work', status: 'complete', projects: ['final'],
    summary: 'Three limits stand out: surrogate error caps the accuracy, every new problem needs its own training, and the pool isn’t built from stage-best surrogates. Six future directions follow from them.',
    why: 'Knowing the limits tells the next person where the biggest gains are.',
    how: [
      'Make the feature extractor and the surrogates hot-swappable, without stopping a run.',
      'Build pools of stage-best surrogates: one each for exploration, exploitation and breaking out of local optima.',
      'Make surrogates more accurate and add uncertainty estimates, such as Bayesian RBF networks or ensemble disagreement.',
      'Grow the library carefully, adding Gaussian processes or neural surrogates once the agent can handle more choices.',
      'Train across problems, aligning landscapes in a shared latent space, for zero-shot recommendation.',
      'Try training without real evaluations, in a surrogate-driven environment, while watching for reward hacking.',
    ],
    solution: 'Next: better surrogates first, then training across problems. Scheduling alone has reached its ceiling.',
    sources: src('section 4.4.2', 'conclusion'),
    links: ['ex-random', 'nx-de'], keywords: ['limitations', 'limits', 'future', 'next', 'improve', 'directions', 'generalization', 'zero-shot'],
  },
  {
    id: 'nx-de', section: 'next', title: 'Why DE’s parameters stay fixed', status: 'missing', projects: ['final'],
    summary: 'DE runs with F₁ = F₂ = 0.5 and CR = 0.9 throughout, while related work lets reinforcement learning control those parameters too. The thesis doesn’t say why they were left fixed.',
    why: 'Someone extending the method will ask whether the agent should control DE’s parameters as well.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your thesis fixes F and CR, but doesn’t say why they aren’t learned too.',
      ask: 'Why did you keep DE’s parameters fixed instead of letting the agent control them?',
      example: 'To isolate the surrogate choice. If the agent also changed F and CR, I couldn’t tell which decision caused an improvement, and the action space would grow from 13 choices to a mix of discrete and continuous ones. 0.5 and 0.9 are standard, robust values for DE. Learning them is a good next step once the surrogate scheduling is solid.',
    },
    sources: src('section 3.6.3', 'table 4-1'),
    links: ['th-de', 'nx-limits'], keywords: ['parameters', 'fixed', 'cr', 'de', 'control', 'scale', 'crossover', 'learn'],
  },
  {
    id: 'nx-mentor', section: 'next', title: 'What newcomers get wrong', status: 'missing', projects: ['final', 'early', 'bbob'],
    summary: 'The thesis records several dead ends: individual-level actions, a 31-surrogate pool and a ranking-only reward. It doesn’t say what advice you’d give someone starting out.',
    why: 'The dead ends cost months. Naming them saves the next person the same time.',
    gap: {
      kind: 'missing', at: 'solution',
      note: 'This is advice only you can give. Your thesis shows the dead ends, but not the lessons you’d pass on.',
      ask: 'What mistake do newcomers to this kind of research make most often, and what should they do instead?',
      example: 'They make the design bigger before it works: per-individual actions, more surrogates, more reward terms. Each of those made things worse for me at first. Get the smallest version training stably, add one part at a time, and keep an ablation for every part you add.',
    },
    sources: src('section 4.3'),
    links: ['nx-pool', 'ds-action'], keywords: ['newcomers', 'mistake', 'mistakes', 'advice', 'beginners', 'students', 'wrong', 'start', 'new'],
  },
];

// Final validation: the twin and the expert answer the same questions, then we compare.
const TESTS = [
  {
    id: 'q1', points: ['ex-f15'],
    question: 'A labmate wants to drop the surrogate-quality reward, because removing it made f15 slightly better. What do you tell them?',
    answer: 'Keep it. On f15 the difference is smaller than the run-to-run spread, so it’s noise. Without the quality reward, f12 got 169% worse and f20 179% worse, because the agent starts trusting surrogates that predict badly.',
    partial: 'My sources differ: the quality reward helps most problems but not f15. Check with {name} before changing it.',
    keywords: ['noise', 'keep', 'f12', 'f20', 'trust', 'spread'],
    example: 'Keep it. f15 is within noise, and without it f12 and f20 get far worse.',
  },
  {
    id: 'q2', points: ['ds-weights'],
    question: 'Someone is applying the method to a new problem. Should they change the reward weights?',
    answer: 'Not at first. Start with 0.4, 0.2, 0.2 and 0.2. If training stalls on plateaus, raise the record bonus; if the agent keeps trusting surrogates that predict badly, raise the quality term.',
    partial: 'The weights are 0.4, 0.2, 0.2 and 0.2. I can’t say how {name} would change them, because {name} hasn’t explained it yet.',
    keywords: ['start', 'default', 'plateaus', 'record', 'quality', 'raise'],
    example: 'Keep the defaults first. Raise the record bonus if it stalls, and the quality term if it trusts bad surrogates.',
  },
  {
    id: 'q3', points: ['tr-debug'],
    question: 'The training reward on a new function keeps oscillating. Is the agent broken?',
    answer: 'Not necessarily. Compare its test runs with the fixed-surrogate baselines first: on f8 training oscillated, but testing beat most of them, because several surrogates were good enough. Then check whether its choices change with the stage of the run.',
    partial: 'Maybe not: on f8 training oscillated but testing was good. I can’t say how {name} checks this in general yet.',
    keywords: ['baselines', 'test', 'f8', 'stage', 'choices', 'compare'],
    example: 'Not necessarily. Compare with the fixed baselines on test runs, like f8, and see whether its choices follow the stage.',
  },
];

// The demo account's published twin: how the author runs benchmark experiments.
const GUIDE_SECTIONS = [
  { id: 'setup', title: 'Setting up runs' },
  { id: 'report', title: 'Reporting results' },
];

const GUIDE_POINTS = [
  ['setup', 'bb-suite', 'Choosing the test suite', 'Use all 24 noise-free BBOB functions, so every landscape group is covered: separable, conditioned, multimodal and weakly structured.', ['suite', 'functions', 'bbob', 'which']],
  ['setup', 'bb-budget', 'Dimensions and budget', 'Fix the dimension and the evaluation budget for every method, for example 10 dimensions and 20,000 evaluations.', ['dimension', 'dimensions', 'budget', 'evaluations']],
  ['setup', 'bb-samples', 'Starting samples', 'Pre-train surrogates on Latin hypercube samples, 11 × D points, so every method starts from the same data.', ['samples', 'lhs', 'latin', 'starting', 'initial']],
  ['setup', 'bb-runs', 'Independent runs', 'Run each method at least 5 times with different seeds, and report the mean and the standard deviation.', ['runs', 'seeds', 'repeat', 'many', 'how']],
  ['report', 'bb-curves', 'Convergence curves', 'Plot the running best against evaluations on a log scale, with ±1 standard deviation shaded.', ['curves', 'plot', 'convergence', 'log']],
  ['report', 'bb-ranks', 'Average ranks', 'Rank the methods on each function and average the ranks, so functions on different scales can be compared.', ['rank', 'ranks', 'average', 'compare', 'across']],
  ['report', 'bb-filter', 'When methods don’t differ', 'Leave out functions where every method is within about 20% of the others. They can’t show which choice matters.', ['differ', 'leave', 'out', 'exclude', '20']],
  ['report', 'bb-anchor', 'An exact-value anchor', 'Include random search on real evaluations. If everything loses to it, the gap comes from surrogate error, not from the method.', ['random', 'anchor', 'baseline', 'real']],
].map(([section, id, title, summary, keywords], i) => ({
  id, section, title, summary, keywords, status: 'complete',
  sources: [{ file: i % 2 ? 'experiment_checklist.md' : 'benchmarking_notes.md', where: i % 2 ? `item ${i + 1}` : `section ${Math.floor(i / 2) + 1}` }],
  links: [],
}));

export default {
  id: 'research',
  label: 'AI Optimization Research',
  icon: 'flask',
  summary: 'How a research student designed, trained and tested an agent that picks surrogate models for expensive optimization. Built from their thesis.',
  twinName: 'Surrogate Recommendation Research',
  newcomer: 'a new research student',
  roleExample: 'Research student, evolutionary computation',
  uploadHint: 'Theses, papers, experiment logs, code notes and results tables.',
  skills: ['Evolutionary algorithms', 'Differential evolution', 'Surrogate models', 'Reinforcement learning', 'PPO', 'Meta-learning', 'Benchmarking', 'PyTorch'],
  files: FILES,
  projects: PROJECTS,
  sections: SECTIONS,
  points: POINTS,
  tests: TESTS,
  // Example questions offered in "Try your twin".
  trySuggestions: [
    'Why not use one fixed surrogate?',
    'How does the reward work?',
    'Why does it lose to random search?',
  ],
  // The returning user behind "Use a demo account". The name is made up.
  account: {
    user: { name: 'Jordan Lin', email: 'jordan@lab.example', role: 'Research student, evolutionary computation', company: 'University optimization lab', years: '2', skills: ['Evolutionary algorithms', 'Surrogate models', 'Reinforcement learning', 'Benchmarking'] },
    building: 'twin-research',
    published: {
      id: 'twin-bbob',
      name: 'Benchmarking Guide',
      files: [{ name: 'benchmarking_notes.md', size: 18432, type: 'MD' }, { name: 'experiment_checklist.md', size: 6144, type: 'MD' }],
      sections: GUIDE_SECTIONS,
      points: GUIDE_POINTS,
      suggestions: ['How many runs should I do?', 'How do I compare methods across functions?', 'Which functions should I leave out?'],
      match: 86,
      terms: { access: 'team', model: 'per-answer', rate: 0.1, credit: true, escalate: true, limits: '' },
      licensees: 1,
      monthly: [34, 51, 47], // answers per month, oldest first
    },
  },
};
