"""
DERRCS AI Incident Summarizer Module
Calls Google Gemini API to generate concise briefs from grouped citizen reports.
Falls back to template-based summaries if the API call fails or times out.
"""

import os
from google import genai
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
        client = genai.Client(api_key=GEMINI_API_KEY, http_options={'timeout': 2000})
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        prompt = (
            f"You are an emergency dispatch assistant for MDRRMO Tagoloan, Misamis Oriental.\n"
            f"Summarize the following {len(reports)} citizen reports describing a {emergency_type} emergency.\n"
            f"Write a single concise paragraph (3 to 5 sentences). State the location, type, visible hazards, "
            f"and whether people are trapped or injured. Stick strictly to facts in the reports.\n\n"
            f"Reports:\n"
        )
        for idx, r in enumerate(reports, start=1):
            prompt += f"Report {idx}: {r.get('description', '')} | Details: {r.get('standardizedAnswers', {})}\n"

        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        if response and response.text:
            return response.text.strip()
        return generate_template_summary(reports, emergency_type)
    except Exception as e:
        print(f"[AI Summarizer Warning] Gemini API error: {e}. Falling back to template.")
        return generate_template_summary(reports, emergency_type)


def generate_handover_debrief(reports, assessments, incident_code):
    """Generate a hospital pre-arrival handover report."""
    report_texts = [r.get('description', '') for r in reports]
    assessment_texts = []
    for a in assessments:
        assessment_texts.append(
            f"Patient: {a.get('patient_name', 'Unknown')}, "
            f"Age: {a.get('approximate_age', 'N/A')}, "
            f"Consciousness: {a.get('consciousness_level', 'N/A')}, "
            f"Injuries: {', '.join(a.get('injuries_observed', []) or [])}, "
            f"Interventions: {', '.join(a.get('interventions_rendered', []) or [])}"
        )

    prompt = (
        f"You are an emergency medical AI assistant for Tagoloan MDRRMO.\n"
        f"Create a structured hospital pre-arrival handover report for incident {incident_code}.\n\n"
        f"Citizen Reports Summary:\n{chr(10).join(report_texts)}\n\n"
        f"Field Assessments:\n{chr(10).join(assessment_texts)}\n\n"
        f"Format the handover as:\n"
        f"1. Incident Overview\n"
        f"2. Patient Count and Triage Summary\n"
        f"3. Interventions Already Rendered\n"
        f"4. Recommended Hospital Preparations\n"
    )

    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("replace_with") or GEMINI_API_KEY == "your_gemini_api_key_here" or GEMINI_API_KEY.startswith("AQ.Ab8RN6"):
        return _template_handover_debrief(reports, assessments, incident_code), True

    try:
        client = genai.Client(api_key=GEMINI_API_KEY, http_options={'timeout': 2000})
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        if response and response.text:
            return response.text.strip(), False
        return _template_handover_debrief(reports, assessments, incident_code), True
    except Exception as e:
        print(f"[Summarizer] Gemini API handover error: {e}. Using template fallback.")
        return _template_handover_debrief(reports, assessments, incident_code), True


def _template_handover_debrief(reports, assessments, incident_code):
    """Deterministic fallback handover template."""
    patient_count = len(assessments)
    report_count = len(reports)

    injury_list = []
    for a in assessments:
        injury_list.extend(a.get('injuries_observed', []) or [])

    intervention_list = []
    for a in assessments:
        intervention_list.extend(a.get('interventions_rendered', []) or [])

    return (
        f"HANDOVER DEBRIEF - {incident_code} (Auto-Generated)\n"
        f"Reports Received: {report_count}\n"
        f"Patients Assessed: {patient_count}\n"
        f"Injuries Observed: {', '.join(injury_list) if injury_list else 'None recorded'}\n"
        f"Interventions Rendered: {', '.join(intervention_list) if intervention_list else 'None recorded'}\n"
        f"This is an automated summary. Verify details with responding unit."
    )


