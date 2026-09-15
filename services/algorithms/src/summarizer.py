"""
DERRCS AI Incident Summarizer Module
Calls Google Gemini API to generate concise briefs from grouped citizen reports.
Falls back to template-based summaries if the API call fails or times out.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def generate_template_summary(reports: list[dict], emergency_type: str) -> str:
    """Generates structured fallback summary when Gemini API is unavailable."""
    report_count = len(reports)
    if report_count == 0:
        return f"No reports recorded for {emergency_type} incident."

    first_report = reports[0]
    description = first_report.get("description", "No description provided.")
    answers = first_report.get("standardizedAnswers") or {}
    trapped = answers.get("peopleTrapped", False)
    structure = answers.get("structureType", "Unknown structure")

    trapped_text = "Citizen reports indicate people may be trapped." if trapped else "No trapped individuals reported yet."

    return (
        f"{report_count} citizen report(s) received for {emergency_type} involving a {structure}. "
        f"Initial report details: '{description}'. {trapped_text} "
        f"Awaiting response unit arrival."
    )


def summarize_incident_cluster(reports: list[dict], emergency_type: str) -> str:
    """
    Summarizes multiple citizen reports into a single actionable paragraph.
    Uses Gemini Flash with a factual, concise system instruction.
    """
    if not reports:
        return "No reports to summarize."

    # Use fallback immediately if no valid API key is configured
    # We check for the mock keys in .env and .env.example
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("replace_with") or GEMINI_API_KEY == "your_gemini_api_key_here" or GEMINI_API_KEY.startswith("AQ.Ab8RN6"):
        return generate_template_summary(reports, emergency_type)

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)

        prompt = (
            f"You are an emergency dispatch assistant for MDRRMO Tagoloan, Misamis Oriental.\n"
            f"Summarize the following {len(reports)} citizen reports describing a {emergency_type} emergency.\n"
            f"Write a single concise paragraph (3 to 5 sentences). State the location, type, visible hazards, "
            f"and whether people are trapped or injured. Stick strictly to facts in the reports.\n\n"
            f"Reports:\n"
        )
        for idx, r in enumerate(reports, start=1):
            prompt += f"Report {idx}: {r.get('description', '')} | Details: {r.get('standardizedAnswers', {})}\n"

        response = model.generate_content(prompt, request_options={"timeout": 2.0})
        if response and response.text:
            return response.text.strip()
        return generate_template_summary(reports, emergency_type)
    except Exception as e:
        print(f"[AI Summarizer Warning] Gemini API error: {e}. Falling back to template.")
        return generate_template_summary(reports, emergency_type)


if __name__ == "__main__":
    sample_reports = [
        {
            "description": "Two-story building collapsed near highway crossing. Debris blocking road.",
            "standardizedAnswers": {"structureType": "Commercial", "peopleTrapped": True}
        },
        {
            "description": "Building collapse reported. Loud crashing sound heard, dust everywhere.",
            "standardizedAnswers": {"structureType": "Commercial", "peopleTrapped": True}
        }
    ]
    summary = summarize_incident_cluster(sample_reports, "StructuralCollapse")
    print("\nSummary Result:")
    print(summary)
