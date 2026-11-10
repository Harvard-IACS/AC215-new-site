"""Public, editable course notes and a small index for the no-key preview."""
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
import json
import math
import re

NOTES = Path(__file__).resolve().parents[1] / "knowledge"
STOP_WORDS = set("a an and are as at be can could do does for from how i in is it me my of on or our please that the their this to we what when where which who will with would you your".split())
ALIASES = {"class": "course lectures", "meet": "lectures meeting", "meets": "lectures meeting", "teacher": "instructors staff", "professor": "instructors", "deadline": "due submission", "deadlines": "due submission", "prerequisite": "prerequisites", "team": "teams", "quiz": "quizzes", "grading": "grade weight", "late": "late days", "office": "office hours"}


def tokenize(text: str) -> list[str]:
    text = re.sub(r"\bms\s*([1-5])\b", r"milestone\1", text.lower())
    text = re.sub(r"\bmilestone\s+([1-5])\b", r"milestone\1", text)
    return [word for word in re.findall(r"[a-z0-9]+", text) if word not in STOP_WORDS]


@dataclass(frozen=True)
class Passage:
    filename: str
    title: str
    text: str


class CourseKnowledge:
    def __init__(self, folder: Path = NOTES):
        self.folder = folder
        catalog = json.loads((folder / "catalog.json").read_text())
        self.updated_on = catalog["updated_on"]
        self.files = {item["filename"]: item for item in catalog["files"]}
        self.passages = []
        for filename, item in self.files.items():
            heading, lines = item["title"], []
            def flush():
                if lines:
                    self.passages.append(Passage(filename, heading, "\n".join(lines).strip()))
                    lines.clear()
            for line in self.read_file(filename).splitlines():
                if line.startswith("#"):
                    flush()
                    heading = item["title"] + ": " + line.lstrip("# ")
                else:
                    if lines and sum(map(len, lines)) + len(line) > 1600:
                        flush()
                    lines.append(line)
            flush()
        self.counts = [Counter(tokenize(p.title + " " + p.text)) for p in self.passages]
        self.lengths = [sum(count.values()) for count in self.counts]
        self.average_length = sum(self.lengths) / max(1, len(self.lengths))
        self.document_frequency = Counter(word for counts in self.counts for word in counts)

    def read_file(self, filename: str) -> str:
        # The tool reads these public course notes only, never arbitrary paths.
        if filename not in self.files:
            raise ValueError("Choose a filename from the course file catalog.")
        return (self.folder / filename).read_text()

    def source(self, filename: str, index: int, excerpt: str = "") -> dict:
        return {"id": index, "filename": filename, "title": self.files[filename]["title"],
                "url": "/api/course/files/" + filename, "excerpt": excerpt}

    def search(self, question: str, limit: int = 3) -> list[Passage]:
        terms = tokenize(question)
        expanded = terms + [token for word in terms for token in tokenize(ALIASES.get(word, ""))]
        count = len(self.passages)
        results = []
        for index, counts in enumerate(self.counts):
            score = 0.0
            for term in set(expanded):
                frequency = counts[term]
                if not frequency:
                    continue
                inverse = math.log(1 + (count - self.document_frequency[term] + .5) / (self.document_frequency[term] + .5))
                denominator = frequency + 1.2 * (.25 + .75 * self.lengths[index] / self.average_length)
                score += inverse * frequency * 2.2 / denominator
            # An explicitly named milestone should lead with that milestone's section.
            for term in terms:
                if re.fullmatch(r'milestone[1-5]', term) and term in tokenize(self.passages[index].title):
                    score += 5
            if score > 1.25:
                results.append((score, index))
        results.sort(reverse=True)
        selected, seen = [], set()
        for _, index in results:
            passage = self.passages[index]
            if passage.text and passage.text not in seen:
                selected.append(passage)
                seen.add(passage.text)
            if len(selected) >= limit:
                break
        return selected
