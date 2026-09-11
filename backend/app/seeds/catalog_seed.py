from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.collection import Collection
from ..models.document import Document
from ..models.document_section import DocumentSection

async def seed_initial_catalog(session: AsyncSession):
    """Pre-seed collections and foundational university library holdings if not already present."""
    existing_colls = await session.execute(select(Collection))
    if existing_colls.scalars().first():
        return

    # 1. Create collections
    colls = [
        Collection(id="papers", name="Faculty Research", description="Peer-reviewed research articles and faculty monographs."),
        Collection(id="theses", name="Doctoral Theses", description="Doctoral dissertations and graduate theses approved by academic departments."),
        Collection(id="reserves", name="Course Reserves", description="Curated textbook reserves, reading packs, and course syllabi."),
        Collection(id="press", name="University Press", description="Scholarly editions and publications by university academic presses."),
    ]
    session.add_all(colls)
    await session.flush()

    # 2. Seed initial catalog documents with chapter sections
    seed_docs = [
        {
            "id": "doc-a1",
            "title": "The Epistemology of Scientific Consensus Formation",
            "author": "Kuhn, T. S. & Feyerabend, P.",
            "year": "2024 (Critical Ed.)",
            "field": "Philosophy of Science",
            "collection_id": "press",
            "call_number": "Q175.K84 2024",
            "journal_or_press": "University Press Archives",
            "total_pages": 218,
            "sections": [
                ("Chapter I", "The Social Structure of Anomalies", 1, 45, "Scientific communities operate through shared paradigm commitments until anomalies destabilize institutional certainty."),
                ("Chapter II", "Incommensurability and Revolutionary Epistemology", 46, 112, "Competing frameworks often speak past one another due to distinct conceptual vocabularies."),
                ("Chapter III", "Consensus Formation in High-Stakes Inquiry", 113, 218, "Consensus is negotiated through rigorous evidentiary standards and peer critique."),
            ],
        },
        {
            "id": "doc-a2",
            "title": "Adult Neuroplasticity and Second-Language Acquisition",
            "author": "Hernandez, A. E. & Ullman, M.",
            "year": "2024",
            "field": "Cognitive Neuroscience",
            "collection_id": "theses",
            "call_number": "THES-2024-COG-092",
            "journal_or_press": "Doctoral Dissertation Repository",
            "total_pages": 194,
            "sections": [
                ("Chapter I", "Critical Period Hypotheses Re-examined", 1, 38, "Functional neuroimaging challenges early dogmas of immutable critical period terminations."),
                ("Chapter II", "Dynamic Neural Rewiring in Late Bilinguals", 39, 112, "Diffusion tensor imaging provides unequivocal evidence of white-matter tract plasticity in adult participants."),
                ("Chapter III", "Procedural vs Declarative Memory Substrates", 113, 194, "Adult learners exhibit declarative scaffolding prior to procedural consolidation."),
            ],
        },
        {
            "id": "doc-a3",
            "title": "Constituent Power and Constitutional Design in Post-Conflict States",
            "author": "Loughlin, M. & Walker, N.",
            "year": "2024",
            "field": "Constitutional Law & Theory",
            "collection_id": "papers",
            "call_number": "K3165.L68 2024",
            "journal_or_press": "Faculty Law Review",
            "total_pages": 341,
            "sections": [
                ("Part I", "The Paradox of Constituent Authority", 1, 85, "A constitution cannot derive its legal validity solely from the normative order it creates."),
                ("Part II", "Institutional Framing in Divided Societies", 86, 210, "Power-sharing arrangements must balance transitional stability with democratic responsiveness."),
                ("Part III", "Judicial Review of Constitutional Amendability", 211, 341, "Basic structure doctrines serve as judicial guardrails against authoritarian entrenchment."),
            ],
        },
        {
            "id": "doc-a4",
            "title": "Climate Feedback Loops and Irreversible Tipping Points",
            "author": "Lenton, T. M. & Steffen, W.",
            "year": "2024",
            "field": "Earth & Atmospheric Sciences",
            "collection_id": "reserves",
            "call_number": "CR-ATM-502",
            "journal_or_press": "Atmospheric & Earth Systems Syllabus",
            "total_pages": 412,
            "sections": [
                ("Module 1", "Planetary Boundaries and Nonlinear Dynamics", 1, 95, "Nonlinear feedbacks accelerate transition states beyond critical thermal thresholds."),
                ("Module 2", "Cryosphere-Ocean Coupling and Albedo Collapse", 96, 230, "Loss of polar ice reduces planetary albedo, compounding atmospheric energy retention."),
                ("Module 3", "Biosphere Resilience and Decarbonization Pathways", 231, 412, "Biogeochemical restoration is indispensable alongside direct emission abatement."),
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
            "journal_or_press": "Journal of Political Theory",
            "total_pages": 264,
            "sections": [
                ("Chapter 1", "The Domestic Sphere and the Original Position", 1, 70, "Rawlsian theories presuppose just domestic arrangements while shielding the family from scrutiny."),
                ("Chapter 2", "Care Ethics, Vulnerability, and Capability", 71, 160, "The capabilities approach reframes basic justice around human flourishing and dependency work."),
                ("Chapter 3", "Toward an Inclusive Contractarianism", 161, 264, "Contractarian principles can be reconstructed to center structural inequalities."),
            ],
        },
        {
            "id": "doc-a6",
            "title": "Quantum Coherence in Biological Systems: A Critical Review",
            "author": "Engel, G. S. & Fleming, G. R.",
            "year": "2024",
            "field": "Biophysics",
            "collection_id": "theses",
            "call_number": "THES-2024-BIO-118",
            "journal_or_press": "Doctoral Dissertation Repository",
            "total_pages": 178,
            "sections": [
                ("Section 1", "Excitonic Energy Transfer in Photosynthetic Complexes", 1, 55, "Ultrafast spectroscopy detects quantum beating signals in Fenna-Matthews-Olson complexes at physiological temperatures."),
                ("Section 2", "Decoherence Limits in Wet, Warm Cellular Environments", 56, 120, "Environmental noise coordinates with protein dynamics to protect coherence pathways."),
                ("Section 3", "Avian Magnetoreception and Radical Pair Mechanisms", 121, 178, "Cryptochrome photoreceptors leverage entangled radical pairs to sense ambient magnetic vectors."),
            ],
        },
    ]

    for item in seed_docs:
        sections_data = item.pop("sections")
        doc = Document(**item)
        session.add(doc)
        await session.flush()

        for c_num, c_title, s_page, e_page, text in sections_data:
            sec = DocumentSection(
                document_id=doc.id,
                chapter_num=c_num,
                chapter_title=c_title,
                start_page=s_page,
                end_page=e_page,
                content_text=text,
            )
            session.add(sec)

    await session.commit()
