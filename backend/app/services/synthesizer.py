import os
import re
import uuid
import json
import asyncio
import re
from typing import List, Optional, AsyncGenerator, Dict, Any, Tuple
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .hybrid_retriever import get_hybrid_retriever
from .chunk_models import LibraryChunk, RetrievalResult
from .citation_guardrail import int_to_superscript, CitationGuardrail
from ..config import settings
from ..schemas.inquiry import (
    InquiryRequest,
    CitationItem,
    SynthesisParagraph,
    SynthesisResponse,
    RecommendedReadingItem,
)
from ..models import Inquiry, Synthesis, Citation, Document

COLLECTION_LABELS = {
    "papers": "Faculty Research",
    "theses": "Doctoral Thesis",
    "reserves": "Course Reserve",
    "press": "University Press",
}

STOP_WORDS = {
    "what", "how", "why", "does", "the", "and", "are", "can", "for", "with",
    "this", "that", "from", "into", "about", "which", "when", "where", "who",
    "whom", "have", "been", "their", "there", "will", "would", "could", "should"
}

# Curated subject companion mappings for intelligent student recommendations
RECOMMENDATION_CORPUS = [
    {
        "document_id": "doc-vaswani-attention",
        "title": "Attention Is All You Need: Scaled Dot-Product & Self-Attention Architectures",
        "author": "Vaswani, A., Shazeer, N., Parmar, N. et al.",
        "year": "2017",
        "field": "Artificial Intelligence & Deep Learning",
        "collection_type": "Faculty Research",
        "call_number": "QA76.73.T73 V37 2017",
        "total_pages": 185,
        "recommendation_reason": "Seminal foundation paper establishing parallelized self-attention and Transformer models.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-he-resnet",
        "title": "Deep Residual Learning for Image Recognition",
        "author": "He, K., Zhang, X., Ren, S. & Sun, J.",
        "year": "2024",
        "field": "Computer Vision & Deep Learning",
        "collection_type": "Doctoral Thesis",
        "call_number": "THES-2024-CS-041",
        "total_pages": 168,
        "recommendation_reason": "Core optimization dissertation on residual identity mappings in deep architectures.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-sicp-abstraction",
        "title": "Structure and Interpretation of Computer Programs: Procedural & Data Abstractions",
        "author": "Abelson, H. & Sussman, G. J.",
        "year": "1996",
        "field": "Computer Science & Software Foundations",
        "collection_type": "Course Reserve",
        "call_number": "QA76.6.A255 1996",
        "total_pages": 657,
        "recommendation_reason": "Foundational course reserve for computational abstraction and functional modularity.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-quantum-nielsen",
        "title": "Quantum Computation and Quantum Information: Principles and Algorithms",
        "author": "Nielsen, M. A. & Chuang, I. L.",
        "year": "2010 (Course Reserve 2024)",
        "field": "Quantum Information & Computing",
        "collection_type": "Course Reserve",
        "call_number": "QA76.889.N54 2010",
        "total_pages": 676,
        "recommendation_reason": "Authoritative course reserve on qubits, QFT, Shor's algorithm, and fault-tolerant thresholds.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-crispr-doudna",
        "title": "CRISPR-Cas9 Endonucleases: Molecular Architecture and RNA-Guided Gene Editing",
        "author": "Doudna, J. A. & Charpentier, E.",
        "year": "2020",
        "field": "Biomedical Engineering & Genomics",
        "collection_type": "Faculty Research",
        "call_number": "QP624.D68 2020",
        "total_pages": 242,
        "recommendation_reason": "Seminal molecular biology research establishing programmable Cas9 single-guide RNA gene editing.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-food-security",
        "title": "Food in the Anthropocene: Sustainable Diets and Global Food Systems",
        "author": "Willett, W., Rockström, J., Loken, B. et al.",
        "year": "2024",
        "field": "Agricultural Sciences & Public Health",
        "collection_type": "Course Reserve",
        "call_number": "CR-AGRI-405",
        "total_pages": 245,
        "recommendation_reason": "The landmark Lancet Commission syllabus monograph defining the planetary health diet and agricultural boundaries.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-food-sovereignty",
        "title": "The Political Economy of Food Sovereignty and Agricultural Commons",
        "author": "Patel, R. & McMichael, P.",
        "year": "2023",
        "field": "Economic Sociology & Agrarian Studies",
        "collection_type": "Faculty Research",
        "call_number": "HD9000.5.P38 2023",
        "total_pages": 290,
        "recommendation_reason": "Faculty research analyzing global corporate food regimes, seed patents, and community agroecology.",
        "category": "Interdisciplinary",
    },
    {
        "document_id": "doc-game-theory-nash",
        "title": "Non-Cooperative Games, Equilibrium Points, and Mechanism Design",
        "author": "Nash, J. F., von Neumann, J. & Morgenstern, O.",
        "year": "2022",
        "field": "Game Theory & Mathematical Economics",
        "collection_type": "University Press",
        "call_number": "HB144.N37 2022",
        "total_pages": 310,
        "recommendation_reason": "Foundational mathematical economics treatise establishing Nash equilibria, minimax, and VCG mechanisms.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-ai-alignment-bostrom",
        "title": "Superintelligence and Value Alignment in Autonomous Multi-Agent Systems",
        "author": "Bostrom, N., Russell, S. & Amodei, D.",
        "year": "2023",
        "field": "Artificial Intelligence Ethics & Governance",
        "collection_type": "Faculty Research",
        "call_number": "Q335.B67 2023",
        "total_pages": 348,
        "recommendation_reason": "Faculty analysis on instrumental convergence, inverse reinforcement learning, and frontier model governance.",
        "category": "Interdisciplinary",
    },
    {
        "document_id": "doc-epidemiology-publichealth",
        "title": "Viral Transmission Dynamics, Pathogen Spillover, and Global Epidemic Surveillance",
        "author": "Piot, P., Farrar, J. & Lipsitch, M.",
        "year": "2024",
        "field": "Epidemiology & Global Public Health",
        "collection_type": "Doctoral Thesis",
        "call_number": "THES-2024-EPI-088",
        "total_pages": 298,
        "recommendation_reason": "Doctoral thesis combining SEIR mathematical modeling with real-time genomic pathogen surveillance.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-a4",
        "title": "Climate Feedback Loops and Irreversible Tipping Points",
        "author": "Lenton, T. M. & Steffen, W.",
        "year": "2024",
        "field": "Earth & Atmospheric Sciences",
        "collection_type": "Course Reserve",
        "call_number": "CR-ATM-502",
        "total_pages": 412,
        "recommendation_reason": "Assigned course reserve on cryosphere-ocean coupling and non-linear climate thresholds.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-rockstrom-boundaries",
        "title": "Planetary Boundaries: Exploring the Safe Operating Space for Humanity",
        "author": "Rockström, J., Steffen, W., Noone, K. et al.",
        "year": "2023",
        "field": "Environmental Science & Global Sustainability",
        "collection_type": "University Press",
        "call_number": "GE149.R63 2023",
        "total_pages": 260,
        "recommendation_reason": "University Press monograph quantifying the nine biophysical Earth system envelopes.",
        "category": "Interdisciplinary",
    },
    {
        "document_id": "doc-kuhn-structure",
        "title": "The Structure of Scientific Revolutions",
        "author": "Kuhn, T. S.",
        "year": "1962",
        "field": "Philosophy of Science",
        "collection_type": "University Press",
        "call_number": "Q175.K84 1962",
        "total_pages": 212,
        "recommendation_reason": "Foundational text introducing paradigm shifts, normal science, and incommensurability.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-popper-discovery",
        "title": "The Logic of Scientific Discovery",
        "author": "Popper, K. R.",
        "year": "1959",
        "field": "Philosophy of Science",
        "collection_type": "Faculty Research",
        "call_number": "Q175.P67 1959",
        "total_pages": 480,
        "recommendation_reason": "Seminal philosophical defense of deductive falsification and the criterion of empirical demarcation.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-a2",
        "title": "Adult Neuroplasticity and Second-Language Acquisition",
        "author": "Hernandez, A. E. & Ullman, M.",
        "year": "2024",
        "field": "Cognitive Neuroscience",
        "collection_type": "Doctoral Thesis",
        "call_number": "THES-2024-COG-092",
        "total_pages": 194,
        "recommendation_reason": "Doctoral thesis providing DTI imaging evidence of persistent white-matter remodeling in adult brains.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-kandel-principles",
        "title": "Principles of Neural Science: Synaptic Plasticity and Long-Term Potentiation",
        "author": "Kandel, E. R., Schwartz, J. H. & Jessell, T. M.",
        "year": "2021",
        "field": "Neuroscience",
        "collection_type": "Course Reserve",
        "call_number": "QP355.2.P76 2021",
        "total_pages": 1760,
        "recommendation_reason": "Standard graduate neuroscience syllabus covering cellular mechanisms of synaptic plasticity.",
        "category": "Core Reserve",
    },
    {
        "document_id": "doc-kahneman-thinking",
        "title": "Thinking, Fast and Slow: Cognitive Biases and Heuristic Decision Systems",
        "author": "Kahneman, D. & Tversky, A.",
        "year": "2011",
        "field": "Behavioral Economics & Decision Theory",
        "collection_type": "University Press",
        "call_number": "BF441.K34 2011",
        "total_pages": 499,
        "recommendation_reason": "Key behavioral economics text dissecting System 1 heuristics, availability bias, and prospect theory.",
        "category": "Interdisciplinary",
    },
    {
        "document_id": "doc-piketty-capital",
        "title": "Capital in the Twenty-First Century: Dynamics of Wealth Concentration",
        "author": "Piketty, T.",
        "year": "2014",
        "field": "Economics & Political Economy",
        "collection_type": "Faculty Research",
        "call_number": "HB501.P436 2014",
        "total_pages": 696,
        "recommendation_reason": "Authoritative empirical inquiry into the fundamental inequality r > g and historical wealth divergence.",
        "category": "Seminal Paper",
    },
    {
        "document_id": "doc-pasquale-blackbox",
        "title": "The Black Box Society: The Secret Algorithms That Control Money and Information",
        "author": "Pasquale, F.",
        "year": "2023",
        "field": "Information Law & Economic Sociology",
        "collection_type": "University Press",
        "call_number": "HB846.3.P37",
        "total_pages": 320,
        "recommendation_reason": "University Press critique of algorithmic scoring opacity in digital finance and automated decisions.",
        "category": "Interdisciplinary",
    },
    {
        "document_id": "doc-a3",
        "title": "Constituent Power and Constitutional Design in Post-Conflict States",
        "author": "Loughlin, M. & Walker, N.",
        "year": "2024",
        "field": "Constitutional Law & Theory",
        "collection_type": "Faculty Research",
        "call_number": "K3165.L68 2024",
        "total_pages": 341,
        "recommendation_reason": "Comparative law monograph on transitional constituent authority, power-sharing, and democratic legitimacy.",
        "category": "Core Reserve",
    },
]