def handle_candidate_created(payload, publish):
    """
    RabbitMQ handler for candidate.created events.
    Queries reports linked to the new candidate, generates a ClusterIntake summary
    using Gemini or template fallback, and saves it to the summaries table.
    """
    from db import query as db_query, get_connection, put_connection

    candidate_id = payload.get('candidateId')
    emergency_type = payload.get('emergencyType')

    print(f"[Summarizer] Generating ClusterIntake summary for candidate {candidate_id}")

    # Fetch all reports linked to this candidate
    reports = db_query(
        """SELECT id, description, standardized_answers AS "standardizedAnswers"
           FROM reports
           WHERE candidate_id = %s
           ORDER BY created_at ASC""",
        (candidate_id,)
    )

    if not reports:
        print(f"[Summarizer] No reports found for candidate {candidate_id}. Skipping.")
        return

    # Convert RealDictRow to plain dicts for the summarizer
    report_dicts = [dict(r) for r in reports]

    # Generate the summary
    summary_text = summarize_incident_cluster(report_dicts, emergency_type)
    is_fallback = not GEMINI_API_KEY or GEMINI_API_KEY.startswith("AQ.Ab8RN6") or GEMINI_API_KEY.startswith("replace_with")

    # Determine version number (increment if summary already exists)
    existing = db_query(
        """SELECT COALESCE(MAX(version), 0) AS max_version
           FROM summaries
           WHERE candidate_id = %s AND summary_type = 'ClusterIntake'""",
        (candidate_id,)
    )
    version = (existing[0]['max_version'] if existing else 0) + 1

    # Save to summaries table
    incident_id = payload.get('incidentId')
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO summaries
                     (candidate_id, incident_id, summary_type, content, is_fallback, version)
                   VALUES (%s, %s, 'ClusterIntake', %s, %s, %s)
                   RETURNING id""",
                (candidate_id, incident_id, summary_text, is_fallback, version)
            )
            summary_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        put_connection(conn)

    print(f"[Summarizer] Saved ClusterIntake summary {summary_id} (v{version}, fallback={is_fallback}) for candidate {candidate_id}")


def handle_field_assessment_submitted(payload, publish):
    """
    RabbitMQ handler for field.assessment.submitted events.
    Queries reports and field assessments for the incident, generates a HandoverDebrief
    summary, and saves it to the summaries table.
    """
    from db import query as db_query, get_connection, put_connection

    incident_id = payload.get('incidentId')
    assessment_id = payload.get('assessmentId')

    print(f"[Summarizer] Generating HandoverDebrief for incident {incident_id}")

    # Fetch incident metadata
    incident = db_query(
        """SELECT id, incident_code, emergency_type, candidate_id
           FROM incidents WHERE id = %s""",
        (incident_id,)
    )

    if not incident:
        print(f"[Summarizer] Incident {incident_id} not found. Skipping.")
        return

    incident = incident[0]
    incident_code = incident['incident_code']
    candidate_id = incident.get('candidate_id')

    # Fetch reports linked to this incident
    reports = db_query(
        """SELECT id, description, standardized_answers AS "standardizedAnswers"
           FROM reports
           WHERE incident_id = %s
           ORDER BY created_at ASC""",
        (incident_id,)
    )

    # Fetch field assessments for this incident
    assessments = db_query(
        """SELECT id, patient_name, approximate_age, gender,
                  consciousness_level, injuries_observed,
                  interventions_rendered, disposition, destination_facility, notes
           FROM field_assessments
           WHERE incident_id = %s
           ORDER BY created_at ASC""",
        (incident_id,)
    )

    report_dicts = [dict(r) for r in reports]
    assessment_dicts = [dict(a) for a in assessments]

    # Generate handover debrief
    summary_text, is_fallback = generate_handover_debrief(report_dicts, assessment_dicts, incident_code)

    # Determine version number (increment if summary already exists)
    existing = db_query(
        """SELECT COALESCE(MAX(version), 0) AS max_version
           FROM summaries
           WHERE incident_id = %s AND summary_type = 'HandoverDebrief'""",
        (incident_id,)
    )
    version = (existing[0]['max_version'] if existing else 0) + 1

    # Save to summaries table
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO summaries
                     (candidate_id, incident_id, summary_type, content, is_fallback, version)
                   VALUES (%s, %s, 'HandoverDebrief', %s, %s, %s)
                   RETURNING id""",
                (candidate_id, incident_id, summary_text, is_fallback, version)
            )
            summary_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        put_connection(conn)

    print(f"[Summarizer] Saved HandoverDebrief {summary_id} (v{version}, fallback={is_fallback}) for incident {incident_code}")
    
    # Publish event so the Node.js API can broadcast it or trigger downstream workflows
    if publish:
        publish('handover.debrief.generated', {
            'incidentId': incident_id,
            'summaryId': summary_id,
            'version': version,
            'isFallback': is_fallback
        })


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
