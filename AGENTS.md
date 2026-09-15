# DERRCS Agent Rules

## 1. Verify Before Accepting
When reviewing an external audit, report, or PR comment that cites a specific
file and line number, always open and read that exact location before agreeing
with the claim. Never trust cited line numbers or file names without verification.

## 2. Protect Capstone Specifications
Do not remove or simplify any algorithm that the project documentation
explicitly defines as a design requirement. Check `CONTEXT.md` and
`Digital_Emergency_Reporting_and_Response_Coordination_System_Documentation.md`
before suggesting algorithmic simplifications. The Modified Hungarian Algorithm's
dummy matrix padding is a documented requirement — do not remove it.

## 3. Native vs Docker Host
When the service is running outside Docker, `POSTGRES_HOST` and `RABBITMQ_HOST`
in `.env` must be `localhost`, not their Docker Compose service names (`postgres`, `rabbitmq`).
