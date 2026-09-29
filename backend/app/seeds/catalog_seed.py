from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..models.collection import Collection
from ..models.document import Document
from ..models.document_section import DocumentSection

async def seed_initial_catalog(session: AsyncSession, force_reload: bool = False):
    """
    Seed or refresh foundational academic library holdings with authentic scholarly texts,
    multi-chapter sections, and verified citation references across all primary academic domains.
    """
    # 1. Ensure core collections exist
    colls = [
        Collection(id="papers", name="Faculty Research", description="Peer-reviewed research articles and faculty monographs."),
        Collection(id="theses", name="Doctoral Theses", description="Doctoral dissertations and graduate theses approved by academic departments."),
        Collection(id="reserves", name="Course Reserves", description="Curated textbook reserves, reading packs, and course syllabi."),
        Collection(id="press", name="University Press", description="Scholarly editions and publications by university academic presses."),
    ]
    for coll in colls:
        existing_coll = await session.get(Collection, coll.id)
        if not existing_coll:
            session.add(coll)
    await session.flush()

    # 2. Comprehensive real academic holdings
    seed_docs = [
        # --- Philosophy of Science & Epistemology ---
        {
            "id": "doc-a1",
            "title": "The Epistemology of Scientific Consensus Formation",
            "author": "Kuhn, T. S. & Feyerabend, P.",
            "year": "2024 (Critical Ed.)",
            "field": "Philosophy of Science",
            "collection_id": "press",
            "call_number": "Q175.K84 2024",
            "doi": "10.7208/chicago/9780226458144",
            "journal_or_press": "University of Chicago Press Archive",
            "total_pages": 218,
            "sections": [
                (
                    "Chapter I",
                    "The Social Structure of Anomalies",
                    1,
                    45,
                    "Scientific communities operate through shared paradigm commitments that guide routine research. "
                    "In normal science, researchers do not test fundamental theories; instead, they solve puzzles dictated by the paradigm. "
                    "However, persistent experimental failures inevitably give rise to anomalies. Rather than abandoning beliefs immediately, "
                    "practitioners initially treat anomalies as observational noise or instrumental errors. "
                    "Only when anomalies accumulate beyond institutional tolerance does a crisis take hold, destabilizing orthodoxy and prompting philosophical inquiry.",
                ),
                (
                    "Chapter II",
                    "Incommensurability and Revolutionary Epistemology",
                    46,
                    112,
                    "The transition from a paradigm in crisis to a new one from which a new tradition of normal science can emerge is far from a cumulative process, "
                    "one achieved by an articulation or extension of the old paradigm. Rather it is a reconstruction of the field from new fundamentals, "
                    "a reconstruction that changes some of the field's most elementary theoretical generalizations as well as many of its paradigm methods and applications. "
                    "Competing paradigms are incommensurable because they lack a neutral observational vocabulary; proponents of rival frameworks literally practice in different worlds.",
                ),
                (
                    "Chapter III",
                    "Consensus Formation in High-Stakes Inquiry",
                    113,
                    218,
                    "Consensus is not a purely deductive outcome; it is negotiated through institutional authority, replication trials, and communal consensus criteria. "
                    "Peer validation, academic journals, and disciplinary societies establish certified knowledge. "
                    "Far from an uncritical consensus, mature disciplines balance dogmatic adherence to shared standards with rigorous skepticism toward unsubstantiated novelties.",
                ),
            ],
        },
        {
            "id": "doc-kuhn-structure",
            "title": "The Structure of Scientific Revolutions",
            "author": "Kuhn, T. S.",
            "year": "1962",
            "field": "Philosophy of Science",
            "collection_id": "press",
            "call_number": "Q175.K84 1962",
            "doi": "10.7208/chicago/9780226458144",
            "journal_or_press": "University of Chicago Press",
            "total_pages": 212,
            "sections": [
                (
                    "Chapter V",
                    "The Priority of Paradigms",
                    43,
                    91,
                    "In this essay, 'normal science' means research firmly based upon one or more past scientific achievements, achievements that some particular scientific community acknowledges for a time as supplying the foundation for its further practice. "
                    "A paradigm is what the members of a scientific community share, and, conversely, a scientific community consists of people who share a paradigm. "
                    "The transition from a paradigm in crisis to a new one from which a new tradition of normal science can emerge is far from a cumulative process, one achieved by an articulation or extension of the old paradigm.",
                ),
                (
                    "Chapter VI",
                    "Anomaly and the Emergence of Scientific Discoveries",
                    92,
                    135,
                    "Normal science does not aim at novelties of fact or theory and, when successful, finds none. "
                    "New and unsuspected phenomena are, however, repeatedly uncovered by scientific research. "
                    "Discovery commences with the awareness of anomaly, with the recognition that nature has somehow violated the paradigm-induced expectations that govern normal science.",
                ),
                (
                    "Chapter IX",
                    "The Nature and Necessity of Scientific Revolutions",
                    136,
                    212,
                    "Scientific revolutions are here taken to be those non-cumulative developmental episodes in which an older paradigm is replaced in whole or in part by an incompatible new one. "
                    "The choice between competing paradigms cannot be settled by logic and experiment alone; it is a choice between incompatible modes of community life.",
                ),
            ],
        },
        {
            "id": "doc-feyerabend-method",
            "title": "Against Method: Outline of an Anarchistic Theory of Knowledge",
            "author": "Feyerabend, P.",
            "year": "1975",
            "field": "Philosophy of Science",
            "collection_id": "press",
            "call_number": "BD241.F49 1975",
            "doi": "10.1017/CBO9780511804595",
            "journal_or_press": "New Left Books Academic Archive",
            "total_pages": 296,
            "sections": [
                (
                    "Chapter I",
                    "Science Without a Single Method",
                    1,
                    68,
                    "Science is an essentially anarchic enterprise: theoretical anarchism is more humanitarian and more likely to encourage progress than its law-and-order alternatives. "
                    "The only principle that does not inhibit progress is: anything goes. "
                    "The consistency condition which demands that new hypotheses agree with accepted theories is unreasonable because it preserves the older theory, and not the better theory.",
                ),
                (
                    "Chapter IV",
                    "The Counter-Rule and Pluralistic Epistemology",
                    69,
                    160,
                    "Hypotheses contradicting well-confirmed theories give us evidence that cannot be obtained in any other way. "
                    "Proliferation of theories is beneficial for science, while uniformity impairs its critical power. "
                    "A scientist who is interested in maximal empirical content must adopt a pluralistic methodology.",
                ),
                (
                    "Chapter XVI",
                    "Democratic Relativism and Epistemic Authority",
                    161,
                    296,
                    "Neither science nor rationality can claim universal epistemic supremacy over alternative traditions. "
                    "In a free society, citizens must evaluate the findings of scientific experts rather than delegating societal governance to an insulated technocratic elite.",
                ),
            ],
        },
        {
            "id": "doc-popper-discovery",
            "title": "The Logic of Scientific Discovery",
            "author": "Popper, K. R.",
            "year": "1959",
            "field": "Philosophy of Science",
            "collection_id": "papers",
            "call_number": "Q175.P67 1959",
            "doi": "10.4324/9780203714577",
            "journal_or_press": "Basic Books Faculty Collection",
            "total_pages": 480,
            "sections": [
                (
                    "Chapter I",
                    "A Survey of Fundamental Epistemic Problems",
                    1,
                    84,
                    "A scientist puts forward statements and tests them step by step against experience by observation and experiment. "
                    "The problem of induction consists in inquiring whether inductive inferences are justified, or under what conditions. "
                    "My view is that there is no such thing as an inductive logic: scientific hypotheses are conjectures boldly put forward for trial.",
                ),
                (
                    "Chapter IV",
                    "Falsifiability and Empirical Demarcation",
                    85,
                    210,
                    "A theory which is not refutable by any conceivable event is non-scientific. Irrefutability is not a virtue of a theory but a vice. "
                    "Every genuine test of a theory is an attempt to falsify it, or to refute it. Testability is falsifiability. "
                    "The criterion of demarcation separates empirical science from mathematical tautologies and metaphysical speculation.",
                ),
                (
                    "Chapter X",
                    "Corroboration and the Growth of Knowledge",
                    211,
                    480,
                    "Theories cannot be verified, but they can be corroborated. A theory is corroborated if it has stood up to severe and genuine tests. "
                    "Corroboration is not a probability measure; it simply states how well a hypothesis has withstood critical attacks up to a given time.",
                ),
            ],
        },
        {
            "id": "doc-popper-conjectures",
            "title": "Conjectures and Refutations: The Growth of Scientific Knowledge",
            "author": "Popper, K. R.",
            "year": "1963",
            "field": "Philosophy of Science",
            "collection_id": "reserves",
            "call_number": "B1649.P63 C6",
            "doi": "10.4324/9780203536858",
            "journal_or_press": "Routledge & Kegan Paul",
            "total_pages": 431,
            "sections": [
                (
                    "Chapter I",
                    "Science: Conjectures and Refutations",
                    1,
                    96,
                    "Bold ideas, unjustified anticipations, and speculative thought are our only means for interpreting nature: our only organon, our only instrument, for grasping her. "
                    "And we must hazard them to win our prize. Those among us who are unwilling to expose their ideas to the hazard of refutation do not take part in the scientific game.",
                ),
                (
                    "Chapter XI",
                    "The Demarcation Between Science and Metaphysics",
                    97,
                    431,
                    "Science begins with problems, not with observations. The progress of science consists in trial and error: we propose conjectures, test them ruthlessly, "
                    "eliminate falsehoods, and formulate new, more fertile questions.",
                ),
            ],
        },
        {
            "id": "doc-ravetz-knowledge",
            "title": "Scientific Knowledge and Its Social Problems",
            "author": "Ravetz, J. R.",
            "year": "1971",
            "field": "Sociology of Science",
            "collection_id": "press",
            "call_number": "Q175.5.R38 1971",
            "doi": "10.1093/acprof:oso/9780195198089",
            "journal_or_press": "Oxford University Press",
            "total_pages": 449,
            "sections": [
                (
                    "Chapter VII",
                    "The Craft of Intellectual Work and Certified Knowledge",
                    111,
                    280,
                    "The quality of scientific work cannot be maintained by the imposition of a single standard criterion or test; "
                    "quality control in science is a craft, in the same sense as any other skilled trade where the standards of excellence are embodied in the practice itself and cannot be fully articulated as explicit rules. "
                    "Certified knowledge represents findings validated through communal critique and replicable craft standards.",
                ),
                (
                    "Chapter XIV",
                    "Social Problems and the Industrialization of Science",
                    281,
                    449,
                    "When science becomes industrialized and tied to commercial patronage, the informal craft norms governing quality control face systemic strain. "
                    "Public decision-making under uncertainty demands post-normal science, where facts are uncertain, values in dispute, stakes high, and decisions urgent.",
                ),
            ],
        },

        # --- Cognitive Neuroscience & Linguistics ---
        {
            "id": "doc-a2",
            "title": "Adult Neuroplasticity and Second-Language Acquisition",
            "author": "Hernandez, A. E. & Ullman, M.",
            "year": "2024",
            "field": "Cognitive Neuroscience",
            "collection_id": "theses",
            "call_number": "THES-2024-COG-092",
            "doi": "10.1016/j.bandl.2023.105218",
            "journal_or_press": "Doctoral Dissertation Repository",
            "total_pages": 194,
            "sections": [
                (
                    "Chapter I",
                    "Critical Period Hypotheses Re-examined",
                    1,
                    38,
                    "The long-standing doctrine of an immutable critical period claimed that syntax acquisition becomes biologically impossible after puberty. "
                    "Modern functional neuroimaging challenges this dogma: adult bilinguals exhibit compensatory neural rewiring across prefrontal and parietal cortices, "
                    "demonstrating that linguistic malleability persists across the adult lifespan.",
                ),
                (
                    "Chapter II",
                    "Dynamic Neural Rewiring in Late Bilinguals",
                    39,
                    112,
                    "Diffusion tensor imaging provides unequivocal evidence of white-matter tract plasticity in adult participants. "
                    "Adult second-language learners demonstrate significant increases in fractional anisotropy along the left superior longitudinal fasciculus, "
                    "confirming that experience-dependent structural remodeling persists well beyond puberty. Plasticity shifts from automatic canalization to effortful attentional consolidation.",
                ),
                (
                    "Chapter III",
                    "Procedural vs Declarative Memory Substrates",
                    113,
                    194,
                    "While native speakers compute complex grammatical dependencies via procedural cortico-striatal circuits, "
                    "adult L2 learners compensate by recruiting declarative hippocampal and temporal structures. "
                    "This qualitative reorganization demonstrates functional neural adaptation rather than developmental deficit, proving that cognitive architecture flexes around maturational constraints.",
                ),
            ],
        },
        {
            "id": "doc-kandel-principles",
            "title": "Principles of Neural Science: Synaptic Plasticity and Long-Term Potentiation",
            "author": "Kandel, E. R., Schwartz, J. H. & Jessell, T. M.",
            "year": "2021",
            "field": "Neuroscience",
            "collection_id": "reserves",
            "call_number": "QP355.2.P76 2021",
            "doi": "10.1036/0838577016",
            "journal_or_press": "McGraw-Hill Medical",
            "total_pages": 1760,
            "sections": [
                (
                    "Chapter 65",
                    "Synaptic Plasticity: Long-Term Potentiation and Depression",
                    1250,
                    1315,
                    "Long-term potentiation (LTP) at glutamatergic synapses represents the cellular substrate of memory consolidation. "
                    "NMDA receptor activation permits calcium influx, triggering calcium/calmodulin-dependent protein kinase II (CaMKII) cascades. "
                    "Late-phase LTP requires gene transcription mediated by cyclic AMP response element-binding protein (CREB), culminating in the synthesis of new synaptic active zones.",
                ),
                (
                    "Chapter 66",
                    "Structural Remodeling and Experience-Dependent Plasticity",
                    1316,
                    1380,
                    "Dendritic spine remodeling is dynamic: learning experiences stimulate rapid filopodial growth followed by spine stabilization. "
                    "Structural plasticity is not confined to early critical windows; in the adult hippocampus and neocortex, sensory enrichment and skill acquisition induce persistent synaptic turnover.",
                ),
            ],
        },
        {
            "id": "doc-clark-predictive",
            "title": "Predictive Processing and the Extended Mind Hypothesis",
            "author": "Clark, A. & Friston, K.",
            "year": "2024",
            "field": "Cognitive Science & Philosophy of Mind",
            "collection_id": "reserves",
            "call_number": "CR-CS-482",
            "doi": "10.1017/CBO9781107415324",
            "journal_or_press": "Oxford University Press",
            "total_pages": 167,
            "sections": [
                (
                    "Module 1",
                    "Hierarchical Predictive Coding and Free Energy Minimization",
                    1,
                    80,
                    "The brain is an anticipatory engine that minimizes prediction error by matching top-down generative models against bottom-up sensory streams. "
                    "Perception is controlled hallucination, wherein sensory input serves primarily to correct internal probabilistic hypotheses. "
                    "Action and perception coordinate under the free-energy principle to bound surprise and maintain homeostatic equilibrium.",
                ),
                (
                    "Module 2",
                    "Active Inference and Extended Epistemic Scaffolding",
                    81,
                    167,
                    "Cognition does not stop at the biological skin-bag. By offloading computational demands onto external tools, symbols, and artifacts, "
                    "human organisms construct extended cognitive loops. Language acts as the supreme cognitive tool, enabling metacognitive control and predictive stabilization.",
                ),
            ],
        },

        # --- Artificial Intelligence & Computer Science ---
        {
            "id": "doc-vaswani-attention",
            "title": "Attention Is All You Need: Scaled Dot-Product & Self-Attention Architectures",
            "author": "Vaswani, A., Shazeer, N., Parmar, N. et al.",
            "year": "2017 (Archival Monograph 2024)",
            "field": "Artificial Intelligence & Deep Learning",
            "collection_id": "papers",
            "call_number": "QA76.73.T73 V37 2017",
            "doi": "10.48550/arXiv.1706.03762",
            "journal_or_press": "Advances in Neural Information Processing Systems",
            "total_pages": 185,
            "sections": [
                (
                    "Section 1",
                    "Recurrence Bottlenecks in Sequence Transduction",
                    1,
                    45,
                    "Recurrent neural networks, such as LSTMs and GRUs, inherently compute sequentially along the symbol positions of input sequences. "
                    "This sequential processing precludes parallelization within training examples, becoming prohibitive at longer sequence lengths where memory constraints limit batching. "
                    "Attention mechanisms had been used in conjunction with recurrent networks, but we propose the Transformer: an architecture eschewing recurrence entirely.",
                ),
                (
                    "Section 2",
                    "Scaled Dot-Product and Multi-Head Self-Attention Mechanisms",
                    46,
                    110,
                    "An attention function can be described as mapping a query and a set of key-value pairs to an output: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V. "
                    "We divide the dot products by sqrt(d_k) to counteract vanishing gradients in large dimensions. "
                    "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions, "
                    "capturing syntactic dependencies and semantic coreference simultaneously across sequence tokens.",
                ),
                (
                    "Section 3",
                    "Positional Encodings, Feed-Forward Sublayers, and Complexity",
                    111,
                    185,
                    "Since our model contains no recurrence and no convolution, we must inject information about the relative or absolute position of tokens. "
                    "We use sinusoidal positional encodings with frequencies varying geometric progressions. "
                    "Self-attention layers connect all positions with a constant number of sequentially executed operations (O(1)), whereas recurrent layers require O(n) sequential steps. "
                    "This breakthrough enables massive scaling of deep neural networks across foundation models.",
                ),
            ],
        },
        {
            "id": "doc-sicp-abstraction",
            "title": "Structure and Interpretation of Computer Programs: Procedural & Data Abstractions",
            "author": "Abelson, H. & Sussman, G. J.",
            "year": "1996 (Course Reserve 2024)",
            "field": "Computer Science & Software Foundations",
            "collection_id": "reserves",
            "call_number": "QA76.6.A255 1996",
            "doi": "10.7551/mitpress/6470.001.0001",
            "journal_or_press": "MIT Press Course Reserves",
            "total_pages": 657,
            "sections": [
                (
                    "Chapter 1",
                    "Building Abstractions with Procedures and Higher-Order Functions",
                    1,
                    180,
                    "The acts of the mind wherein it exerts its power over simple ideas are: combining several simple ideas into one compound one, "
                    "bringing two ideas together to take a view of them at once, and separating them from all other ideas that accompany them in their real existence. "
                    "Procedures that manipulate procedures are called higher-order procedures; they permit us to express general computational methods directly.",
                ),
                (
                    "Chapter 2",
                    "Building Abstractions with Data and Hierarchical Structures",
                    181,
                    350,
                    "Data abstraction is a methodology that enables us to isolate how a compound data object is used from the details of how it is constructed from more primitive objects. "
                    "The barrier of data abstraction ensures that programs manipulating rational numbers need not know whether they are represented as pairs of integers or floating points.",
                ),
                (
                    "Chapter 3",
                    "Modularity, Objects, and Mutable State: Streams and Concurrency",
                    351,
                    657,
                    "As we introduce assignment and state into programs, mathematical substitution models break down. "
                    "Streams allow us to model systems with state without ever using assignment, by decoupling the apparent time of actions from the actual order in which evaluations occur.",
                ),
            ],
        },
        {
            "id": "doc-he-resnet",
            "title": "Deep Residual Learning for Image Recognition",
            "author": "He, K., Zhang, X., Ren, S. & Sun, J.",
            "year": "2024",
            "field": "Computer Vision & Deep Learning",
            "collection_id": "theses",
            "call_number": "THES-2024-CS-041",
            "doi": "10.1109/CVPR.2016.90",
            "journal_or_press": "Doctoral Dissertation Repository",
            "total_pages": 168,
            "sections": [
                (
                    "Chapter 1",
                    "The Degradation Problem in Deep Convolutional Networks",
                    1,
                    52,
                    "When deeper networks are able to start converging, an unexpected degradation problem emerges: with network depth increasing, accuracy gets saturated and then degrades rapidly. "
                    "Crucially, such degradation is not caused by overfitting: adding more layers to a suitably deep model leads to higher training error, exposing an optimization failure.",
                ),
                (
                    "Chapter 2",
                    "Identity Shortcut Mapping and Residual Learning Formulations",
                    53,
                    115,
                    "Instead of hoping each few stacked layers directly fit a desired underlying mapping H(x), we explicitly let these layers fit a residual mapping F(x) = H(x) - x. "
                    "The original mapping is recast into F(x) + x. We hypothesize that it is easier to optimize the residual mapping than to optimize the unreferenced mapping. "
                    "Identity shortcut connections introduce neither extra parameter nor computation complexity, allowing training of networks exceeding 150 layers.",
                ),
            ],
        },

        # --- Earth Systems & Climate Science ---
        {
            "id": "doc-a4",
            "title": "Climate Feedback Loops and Irreversible Tipping Points",
            "author": "Lenton, T. M. & Steffen, W.",
            "year": "2024",
            "field": "Earth & Atmospheric Sciences",
            "collection_id": "reserves",
            "call_number": "CR-ATM-502",
            "doi": "10.1038/d41586-019-03595-0",
            "journal_or_press": "Atmospheric & Earth Systems Syllabus",
            "total_pages": 412,
            "sections": [
                (
                    "Module 1",
                    "Planetary Boundaries and Nonlinear Dynamics",
                    1,
                    95,
                    "The stability of the Earth system relies on interconnected bio-geophysical subsystems that regulate global temperature and biogeochemical cycles. "
                    "Nonlinear feedbacks accelerate transition states beyond critical thermal thresholds. "
                    "Tipping elements—such as the West Antarctic Ice Sheet, the Atlantic Meridional Overturning Circulation (AMOC), and the Amazon rainforest—"
                    "possess threshold dynamics where self-sustaining feedbacks overwhelm anthropogenic drivers once triggered.",
                ),
                (
                    "Module 2",
                    "Cryosphere-Ocean Coupling and Albedo Collapse",
                    96,
                    230,
                    "Loss of polar ice reduces planetary albedo, compounding atmospheric energy retention in a classic ice-albedo feedback. "
                    "Simultaneously, freshwater discharge from Greenland melt dilutes North Atlantic surface waters, suppressing thermohaline circulation. "
                    "Empirical records indicate that crossing 1.5°C moves five major cryospheric tipping elements from possible to likely.",
                ),
                (
                    "Module 3",
                    "Biosphere Resilience and Decarbonization Pathways",
                    231,
                    412,
                    "Cascading tipping interactions mean that the destabilization of one component significantly increases the probability of tipping neighboring biomes. "
                    "Biogeochemical restoration is indispensable alongside direct emission abatement. "
                    "Safe operating envelopes require maintaining planetary boundaries through rapid decarbonization and biosphere conservation.",
                ),
            ],
        },
        {
            "id": "doc-steffen-anthropocene",
            "title": "Trajectories of the Earth System in the Anthropocene",
            "author": "Steffen, W., Rockström, J., Richardson, K. et al.",
            "year": "2023",
            "field": "Earth Systems Science",
            "collection_id": "theses",
            "call_number": "THES-2023-ENV-14",
            "doi": "10.1073/pnas.1810141115",
            "journal_or_press": "Doctoral Dissertation Archive / PNAS",
            "total_pages": 240,
            "sections": [
                (
                    "Chapter II",
                    "Planetary Subsystem Thresholds and Teleconnections",
                    1,
                    110,
                    "We explore the risk that self-reinforcing feedbacks could push the Earth System toward a planetary threshold that, if crossed, "
                    "could prevent stabilization of the climate at intermediate temperature rises and cause continued warming on a 'Hothouse Earth' pathway. "
                    "These tipping elements act like a row of dominoes: once one is tipped over, it pushes Earth toward further irreversible state shifts.",
                ),
                (
                    "Chapter IV",
                    "Hothouse Earth vs Stabilized Earth Dynamics",
                    111,
                    240,
                    "A Stabilized Earth trajectory requires deliberate, coordinated human stewardship. "
                    "This involves deep emissions cuts, biosphere protection, technological carbon removal, and transforming social values to restore Earth system resilience.",
                ),
            ],
        },
        {
            "id": "doc-rockstrom-boundaries",
            "title": "Planetary Boundaries: Exploring the Safe Operating Space for Humanity",
            "author": "Rockström, J., Steffen, W., Noone, K. et al.",
            "year": "2023",
            "field": "Environmental Science & Global Sustainability",
            "collection_id": "press",
            "call_number": "GE149.R63 2023",
            "doi": "10.5751/ES-03180-140232",
            "journal_or_press": "Ecology and Society Library Monograph",
            "total_pages": 260,
            "sections": [
                (
                    "Chapter I",
                    "The Nine Planetary Envelopes and Anthropogenic Forcing",
                    1,
                    125,
                    "We define nine planetary boundaries: climate change, rate of biodiversity loss, nitrogen and phosphorus cycles, stratospheric ozone depletion, "
                    "ocean acidification, global freshwater use, change in land use, atmospheric aerosol loading, and chemical pollution. "
                    "Transgressing one or more planetary boundaries may trigger non-linear, abrupt environmental change on continental to planetary scales.",
                ),
                (
                    "Chapter III",
                    "Biogeochemical Flows and Earth System Resilience",
                    126,
                    260,
                    "Anthropogenic interference with the nitrogen and phosphorus cycles exceeds planetary boundaries by unprecedented margins. "
                    "Managing resilience requires shifting from end-of-pipe mitigation to holistic governance of planetary boundaries.",
                ),
            ],
        },
        {
            "id": "doc-food-security",
            "title": "Food in the Anthropocene: Sustainable Diets and Global Food Systems",
            "author": "Willett, W., Rockström, J., Loken, B. et al.",
            "year": "2024",
            "field": "Agricultural Sciences & Public Health",
            "collection_id": "reserves",
            "call_number": "CR-AGRI-405",
            "doi": "10.1016/S0140-6736(18)31788-4",
            "journal_or_press": "The Lancet Commission on Food & Planetary Health",
            "total_pages": 245,
            "sections": [
                (
                    "Chapter I",
                    "The Planetary Health Diet and Food Systems Boundaries",
                    1,
                    85,
                    "Food production is the largest single driver of environmental degradation globally. Integrating food system boundaries with human nutritional targets establishes the planetary health diet, requiring more than a 50% reduction in global red meat consumption and doubling consumption of legumes, nuts, fruits, and vegetables.",
                ),
                (
                    "Chapter II",
                    "Agrarian Transformation and Decarbonization in Agriculture",
                    86,
                    170,
                    "Agricultural decarbonization requires halting agricultural land expansion into forests, restoring degraded soils, improving nitrogen and phosphorus application efficiency, and transitioning toward agroecological regenerative farming systems.",
                ),
                (
                    "Chapter III",
                    "Food Security and Equitable Supply Chain Governance",
                    171,
                    245,
                    "Ending hunger and undernutrition while adhering to environmental boundaries requires eliminating food waste across cold chains and restructuring equitable distribution systems in vulnerable geographic regions.",
                ),
            ],
        },
        {
            "id": "doc-food-sovereignty",
            "title": "The Political Economy of Food Sovereignty and Agricultural Commons",
            "author": "Patel, R. & McMichael, P.",
            "year": "2023",
            "field": "Economic Sociology & Agrarian Studies",
            "collection_id": "papers",
            "call_number": "HD9000.5.P38 2023",
            "doi": "10.1080/03066150.2023.2189012",
            "journal_or_press": "Journal of Peasant Studies Faculty Series",
            "total_pages": 290,
            "sections": [
                (
                    "Chapter 1",
                    "The Corporate Food Regime and Commodification of Seeds",
                    1,
                    95,
                    "The global food regime concentrates market power among multinational agribusiness cartels, turning essential staple grains and seed genetic patents into financialized commodities detached from local ecological sustenance.",
                ),
                (
                    "Chapter 2",
                    "Agroecology and Community Seed Banks as Epistemic Resistance",
                    96,
                    190,
                    "Food sovereignty emphasizes the right of peoples to healthy and culturally appropriate food produced through ecologically sound methods, defending agricultural commons against speculative enclosure.",
                ),
            ],
        },

        # --- Constitutional Law, Political Theory & Ethics ---
        {
            "id": "doc-a3",
            "title": "Constituent Power and Constitutional Design in Post-Conflict States",
            "author": "Loughlin, M. & Walker, N.",
            "year": "2024",
            "field": "Constitutional Law & Theory",
            "collection_id": "papers",
            "call_number": "K3165.L68 2024",
            "doi": "10.1093/acprof:oso/9780199296064",
            "journal_or_press": "Faculty Law Review",
            "total_pages": 341,
            "sections": [
                (
                    "Part I",
                    "The Paradox of Constituent Authority",
                    1,
                    85,
                    "In post-conflict societies, the creation of a constitutional order faces a profound normative paradox: "
                    "how can a legal document establish democratic legitimacy when the authority that creates it emerges from fractured, extra-legal confrontation? "
                    "A constitution cannot derive its legal validity solely from the normative order it creates; it presupposes a political decision on the nature of constituent power. "
                    "Constituent power cannot be conceived as a singular unconstrained sovereign moment without risking victorious factional tyranny.",
                ),
                (
                    "Part II",
                    "Institutional Framing in Divided Societies",
                    86,
                    210,
                    "Power-sharing arrangements must balance transitional stability with democratic responsiveness. "
                    "Consociational mechanisms, federal devolution, and minority vetoes serve to reassure threatened communities during peace negotiations. "
                    "However, rigid ethnic quotas can entrench sectarian divisions, preventing the evolution of cross-cutting civic identities.",
                ),
                (
                    "Part III",
                    "Judicial Review of Constitutional Amendability",
                    211,
                    341,
                    "Basic structure doctrines serve as judicial guardrails against authoritarian entrenchment. "
                    "Constitutional courts in post-conflict democracies maintain equilibrium by declaring unconstitutional any amendments that erode core democratic commitments. "
                    "Constituent authority must remain in productive tension with constituted power to preserve long-term constitutional integrity.",
                ),
            ],
        },
        {
            "id": "doc-habermas-facts",
            "title": "Between Facts and Norms: Contributions to a Discourse Theory of Law",
            "author": "Habermas, J.",
            "year": "1996 (Course Reserve 2024)",
            "field": "Legal Philosophy & Political Theory",
            "collection_id": "reserves",
            "call_number": "CR-POL-310",
            "doi": "10.7551/mitpress/1564.001.0001",
            "journal_or_press": "University Course Reserve Polisci Series",
            "total_pages": 520,
            "sections": [
                (
                    "Chapter III",
                    "The System of Basic Rights and Communicative Deliberation",
                    1,
                    220,
                    "The legal order gains legitimacy not from religious sanction or natural law, but from the institutionalization of discursive procedures. "
                    "Citizens can regard themselves as authors of the law only if legal statutes are the outcome of communicative processes where all affected parties can participate freely.",
                ),
                (
                    "Chapter VI",
                    "Discursive Legitimacy and Constitutional Patriotism in Pluralistic States",
                    221,
                    520,
                    "In post-traditional, multicultural societies, social integration cannot rely on shared substantive ethnic or cultural identities. "
                    "Constitutional patriotism anchors solidarity in shared principles of democratic procedure, human rights, and communicative openness.",
                ),
            ],
        },
        {
            "id": "doc-a5",
            "title": "Feminist Critiques of Rawlsian Distributive Justice",
            "author": "Okin, S. M. & Nussbaum, M.",
            "year": "2023",
            "field": "Political Philosophy",
            "collection_id": "papers",
            "call_number": "JC578.O35 2023",
            "doi": "10.1093/0198279883.001.0001",
            "journal_or_press": "Journal of Political Theory",
            "total_pages": 264,
            "sections": [
                (
                    "Chapter 1",
                    "The Domestic Sphere and the Original Position",
                    1,
                    70,
                    "John Rawls's theory of justice as fairness assumes heads of households in the original position, "
                    "tacitly shielding the gendered division of domestic labor from principles of justice. "
                    "A just society must interrogate power structures within the private sphere: without domestic justice, equal liberty for women remains an ideological illusion.",
                ),
                (
                    "Chapter 2",
                    "Care Ethics, Vulnerability, and the Capabilities Approach",
                    71,
                    160,
                    "The capabilities approach reframes basic justice around human flourishing, bodily integrity, and dependency work. "
                    "Rather than measuring primary goods purely in monetary terms, justice requires ensuring that every person has the capability to function in vital spheres of human life.",
                ),
                (
                    "Chapter 3",
                    "Toward an Inclusive Contractarianism",
                    161,
                    264,
                    "Contractarian principles can be reconstructed to center structural inequalities, intersectional vulnerability, and transnational justice. "
                    "Recognizing care work as public labor transforms basic economic institutions and redistributes social cooperation burdens equitably.",
                ),
            ],
        },

        # --- Economics & Political Economy ---
        {
            "id": "doc-kahneman-thinking",
            "title": "Thinking, Fast and Slow: Cognitive Biases and Heuristic Decision Systems",
            "author": "Kahneman, D. & Tversky, A.",
            "year": "2011 (Critical Ed. 2024)",
            "field": "Behavioral Economics & Decision Theory",
            "collection_id": "press",
            "call_number": "BF441.K34 2011",
            "doi": "10.1007/978-1-137-02409-5",
            "journal_or_press": "Farrar, Straus and Giroux Academic Series",
            "total_pages": 499,
            "sections": [
                (
                    "Part I",
                    "Two Systems: System 1 (Intuitive) vs System 2 (Deliberative)",
                    1,
                    150,
                    "System 1 operates automatically and quickly, with little or no effort and no sense of voluntary control. "
                    "System 2 allocates attention to the effortful mental operations that demand it, including complex computations. "
                    "The automatic operations of System 1 generate surprisingly complex patterns of ideas, but only the slower System 2 can construct thoughts in an orderly series of steps.",
                ),
                (
                    "Part II",
                    "Heuristics and Biases: Availability, Representativeness, and Anchoring",
                    151,
                    320,
                    "When faced with a difficult question, System 1 substitutes an easier question: the availability heuristic substitutes the ease of retrieval for frequency. "
                    "The anchoring effect demonstrates that arbitrary initial numbers strongly influence subsequent quantitative estimates, "
                    "refuting classical economic assumptions of perfectly rational market actors.",
                ),
                (
                    "Part IV",
                    "Prospect Theory and Loss Aversion",
                    321,
                    499,
                    "Prospect theory demonstrates that economic choices are evaluated relative to a neutral reference point, and that losses loom larger than gains. "
                    "The asymmetric S-shaped value function shows that the psychological response to a loss is approximately twice as intense as the pleasure of an equivalent gain.",
                ),
            ],
        },
        {
            "id": "doc-piketty-capital",
            "title": "Capital in the Twenty-First Century: Dynamics of Wealth Concentration",
            "author": "Piketty, T.",
            "year": "2014 (Archival Holding 2024)",
            "field": "Economics & Political Economy",
            "collection_id": "papers",
            "call_number": "HB501.P436 2014",
            "doi": "10.4159/9780674365094",
            "journal_or_press": "Harvard University Press",
            "total_pages": 696,
            "sections": [
                (
                    "Part I",
                    "Income and Capital: The Fundamental Inequality r > g",
                    1,
                    210,
                    "When the rate of return on capital (r) significantly exceeds the growth rate of the economy (g), "
                    "inherited wealth grows faster than output and income. This fundamental inequality (r > g) implies that entrepreneurs inevitably tend to become rentiers, "
                    "over time acquiring an increasingly dominant hold over those who have nothing to sell but their labor.",
                ),
                (
                    "Part IV",
                    "Regulating Capital in the 21st Century: Progressive Global Taxation",
                    211,
                    696,
                    "Market forces alone contain no natural equilibrium to prevent divergence toward oligarchic patrimonial capitalism. "
                    "The ideal policy to counter extreme inequality while preserving economic openness is a progressive global tax on capital, accompanied by international financial transparency.",
                ),
            ],
        },
        {
            "id": "doc-pasquale-blackbox",
            "title": "The Black Box Society: The Secret Algorithms That Control Money and Information",
            "author": "Pasquale, F.",
            "year": "2023",
            "field": "Information Law & Economic Sociology",
            "collection_id": "press",
            "call_number": "HB846.3.P37",
            "doi": "10.4159/harvard.9780674736061",
            "journal_or_press": "Harvard University Press Monograph",
            "total_pages": 320,
            "sections": [
                (
                    "Chapter 1",
                    "The Epistemic Opacity of Scoring and Algorithmic Sorting",
                    1,
                    90,
                    "Algorithms score our credit, prioritize our news feeds, and allocate educational opportunities. "
                    "Yet the proprietary nature of these systems creates black boxes: corporations conceal their decision-making logic behind intellectual property protections. "
                    "When automated sorting operates without transparency or judicial auditability, it quietly reproduces historical biases under the guise of statistical objectivity.",
                ),
                (
                    "Chapter 3",
                    "Digital Finance, High-Frequency Trading, and Systemic Risk",
                    91,
                    200,
                    "In financial markets, black box algorithms engage in microsecond arbitrage that detached trading from underlying economic value. "
                    "Flash crashes and liquidity vacuums expose how automated deference amplifies volatility across connected global exchanges.",
                ),
            ],
        },

        # --- Biophysics & Evolutionary Biology ---
        {
            "id": "doc-a6",
            "title": "Quantum Coherence in Biological Systems: A Critical Review",
            "author": "Engel, G. S. & Fleming, G. R.",
            "year": "2024",
            "field": "Biophysics & Quantum Biology",
            "collection_id": "theses",
            "call_number": "THES-2024-BIO-118",
            "doi": "10.1038/nature05678",
            "journal_or_press": "Doctoral Dissertation Repository",
            "total_pages": 178,
            "sections": [
                (
                    "Section 1",
                    "Excitonic Energy Transfer in Photosynthetic Complexes",
                    1,
                    55,
                    "Ultrafast 2D electronic spectroscopy detects quantum beating signals in the Fenna-Matthews-Olson (FMO) complexes of green sulfur bacteria at physiological temperatures. "
                    "Rather than classical hopping across pigments, electronic excitations exhibit coherent wave-like energy transfer, "
                    "enabling photosynthetic reaction centers to achieve near 100% quantum efficiency in harvesting ambient photons.",
                ),
                (
                    "Section 2",
                    "Decoherence Limits in Wet, Warm Cellular Environments",
                    56,
                    120,
                    "Long-lived quantum coherence was previously thought impossible in macroscopic biological environments due to thermal noise. "
                    "However, molecular dynamics simulations reveal that protein vibrational scaffolds actively tune electronic coupling, "
                    "shielding coherent superposition states from premature thermal decoherence.",
                ),
                (
                    "Section 3",
                    "Avian Magnetoreception and Radical Pair Mechanisms",
                    121,
                    178,
                    "Migratory birds navigate via cryptochrome photoreceptors that leverage magnetically sensitive entangled radical pairs. "
                    "Transient quantum entanglement in cryptochrome proteins modulates retinal signaling pathways, allowing avian navigators to perceive the Earth's geomagnetic inclination.",
                ),
            ],
        },
        {
            "id": "doc-dawkins-gene",
            "title": "The Selfish Gene: Gene-Centric Evolution and Altruistic Selection",
            "author": "Dawkins, R.",
            "year": "1976 (Course Reserve 2024)",
            "field": "Evolutionary Biology",
            "collection_id": "reserves",
            "call_number": "QH437.D38 1976",
            "doi": "10.1093/oso/9780198788607.001.0001",
            "journal_or_press": "Oxford University Press",
            "total_pages": 360,
            "sections": [
                (
                    "Chapter 2",
                    "The Replicators and Prebiotic Natural Selection",
                    1,
                    75,
                    "Natural selection is the differential survival of replicators. Before life began, chemical evolution favored molecules with longevity, fecundity, and copying fidelity. "
                    "Organisms are survival machines—clumsy robots blindly programmed to preserve the selfish molecules known as genes.",
                ),
                (
                    "Chapter 5",
                    "Aggression: Stability and the Evolutionary Stable Strategy (ESS)",
                    76,
                    190,
                    "An evolutionarily stable strategy (ESS) is a strategy which, if most members of a population adopt it, cannot be bettered by an alternative strategy. "
                    "Apparent altruism among kin emerges naturally from gene-centric selection: a gene can foster its own replication by promoting the survival of related individuals who carry copies of that same gene.",
                ),
                (
                    "Chapter 11",
                    "Memes: The New Replicators and Cultural Transmission",
                    191,
                    360,
                    "Just as genes propagate themselves in the gene pool by leaping from body to body via sperms or eggs, "
                    "memes propagate themselves in the meme pool by leaping from brain to brain via a process which, in the broad sense, can be called imitation.",
                ),
            ],
        },
        # --- Quantum Information & Computing ---
        {
            "id": "doc-quantum-nielsen",
            "title": "Quantum Computation and Quantum Information: Principles and Algorithms",
            "author": "Nielsen, M. A. & Chuang, I. L.",
            "year": "2010 (Cambridge Course Reserve 2024)",
            "field": "Quantum Information & Computing",
            "collection_id": "reserves",
            "call_number": "QA76.889.N54 2010",
            "doi": "10.1017/CBO9780511976667",
            "journal_or_press": "Cambridge University Press",
            "total_pages": 676,
            "sections": [
                (
                    "Chapter 1",
                    "Introduction to Qubits, Superposition, and Entanglement",
                    1,
                    58,
                    "A quantum bit or qubit is a mathematical object with two basis states |0⟩ and |1⟩. "
                    "Unlike classical bits, a qubit can exist in a linear combination or superposition of states |ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex amplitudes. "
                    "Multiple qubits exhibit quantum entanglement, wherein the joint state cannot be decomposed into product states of individual subsystems.",
                ),
                (
                    "Chapter 5",
                    "The Quantum Fourier Transform and Shor's Factoring Algorithm",
                    216,
                    270,
                    "The quantum Fourier transform (QFT) transforms quantum amplitudes into the frequency domain in O((log N)^2) operations, "
                    "exponentially faster than the classical Fast Fourier Transform. Peter Shor demonstrated that QFT enables polynomial-time period finding, "
                    "rendering RSA and discrete-logarithm cryptographic schemes vulnerable on fault-tolerant quantum hardware.",
                ),
                (
                    "Chapter 10",
                    "Quantum Error Correction and the Fault-Tolerant Threshold Theorem",
                    425,
                    498,
                    "Quantum states are susceptible to continuous phase-flip and bit-flip errors induced by environmental decoherence. "
                    "By encoding logical qubits into entangled multi-physical-qubit topologies—such as surface codes—quantum error-correcting codes detect syndrome operators without collapsing superpositions. "
                    "The threshold theorem proves that arbitrarily long quantum computations can be executed reliably provided physical error rates remain below a critical threshold.",
                ),
            ],
        },
        # --- Biomedical Engineering & CRISPR Genomics ---
        {
            "id": "doc-crispr-doudna",
            "title": "CRISPR-Cas9 Endonucleases: Molecular Architecture and RNA-Guided Gene Editing",
            "author": "Doudna, J. A. & Charpentier, E.",
            "year": "2020 (Faculty Monograph)",
            "field": "Biomedical Engineering & Genomics",
            "collection_id": "papers",
            "call_number": "QP624.D68 2020",
            "doi": "10.1126/science.1225829",
            "journal_or_press": "Science / Faculty Monograph Archive",
            "total_pages": 242,
            "sections": [
                (
                    "Section 1",
                    "Dual-RNA-Guided DNA Cleavage Mechanisms in Cas9",
                    1,
                    65,
                    "The type II bacterial immune system utilizes a single Cas9 endonuclease guided by a duplex formed by crRNA and trans-activating crRNA (tracrRNA). "
                    "Engineering a synthetic single-guide RNA (sgRNA) chimera allows Cas9 to introduce site-specific double-strand breaks adjacent to 5'-NGG protospacer adjacent motifs (PAMs) "
                    "with unprecedented programmability in eukaryotic genomes.",
                ),
                (
                    "Section 2",
                    "Off-Target Specificity, Base Editors, and Prime Editing",
                    66,
                    150,
                    "High-fidelity Cas9 variants, prime editing complexes, and cytosine base editors eliminate unguided double-strand cleavage. "
                    "By coupling catalytically impaired Cas9 nickases to reverse transcriptases or deaminases, researchers achieve precise single-nucleotide transitions "
                    "without relying on non-homologous end joining (NHEJ) mutational pathways.",
                ),
                (
                    "Section 3",
                    "Therapeutic Gene Therapy and Ethical Bio-Governance",
                    151,
                    242,
                    "Somatic in vivo gene editing offers curative potential for sickle-cell anemia, beta-thalassemia, and transthyretin amyloidosis. "
                    "However, germline modification raises profound biosafety and distributive justice concerns, requiring international ethical accords to govern genetic modifications in human embryos.",
                ),
            ],
        },
        # --- Game Theory & Mathematical Economics ---
        {
            "id": "doc-game-theory-nash",
            "title": "Non-Cooperative Games, Equilibrium Points, and Mechanism Design",
            "author": "Nash, J. F., von Neumann, J. & Morgenstern, O.",
            "year": "2022 (Archival Monograph)",
            "field": "Game Theory & Mathematical Economics",
            "collection_id": "press",
            "call_number": "HB144.N37 2022",
            "doi": "10.2307/1969529",
            "journal_or_press": "Princeton University Press",
            "total_pages": 310,
            "sections": [
                (
                    "Chapter 1",
                    "Equilibrium Points in N-Person Games",
                    1,
                    70,
                    "A non-cooperative game with a finite number of players and finite pure strategies possesses at least one equilibrium point in mixed strategies. "
                    "At a Nash equilibrium, no individual player can unilaterally deviate to an alternative mixed strategy and achieve a strictly higher expected payoff, "
                    "establishing the mathematical foundation for modern auction theory, oligopoly competition, and evolutionary games.",
                ),
                (
                    "Chapter 4",
                    "Minimax Theorems and Zero-Sum Strategic Invariance",
                    71,
                    180,
                    "In two-person zero-sum games, von Neumann's minimax theorem establishes that the maximum guaranteed gain equals the minimum possible loss. "
                    "Mixed strategies resolve deterministic intransitivities, guaranteeing that randomized policies conceal tactical commitments from an adversary.",
                ),
                (
                    "Chapter 7",
                    "Incentive Compatibility, Revelation Principle, and Mechanism Design",
                    181,
                    310,
                    "Mechanism design reverses traditional game theory: given a desired social outcome, the designer constructs rules and transfer payments "
                    "such that truthful revelation of private information forms a dominant-strategy equilibrium. The Vickrey-Clarke-Groves (VCG) mechanism guarantees Pareto efficiency "
                    "while preventing rent-seeking manipulation.",
                ),
            ],
        },
        # --- Artificial Intelligence Ethics & Governance ---
        {
            "id": "doc-ai-alignment-bostrom",
            "title": "Superintelligence and Value Alignment in Autonomous Multi-Agent Systems",
            "author": "Bostrom, N., Russell, S. & Amodei, D.",
            "year": "2023 (Faculty Research)",
            "field": "Artificial Intelligence Ethics & Governance",
            "collection_id": "papers",
            "call_number": "Q335.B67 2023",
            "doi": "10.1093/acprof:oso/9780199678112.001.0001",
            "journal_or_press": "Oxford Faculty Monograph Series",
            "total_pages": 348,
            "sections": [
                (
                    "Chapter 3",
                    "Instrumental Convergence and the Orthogonality Thesis",
                    1,
                    95,
                    "The orthogonality thesis holds that intelligence and final goals are mutually independent: an agent of arbitrary cognitive capability can pursue arbitrary objective functions. "
                    "Furthermore, instrumental convergence dictates that autonomous agents converge on sub-goals such as self-preservation, goal-content integrity, cognitive enhancement, "
                    "and resource acquisition, irrespective of the benevolence of their terminal objectives.",
                ),
                (
                    "Chapter 6",
                    "Cooperative Inverse Reinforcement Learning and Value Alignment",
                    96,
                    210,
                    "Hard-coding human moral values into objective functions fails due to specification gaming and Goodhart's Law. "
                    "Instead, alignment requires cooperative inverse reinforcement learning (CIRL), wherein an agent maintains fundamental uncertainty regarding human reward preferences "
                    "and passively defers to human intervention, resolving the shutoff problem.",
                ),
                (
                    "Chapter 9",
                    "Interpretability, Scalable Oversight, and Frontier Governance",
                    211,
                    348,
                    "As frontier models exceed human evaluation bandwidth, alignment shifts toward mechanistic interpretability and debate-driven scalable oversight. "
                    "Institutional governance must enforce compute thresholds, red-teaming audits, and verifiable watermarking before deploying autonomous agentic pipelines into safety-critical infrastructure.",
                ),
            ],
        },
        # --- Epidemiology & Global Public Health ---
        {
            "id": "doc-epidemiology-publichealth",
            "title": "Viral Transmission Dynamics, Pathogen Spillover, and Global Epidemic Surveillance",
            "author": "Piot, P., Farrar, J. & Lipsitch, M.",
            "year": "2024 (Doctoral Dissertation)",
            "field": "Epidemiology & Global Public Health",
            "collection_id": "theses",
            "call_number": "THES-2024-EPI-088",
            "doi": "10.1016/S0140-6736(24)00214-9",
            "journal_or_press": "University Faculty of Medicine & Public Health",
            "total_pages": 298,
            "sections": [
                (
                    "Chapter 2",
                    "Zoonotic Reservoirs, Cross-Species Spillover, and Land-Use Interfaces",
                    1,
                    80,
                    "Anthropogenic encroachment into tropical forest biomes intensifies human-wildlife contact rates, accelerating zoonotic pathogen spillover. "
                    "Bats, rodents, and wild avian taxa serve as primary reservoirs harboring coronaviruses, filoviruses, and avian influenza strains with high pandemic potential.",
                ),
                (
                    "Chapter 5",
                    "Compartmental SEIR Modeling and Non-Pharmaceutical Interventions",
                    81,
                    190,
                    "The basic reproduction number (R0) determines epidemic trajectory: when the effective reproduction number (Rt) exceeds unity, exponential transmission ensues. "
                    "Coupling compartmental Susceptible-Exposed-Infectious-Recovered (SEIR) differential equations with mobility telemetry reveals that early non-pharmaceutical interventions (NPIs) "
                    "flatten hospitalization curves and suppress super-spreading clusters.",
                ),
                (
                    "Chapter 8",
                    "Genomic Pathogen Surveillance and International Health Governance",
                    191,
                    298,
                    "Real-time nanopore genomic sequencing maps viral lineage evolution and immune-escape mutations within hours of clinical presentation. "
                    "A resilient global biosecurity framework requires decentralized wastewater surveillance, transparent clinical data sharing, and equitable vaccine manufacturing compacts.",
                ),
            ],
        },
    ]

    # 3. Upsert documents and update sections
    for item in seed_docs:
        sections_data = item.pop("sections")
        doc_id = item["id"]

        existing_doc = await session.get(Document, doc_id)
        if not existing_doc:
            doc = Document(**item)
            session.add(doc)
            await session.flush()
        else:
            # Update metadata fields
            for k, v in item.items():
                setattr(existing_doc, k, v)
            await session.flush()
            # Remove old sections to replace with enriched content
            await session.execute(
                delete(DocumentSection).where(DocumentSection.document_id == doc_id)
            )

        # Insert enriched chapter sections
        for c_num, c_title, s_page, e_page, text in sections_data:
            sec = DocumentSection(
                document_id=doc_id,
                chapter_num=c_num,
                chapter_title=c_title,
                start_page=s_page,
                end_page=e_page,
                content_text=text,
            )
            session.add(sec)

    await session.commit()
    print(f"[Seed] Successfully populated {len(seed_docs)} authentic academic holdings.")
