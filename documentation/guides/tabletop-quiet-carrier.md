# Quiet Carrier tabletop (60 minutes)

> [Documentation](../index.md) > [Integration guides](./index.md) > Quiet Carrier tabletop

A facilitated incident exercise built on the Operation Quiet Carrier campaign. Four seats (IC, Eng, Comms, Legal) react to injects the instructor releases on a shared clock. Everyone is on one control plane and one set of labs, so this is not per-student isolation. It is a room exercise with a shared board.

## Before the room fills (about 10 minutes)

1. Start the dashboard (`./scripts/ui/start-dashboard.sh`) and open **Classroom**.
2. Create a session and write the join code on the board.
3. On the Eng machine, open lab 01 and finish the `setup` and `services` steps so the mock collector on port 3000 is already up.
4. Pick `operation-quiet-carrier` in the Tabletop clock card. Leave the clock at T+0.
5. Project the Classroom page. Learners join, pick a seat, and keep the page open. It refreshes every 4 seconds.

Seats, roughly 3 to 5 people can share a seat if the group is big:

| Seat | Owns |
|------|------|
| IC | Priorities, who does what, final call on containment |
| Eng | Hands on keyboard, runs lab 01, reads the evidence |
| Comms | Holding statements, internal updates, customer wording |
| Legal | Notification duties, contracts, what we can and cannot say |

Decision cards in the lab only show choice buttons to the owning seat. Lab 01 has `decision-approve-typosquat` for IC and Eng, and `decision-notify-typosquat` for Comms and Legal. Anyone else sees a read-only "Not your call" card. If nobody in the room holds a seat, the card still shows for solo players.

## Minute by minute

The clock below is the T+ shown on the Classroom page. Wall time and T+ line up, because T+0 is the moment you press the first release button.

| T+ | Instructor does | Room does |
|----|-----------------|-----------|
| 0 | Press **Release next inject**. Read "Unusual registry mirror traffic detected" aloud. | Each seat says one sentence: what do I need to know first? IC writes the question list. |
| 3 | Ask Eng to run `install` in lab 01 (typosquat). | Eng narrates what the terminal shows. Comms and Legal draft what they would not say yet. |
| 10 | Press **Release next inject**. Read the postinstall callback alert. | Eng runs the `run` step. Decision card appears. IC and Eng answer `decision-approve-typosquat` out loud before clicking. |
| 14 | Ask for the answer, then let Eng click it. | Short argument is fine. The goto jumps to `detect`. |
| 18 | Ask Eng to open the collector capture and read the field names, never values. | Comms and Legal check the card for `decision-notify-typosquat` and answer it. |
| 22 | Stop. Ask each seat for one action in the next 10 minutes. | IC picks owners. Write them on the board. |
| 30 | Press **Release next inject**. Read the Dependabot CI workflow diff. | Eng looks at lab 05 (or just the diff). Legal: do we owe anyone notice because CI secrets might be in scope? |
| 40 | Press **+5 min** twice if the room is still arguing, otherwise skip. | Comms drafts a 3-line internal update. Read it aloud. |
| 55 | Press **Release next inject**. Read the mirror hash divergence. | This is persistence. IC decides: eviction plan or keep watching? Eng names the control that would have caught it (hash pinning, scoped registry). |
| 60 | Press **Freeze & discuss**. Open the Campaign page. | Debrief against the remediation checklist and the campaign debrief text. |
| 70 | Stop. | Each seat writes one thing they would change in their own runbook. |

Heads up on the clock: releasing an inject moves it to that inject's scripted minute (0, 10, 30, 55) if the clock is not already past it. The **+5 min** button moves time without releasing anything. **Reset clock** rewinds to T+0 and clears released injects, so you can rerun the same room.

## Running it from curl (optional)

The dashboard proxies the control plane under `/api/cp`. Direct, the control plane listens on port 3101.

```bash
# release the next inject
curl -s -X POST localhost:3101/api/classroom/clock \
  -H 'Content-Type: application/json' \
  -d '{"campaignId":"operation-quiet-carrier"}'

# move the clock without an inject
curl -s -X POST localhost:3101/api/classroom/clock \
  -H 'Content-Type: application/json' -d '{"minutes":5}'

# see the clock and released injects
curl -s localhost:3101/api/classroom/clock

# rewind
curl -s -X POST localhost:3101/api/classroom/clock \
  -H 'Content-Type: application/json' -d '{"reset":true}'
```

Join with a role: `POST /api/classroom/join` with `{"code":"ABC123","name":"Sam","role":"Comms"}`. Roles are `IC`, `Eng`, `Comms`, `Legal`. Joining again with the same name and a new role moves that person to the new seat.

## Debrief prompts

- Which inject changed your plan the most, and which seat saw it first?
- Where did Comms and Legal wait on Eng, and could they have started sooner?
- What would you have blocked at T+0 if you had trusted the mirror alert?
- Pick one remediation item from the campaign page and name an owner and a date.

## Authoring role-filtered decisions

Add `roles` to any decision in a `lesson.yaml`. Leave it out and everyone owns the call.

```yaml
decisions:
  - id: decision-example
    afterStep: detect
    prompt: "..."
    roles:
      - Comms
      - Legal
    choices: [...]
```

Add `tMinute` to a campaign inject to pin where the tabletop clock lands when you release it.
