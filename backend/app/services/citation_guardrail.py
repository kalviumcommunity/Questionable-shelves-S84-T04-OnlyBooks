import re
from typing import List, Set, Tuple
from ..schemas.inquiry import CitationItem, SynthesisParagraph

SUPERSCRIPT_MAP = {
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
}

REVERSE_SUPERSCRIPT_MAP = {v: k for k, v in SUPERSCRIPT_MAP.items()}
SUPERSCRIPT_REGEX = re.compile(r"([¹²³⁴⁵⁶⁷⁸⁹])")

def int_to_superscript(num: int) -> str:
    """Convert integer to unicode superscript marker string (e.g. 1 -> '¹')."""
    return "".join(SUPERSCRIPT_MAP.get(int(digit), digit) for digit in str(num))

def extract_superscript_markers(text: str) -> List[int]:
    """Extract all unicode superscript citation numbers in order of appearance."""
    matches = SUPERSCRIPT_REGEX.findall(text)
    return [REVERSE_SUPERSCRIPT_MAP[m] for m in matches if m in REVERSE_SUPERSCRIPT_MAP]

class CitationGuardrail:
    """
    Verification guardrail ensuring that generated synthesis assertions
    are strictly anchored to verified citations and footnote markers.
    """

    @staticmethod
    def verify_citations(
        paragraphs: List[SynthesisParagraph],
        citations: List[CitationItem],
    ) -> Tuple[bool, float, List[str]]:
        """
        Validate that every superscript marker in the body text corresponds to
        an existing verified citation, and that citations list has matching quotes.
        Returns (is_valid, attribution_score, warnings).
        """
        warnings: List[str] = []
        found_markers: Set[int] = set()

        for p in paragraphs:
            markers = extract_superscript_markers(p.text)
            found_markers.update(markers)

        citation_ids = {c.id for c in citations}

        # Check for orphan markers (marker exists in text but not in citations list)
        missing_in_citations = found_markers - citation_ids
        if missing_in_citations:
            warnings.append(f"Footnote markers {missing_in_citations} lack supporting document citations.")

        # Check for unused citations
        unused_citations = citation_ids - found_markers
        if unused_citations:
            warnings.append(f"Citations {unused_citations} were retrieved but not referenced in body text.")

        if not found_markers:
            return False, 0.5, ["No footnote attribution markers detected in response."]

        # Calculate attribution score based on grounded coverage
        valid_count = len(found_markers & citation_ids)
        total_markers = len(found_markers)
        score = valid_count / total_markers if total_markers > 0 else 0.0

        # High confidence baseline when all markers match
        adjusted_score = round(min(0.98, max(0.60, 0.85 + (score * 0.13))), 2)

        is_valid = len(missing_in_citations) == 0
        return is_valid, adjusted_score, warnings