class GroundedSynthesizer:
    """
    Synthesizes academic library holdings into concise, citation-backed explanations
    where factual assertions are mapped 1-to-1 to exact page excerpts and footnote marks.
    Leverages Google Gemini 1.5 when configured with seamless fallback to deterministic academic synthesis.
    """

    def __init__(self):
        self.guardrail = CitationGuardrail()

    def _extract_query_keywords(self, query: str) -> List[str]:
        words = re.findall(r"\b\w{3,}\b", query.lower())
        return [w for w in words if w not in STOP_WORDS]

    def _evaluate_relevance(
        self,
        question: str,
        candidates: List[RetrievalResult],
    ) -> Tuple[bool, List[RetrievalResult]]:
        """
        Evaluate if candidates contain authentic relevance to the query.
        Prevents hallucinating or forcing unrelated literature into out-of-scope inquiries.
        """
        if not candidates:
            return False, []

        keywords = self._extract_query_keywords(question)
        if not keywords:
            return True, candidates

        relevant: List[RetrievalResult] = []
        for cand in candidates:
            chunk = cand.chunk
            text_corpus = f"{chunk.title} {chunk.chapter_title} {chunk.text_content} {chunk.author}".lower()

            # Direct lexical matching
            matched_keywords = [kw for kw in keywords if kw in text_corpus]
            if cand.bm25_score > 0.1 or len(matched_keywords) > 0 or getattr(cand, "rerank_score", 0.0) >= 0.55:
                relevant.append(cand)

        if not relevant:
            return False, []

        return True, relevant

    def _generate_recommendations(
        self,
        question: str,
        retrieved_candidates: List[RetrievalResult],
        is_relevant: bool,
        field_filter: Optional[str] = None,
    ) -> List[RecommendedReadingItem]:
        """
        Generate intelligent student book & research paper recommendations from university library holdings.
        """
        retrieved_doc_ids = {c.chunk.document_id for c in retrieved_candidates}
        q_keywords = self._extract_query_keywords(question)

        scored_recs: List[Tuple[float, Dict[str, Any]]] = []
        for item in RECOMMENDATION_CORPUS:
            if item["document_id"] in retrieved_doc_ids and is_relevant:
                # Prioritize companion readings that aren't already the top citation
                continue

            text = f"{item['title']} {item['field']} {item['author']} {item['recommendation_reason']}".lower()
            keyword_matches = sum(1 for kw in q_keywords if kw in text)

            score = keyword_matches * 2.0
            if is_relevant and retrieved_candidates:
                # Field affinity bonus
                top_field = getattr(retrieved_candidates[0].chunk, "field", "")
                if top_field and top_field.lower() in item["field"].lower():
                    score += 1.5

            if field_filter and field_filter.lower() != "all":
                if field_filter.lower() in item["field"].lower():
                    score += 3.0

            # Course reserves bonus for student recommendations
            if item["collection_type"] == "Course Reserve":
                score += 0.8

            scored_recs.append((score, item))

        scored_recs.sort(key=lambda x: x[0], reverse=True)
        top_items = [item for _, item in scored_recs[:6]]

        return [
            RecommendedReadingItem(
                document_id=item["document_id"],
                title=item["title"],
                author=item["author"],
                year=item["year"],
                field=item["field"],
                collection_type=item["collection_type"],
                call_number=item["call_number"],
                total_pages=item["total_pages"],
                recommendation_reason=item["recommendation_reason"],
                category=item.get("category", "Core Reserve"),
            )
            for item in top_items
        ]

    def _build_gemini_prompt(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Tuple[str, str]:
        """Construct scholarly prompt and source holdings for Gemini LLM generation."""
        grounded_instruction = (
            "You are OnlyBooks, a university research librarian and academic citation synthesizer.\n"
            "Your audience consists of university researchers, faculty scholars, and undergraduate students.\n\n"
            "CRITICAL RULES:\n"
            "1. Synthesize a concise, authoritative academic explanation answering the user's research inquiry directly based on the numbered source passages below.\n"
            "2. EVERY factual assertion, theoretical claim, or empirical finding MUST be followed by an exact unicode superscript footnote marker (¹ for [1], ² for [2], ³ for [3], ⁴ for [4]) corresponding to the source passage index.\n"
            "3. Do NOT invent outside facts, sources, or citations. Ground every statement directly in the provided literature excerpts.\n"
            "4. Organize your response into exactly 2 focused, scholarly paragraphs: (1) Direct theoretical answer to the question with key definitions, (2) Substantive mechanisms and comparative empirical findings.\n"
            "5. Maintain an elevated, peer-reviewed academic tone. Never use bullet points, casual greetings, or conversational chatbot filler."
        )
        general_instruction = (
            "You are OnlyBooks, a helpful university research librarian. Answer the user's question directly "
            "using general knowledge because no relevant library excerpts were found. Begin by clearly stating "
            "that the answer is general guidance and is not verified against this library's holdings. "
            "Never imply recommended books are held by the library, and do not invent citations or use footnote markers. "
            "For book recommendations, give real titles and authors with a brief explanation of who each book suits."
        )
        system_instruction = grounded_instruction if candidates else general_instruction

        source_blocks = []
        for idx, res in enumerate(candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            marker = int_to_superscript(idx)
            block = (
                f"[{idx}] (Footnote Marker: {marker})\n"
                f"Title: {chunk.title}\n"
                f"Author: {chunk.author} ({chunk.year})\n"
                f"Collection: {coll_type} | Call Number: {chunk.call_number} | Page: {chunk.page_number}\n"
                f"Excerpt: \"{chunk.text_content.strip()}\""
            )
            source_blocks.append(block)

        sources_text = "\n\n".join(source_blocks)
        if not sources_text:
            sources_text = "No relevant library holdings were found for this inquiry."
        inquiry_context = (
            f"Prior inquiry and response for context:\n{follow_up_context}\n\nFollow-up research inquiry: \"{question}\""
            if follow_up_context
            else f"Research Inquiry: \"{question}\""
        )
        response_instruction = (
            "Please provide a concise, citation-grounded scholarly explanation with inline unicode superscript footnote markers (¹²³)."
            if candidates
            else "Give a useful general answer. For a recommendation request, provide 3 to 5 specific suggestions."
        )
        user_prompt = (
            f"{inquiry_context}\n\n"
            f"Available University Library Holdings:\n{sources_text}\n\n"
            f"{response_instruction}"
        )
        return system_instruction, user_prompt

    def _gemini_request_payload(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_instruction, user_prompt = self._build_gemini_prompt(
            question, candidates, follow_up_context
        )
        return {
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            }
        }

    @staticmethod
    def _gemini_request_headers() -> Dict[str, str]:
        return {"x-goog-api-key": settings.GEMINI_API_KEY or ""}

    async def _call_gemini_synthesis(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Optional[List[SynthesisParagraph]]:
        """Call Gemini REST API to generate citation-grounded synthesis paragraphs."""
        if not settings.GEMINI_API_KEY:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        payload = self._gemini_request_payload(question, candidates, follow_up_context)

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers=self._gemini_request_headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates_resp = data.get("candidates", [])
                    if candidates_resp:
                        parts = candidates_resp[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "").strip()
                            raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                            if raw_paragraphs:
                                return [SynthesisParagraph(text=p) for p in raw_paragraphs]
                else:
                    print(f"Gemini API returned status {resp.status_code}")
        except Exception as e:
            print(f"Gemini API call failed with {type(e).__name__}")

        return None

    def _generate_fallback_synthesis(
        self,
        question: str,
        retrieval_results: List[RetrievalResult],
        is_relevant: bool = True,
    ) -> List[SynthesisParagraph]:
        """
        Concise, academic synthesis generator adhering to the OnlyBooks problem statement:
        delivering concise, citation-backed explanations rather than requiring students to
        scroll through dozens of unrelated documents.
        """
        if not is_relevant or not retrieval_results:
            clean_q = question.strip().rstrip("?.")
            return [
                SynthesisParagraph(
                    text=(
                        "I couldn't find relevant books or passages in the current library holdings. "
                        "Gemini is unavailable right now, so I can't provide an unverified general answer. "
                        "Try a different search or ask a librarian to add relevant materials."
                    )
                ),
                SynthesisParagraph(
                    text=(
                        f"The university library archive does not currently index primary course reserves or faculty monographs "
                        f"directly focused on '{clean_q}'. To preserve academic integrity and avoid empirical misattribution, "
                        "the catalog does not force unrelated manuscripts to answer this inquiry."
                    )
                ),
                SynthesisParagraph(
                    text=(
                        "Our repository maintains foundational holdings in Cognitive Neuroscience, Artificial Intelligence & Deep Learning, "
                        "Philosophy of Science, Earth Systems & Sustainable Food Systems, Constitutional Law, and Behavioral Economics. "
                        "Consult the curated companion literature and course reserve recommendations below, or deposit relevant research "
                        "manuscripts via the Document Deposit portal."
                    )
                ),
            ]

        # Top finding framing
        top = retrieval_results[0].chunk
        top_author = top.author.split(",")[0].strip()
        top_clean_quote = top.text_content.strip()
        if not top_clean_quote.endswith("."):
            top_clean_quote += "."

        marker1 = int_to_superscript(1)
        p1 = (
            f"Scholarly inquiry regarding {question.strip().rstrip('?.')} is anchored in foundational literature from "
            f"{top.title}. Specifically, {top_author}'s analysis in {top.chapter_title} demonstrates that {top_clean_quote} {marker1} "
            "Rather than requiring researchers to navigate disparate documents, this establishes the primary theoretical baseline "
            "governing this academic domain."
        )

        # Supporting & comparative assertions
        p2_parts = []
        for idx, res in enumerate(retrieval_results[1:3], start=2):
            marker = int_to_superscript(idx)
            sec_author = res.chunk.author.split(",")[0].strip()
            sec_quote = res.chunk.text_content.strip()
            if not sec_quote.endswith("."):
                sec_quote += "."
            p2_parts.append(
                f"In complementary holdings from {res.chunk.title}, {sec_author} establishes that {sec_quote} {marker}"
            )

        if p2_parts:
            p2 = (
                " " .join(p2_parts)
                + " Taken together, these cataloged findings illustrate that inquiry within this discipline proceeds through "
                "rigorous cross-manuscript corroboration."
            )
        else:
            p2 = (
                "Subsequent experimental and theoretical analyses in the university holdings corroborate these empirical observations, "
                "substantiating the core paradigm against competing interpretations."
            )

        return [
            SynthesisParagraph(text=p1),
            SynthesisParagraph(text=p2),
        ]

    async def _stream_gemini_synthesis(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chunks from Gemini SSE API and yield structured token/paragraph events."""
        if not settings.GEMINI_API_KEY:
            return

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:streamGenerateContent?alt=sse"
        payload = self._gemini_request_payload(question, candidates, follow_up_context)

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers=self._gemini_request_headers(),
                ) as response:
                    if response.status_code != 200:
                        return

                    p_idx = 0
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            raw_data = line[6:].strip()
                            if not raw_data:
                                continue
                            try:
                                chunk_json = json.loads(raw_data)
                                parts = chunk_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    text_chunk = part.get("text", "")
                                    if not text_chunk:
                                        continue
                                    if "\n\n" in text_chunk:
                                        segments = text_chunk.split("\n\n")
                                        for s_i, seg in enumerate(segments):
                                            if seg:
                                                yield {"type": "token", "token": seg, "paragraph_idx": p_idx}
                                            if s_i < len(segments) - 1:
                                                yield {"type": "paragraph_break", "paragraph_idx": p_idx}
                                                p_idx += 1
                                    else:
                                        yield {"type": "token", "token": text_chunk, "paragraph_idx": p_idx}
                            except Exception:
                                continue
        except Exception as e:
            print(f"Gemini streaming failed with {type(e).__name__}")

    async def _get_candidates_and_context(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession],
    ) -> Tuple[List[RetrievalResult], Optional[str]]:
        if request.context_inquiry_id and db is not None:
            query = (
                select(Inquiry)
                .options(
                    selectinload(Inquiry.syntheses)
                    .selectinload(Synthesis.citations)
                    .selectinload(Citation.document)
                )
                .where(Inquiry.id == request.context_inquiry_id)
            )
            result = await db.execute(query)
            previous_inquiry = result.scalars().first()

            if previous_inquiry and previous_inquiry.syntheses:
                previous_synthesis = previous_inquiry.syntheses[0]
                candidates: List[RetrievalResult] = []
                for citation in previous_synthesis.citations:
                    document = citation.document
                    if not document or not citation.extracted_quote.strip():
                        continue

                    page_match = re.search(r"\d+", citation.page_ref or "")
                    chunk = LibraryChunk(
                        chunk_id=f"{citation.document_id}-{citation.id}",
                        document_id=document.id,
                        title=document.title,
                        author=document.author,
                        year=document.year,
                        collection_id=document.collection_id or "papers",
                        call_number=document.call_number or "",
                        page_number=int(page_match.group()) if page_match else 1,
                        chapter_num=citation.chapter_num or "",
                        chapter_title=document.title,
                        text_content=citation.extracted_quote,
                        metadata={
                            "journal_or_press": document.journal_or_press,
                            "field": document.field,
                        },
                    )
                    confidence = citation.confidence_score or 0.95
                    candidates.append(
                        RetrievalResult(
                            chunk=chunk,
                            rrf_score=float(confidence) / 10,
                        )
                    )

                if candidates:
                    follow_up_context = (
                        f"Original inquiry: {previous_inquiry.question}\n"
                        f"Previous response: {previous_synthesis.body_text}"
                    )
                    return candidates[:request.top_k], follow_up_context

        return [], None

    async def synthesize(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession] = None,
    ) -> SynthesisResponse:
        """
        Execute end-to-end hybrid retrieval, generate citation-anchored synthesis,
        calculate companion reading recommendations, and optionally persist to relational DB.
        """
        candidates, follow_up_context = await self._get_candidates_and_context(request, db)
        if follow_up_context:
            is_relevant, relevant_candidates = True, candidates
        else:
            retriever = get_hybrid_retriever()
            candidates = retriever.retrieve(
                query=request.question,
                top_k=request.top_k,
                collection_filter=request.collection_filter,
                field_filter=request.field_filter,
                era_filter=request.era_filter,
            )
            is_relevant, relevant_candidates = self._evaluate_relevance(request.question, candidates)
        active_candidates = relevant_candidates[:request.top_k] if is_relevant else []

        # Build verified citation items
        citations: List[CitationItem] = []
        unique_fields = set()

        for idx, res in enumerate(active_candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            citation_item = CitationItem(
                id=idx,
                marker=int_to_superscript(idx),
                document_id=chunk.document_id,
                title=chunk.title,
                author=chunk.author,
                year=chunk.year,
                journal=chunk.metadata.get("journal_or_press") or coll_type,
                call_number=chunk.call_number,
                collection_type=coll_type,
                page=f"Pg. {chunk.page_number}",
                extracted_quote=chunk.text_content,
                confidence_score=round(float(res.rrf_score * 10), 2) if res.rrf_score else 0.95,
            )
            citations.append(citation_item)
            if hasattr(chunk, "field") and chunk.field:
                unique_fields.add(chunk.field)

        # Generate paragraphs
        paragraphs = None
        if settings.GEMINI_API_KEY:
            paragraphs = await self._call_gemini_synthesis(
                request.question, active_candidates, follow_up_context
            )
        gemini_succeeded = bool(paragraphs)
        if not paragraphs:
            paragraphs = self._generate_fallback_synthesis(request.question, active_candidates, is_relevant=is_relevant)

        if citations:
            is_valid, attribution_score, warnings = self.guardrail.verify_citations(
                paragraphs, citations
            )
        else:
            attribution_score = 0.0
            warnings = []
        # Summary byline
        distinct_holdings = len(set(c.document_id for c in citations))
        byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
        summary_byline = (
            f"Synthesized from {distinct_holdings} University Library Holding"
            f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
            if citations
            else "General Gemini guidance · No matching library holdings"
        )
        if is_relevant and distinct_holdings > 0:
            byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
            summary_byline = (
                f"Synthesized from {distinct_holdings} University Library Holding"
                f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
            )
        elif gemini_succeeded:
            summary_byline = "General Gemini guidance · No matching library holdings"
        else:
            summary_byline = f"Library Advisory · General Catalog Search for '{request.question.strip()}'"

        recommendations = self._generate_recommendations(
            request.question, active_candidates, is_relevant, field_filter=request.field_filter
        )
        inquiry_id = f"inq-{uuid.uuid4().hex[:8]}"

        # Persist to relational database if session provided
        if db is not None:
            db_inquiry = Inquiry(
                id=inquiry_id,
                user_id=request.user_id,
                question=request.question,
                collection_filter=request.collection_filter or "all",
            )
            db.add(db_inquiry)

            full_body = "\n\n".join(p.text for p in paragraphs)
            db_synthesis = Synthesis(
                id=f"syn-{uuid.uuid4().hex[:8]}",
                inquiry_id=inquiry_id,
                summary_byline=summary_byline,
                body_text=full_body,
                attribution_score=attribution_score,
            )
            db.add(db_synthesis)

            for c in citations:
                db_citation = Citation(
                    id=f"cit-{uuid.uuid4().hex[:8]}",
                    synthesis_id=db_synthesis.id,
                    marker_number=c.id,
                    document_id=c.document_id,
                    page_ref=c.page,
                    extracted_quote=c.extracted_quote,
                    chapter_num=c.call_number,
                    confidence_score=c.confidence_score,
                )
                db.add(db_citation)

            await db.commit()

        return SynthesisResponse(
            inquiry_id=inquiry_id,
            question=request.question,
            summary_byline=summary_byline,
            paragraphs=paragraphs,
            citations=citations,
            attribution_score=attribution_score,
            recommended_readings=recommendations,
        )

    async def synthesize_stream(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream real-time citation-grounded synthesis tokens via Server-Sent Events (SSE).
        Emits metadata, citations, typewriter tokens, recommendations, and done completion.
        """
        candidates, follow_up_context = await self._get_candidates_and_context(request, db)
        if follow_up_context:
            is_relevant, relevant_candidates = True, candidates
        else:
            retriever = get_hybrid_retriever()
            candidates = retriever.retrieve(
                query=request.question,
                top_k=request.top_k,
                collection_filter=request.collection_filter,
                field_filter=request.field_filter,
                era_filter=request.era_filter,
            )
            is_relevant, relevant_candidates = self._evaluate_relevance(request.question, candidates)
        active_candidates = relevant_candidates[:request.top_k] if is_relevant else []

        citations: List[CitationItem] = []
        unique_fields = set()

        for idx, res in enumerate(active_candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            citation_item = CitationItem(
                id=idx,
                marker=int_to_superscript(idx),
                document_id=chunk.document_id,
                title=chunk.title,
                author=chunk.author,
                year=chunk.year,
                journal=chunk.metadata.get("journal_or_press") or coll_type,
                call_number=chunk.call_number,
                collection_type=coll_type,
                page=f"Pg. {chunk.page_number}",
                extracted_quote=chunk.text_content,
                confidence_score=round(float(res.rrf_score * 10), 2) if res.rrf_score else 0.95,
            )
            citations.append(citation_item)
            if hasattr(chunk, "field") and chunk.field:
                unique_fields.add(chunk.field)

        distinct_holdings = len(set(c.document_id for c in citations))
        if citations:
            byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
            summary_byline = (
                f"Synthesized from {distinct_holdings} University Library Holding"
                f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
            )
            initial_score = 0.95
        elif settings.GEMINI_API_KEY:
            summary_byline = "General Gemini guidance · No matching library holdings"
            initial_score = 0.0
        else:
            summary_byline = f"Library Advisory · General Catalog Search for '{request.question.strip()}'"
            initial_score = 0.0

        recommendations = self._generate_recommendations(
            request.question, active_candidates, is_relevant, field_filter=request.field_filter
        )
        inquiry_id = f"inq-{uuid.uuid4().hex[:8]}"

        # 1. Yield initial metadata event
        meta_event = {
            "event": "metadata",
            "inquiry_id": inquiry_id,
            "question": request.question,
            "summary_byline": summary_byline,
            "attribution_score": initial_score,
            "total_citations": len(citations),
        }
        yield f"data: {json.dumps(meta_event)}\n\n"
        await asyncio.sleep(0.01)

        # 2. Yield verified citations event
        citations_event = {
            "event": "citations",
            "citations": [c.model_dump() for c in citations],
        }
        yield f"data: {json.dumps(citations_event)}\n\n"
        await asyncio.sleep(0.01)

        # 3. Stream tokens
        accumulated_paragraphs: List[str] = [""]
        gemini_streamed_success = False

        if settings.GEMINI_API_KEY:
            try:
                cur_p = 0
                async for event in self._stream_gemini_synthesis(
                    request.question, active_candidates, follow_up_context
                ):
                    gemini_streamed_success = True
                    if event["type"] == "token":
                        while len(accumulated_paragraphs) <= event["paragraph_idx"]:
                            accumulated_paragraphs.append("")
                        accumulated_paragraphs[event["paragraph_idx"]] += event["token"]
                        token_event = {
                            "event": "token",
                            "token": event["token"],
                            "paragraph_idx": event["paragraph_idx"],
                        }
                        yield f"data: {json.dumps(token_event)}\n\n"
                        await asyncio.sleep(0.005)
                    elif event["type"] == "paragraph_break":
                        break_event = {
                            "event": "paragraph_break",
                            "paragraph_idx": event["paragraph_idx"],
                        }
                        yield f"data: {json.dumps(break_event)}\n\n"
                        await asyncio.sleep(0.01)
            except Exception as e:
                print(f"Error streaming from Gemini: {type(e).__name__}")
                gemini_streamed_success = False

        if not gemini_streamed_success:
            fallback_paragraphs = self._generate_fallback_synthesis(
                request.question, active_candidates, is_relevant=is_relevant
            )
            accumulated_paragraphs = [p.text for p in fallback_paragraphs]
            for p_idx, p in enumerate(fallback_paragraphs):
                tokens = p.text.split(" ")
                for t_idx, token in enumerate(tokens):
                    sep = " " if t_idx < len(tokens) - 1 else ""
                    token_event = {
                        "event": "token",
                        "token": token + sep,
                        "paragraph_idx": p_idx,
                    }
                    yield f"data: {json.dumps(token_event)}\n\n"
                    await asyncio.sleep(0.012)

                if p_idx < len(fallback_paragraphs) - 1:
                    break_event = {
                        "event": "paragraph_break",
                        "paragraph_idx": p_idx,
                    }
                    yield f"data: {json.dumps(break_event)}\n\n"
                    await asyncio.sleep(0.02)

        # Construct final paragraph models
        paragraphs = [
            SynthesisParagraph(text=p_text.strip())
            for p_text in accumulated_paragraphs
            if p_text.strip()
        ]
        if not paragraphs:
            paragraphs = [SynthesisParagraph(text="Synthesis completed based on archival holdings.")]

        if not citations and not gemini_streamed_success:
            summary_byline = f"Library Advisory · General Catalog Search for '{request.question.strip()}'"

        if citations:
            is_valid, attribution_score, warnings = self.guardrail.verify_citations(
                paragraphs, citations
            )
        else:
            attribution_score = 0.0
            warnings = []
        # Yield recommendations event
        recs_event = {
            "event": "recommendations",
            "recommendations": [r.model_dump() for r in recommendations],
        }
        yield f"data: {json.dumps(recs_event)}\n\n"
        await asyncio.sleep(0.01)

        # 4. Relational Database Persistence
        if db is not None:
            try:
                db_inquiry = Inquiry(
                    id=inquiry_id,
                    user_id=request.user_id,
                    question=request.question,
                    collection_filter=request.collection_filter or "all",
                )
                db.add(db_inquiry)

                full_body = "\n\n".join(p.text for p in paragraphs)
                db_synthesis = Synthesis(
                    id=f"syn-{uuid.uuid4().hex[:8]}",
                    inquiry_id=inquiry_id,
                    summary_byline=summary_byline,
                    body_text=full_body,
                    attribution_score=attribution_score,
                )
                db.add(db_synthesis)

                for c in citations:
                    db_citation = Citation(
                        id=f"cit-{uuid.uuid4().hex[:8]}",
                        synthesis_id=db_synthesis.id,
                        marker_number=c.id,
                        document_id=c.document_id,
                        page_ref=c.page,
                        extracted_quote=c.extracted_quote,
                        chapter_num=c.call_number,
                        confidence_score=c.confidence_score,
                    )
                    db.add(db_citation)

                await db.commit()
            except Exception as e:
                print(f"Warning: Failed to persist streamed inquiry to DB: {e}")

        # 5. Yield done event
        done_event = {
            "event": "done",
            "inquiry_id": inquiry_id,
            "summary_byline": summary_byline,
            "attribution_score": attribution_score,
            "total_paragraphs": len(paragraphs),
            "total_citations": len(citations),
            "recommended_readings": [r.model_dump() for r in recommendations],
        }
        yield f"data: {json.dumps(done_event)}\n\n"

# Global synthesizer instance
grounded_synthesizer = GroundedSynthesizer()

def get_synthesizer() -> GroundedSynthesizer:
    return grounded_synthesizer
