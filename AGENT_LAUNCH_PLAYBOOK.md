# Agent Launch Playbook

Use this playbook to run the Issue 43 squad fast.

## Quick Commands

- `launch issue 43` -> run core squad in parallel
- `merge issue 43` -> merge all outputs into one implementation plan
- `status issue 43` -> request progress/checklist snapshot
- `ship issue 43` -> request release-gate checklist

## Copy-Paste: Launch

Use this exact prompt:

```text
Launch Issue 43 with the core squad in parallel:
1) Security Engineer
2) Backend Architect
3) Frontend Developer
4) API Tester
5) SRE (Site Reliability Engineer)

Constraints:
- Self-hostable by default
- Compatible with existing code
- Open to JWT migration if low risk
- Preserve login/logout/restore UX
- Minimize disruption and keep rollback ready

Each agent must return:
- P0/P1/P2 checklist
- Risks and assumptions
- Dependencies on other teams
- Verification and rollback criteria
```

## Copy-Paste: Merge

```text
Merge all Issue 43 squad outputs into one execution plan.
Return:
1) Final recommended auth architecture
2) Phased rollout plan
3) File-by-file implementation checklist
4) Test matrix (backend/frontend/api/e2e)
5) Production release gates and rollback triggers
6) Owner-by-owner task list
```

## Copy-Paste: Ticket Breakdown

```text
Generate execution tickets for Issue 43 by owner.
Owners:
- Security Engineer
- Backend Architect
- Frontend Developer
- API Tester
- SRE

For each ticket include:
- Title
- Scope
- Files/endpoints touched
- Acceptance criteria
- Dependencies
```

## Notes

- Keep `Security Engineer` and `SRE` in every launch for auth/security work.
- Keep rollout dual-mode first (legacy token + JWT) until metrics are stable.
- Use this branch naming style for follow-up work: `43-<short-topic>`.
