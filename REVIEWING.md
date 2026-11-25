# Reviewing an update officially

The public site never shows a Review tab. Reviewing happens **on the pull request**, where it leaves a record.

## How it works
1. Every update goes through a **pull request**, a proposed change to the main branch.
2. When the pull request opens, GitHub Actions run automatically:
   - **validate-data** and the **link checks**: the data is well formed and the links work;
   - **Page matches its template**: `index.html` was rebuilt from `template.html` and the data;
   - **Review checklist**: posts one comment listing every new or changed case, response and policy, each with a tick box and its source link, and keeps a **preview of the site** (with a Review tab and a banner) to download.
3. You check each row and tick it **in that comment**. The ticked comment is the official record.
4. When every box is ticked and every check is green, you merge. GitHub Pages updates the public site within minutes.

## One-off set-up on GitHub (about 5 minutes per repository)
1. **Settings → Actions → General → Workflow permissions:** "Read repository contents" is fine. The review workflow asks for the extra permission it needs (to comment) by itself.
2. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**, then:
   - **Name:** `Protect main`. **Enforcement:** Active. **Target branches:** Include default branch.
   - Tick **Require a pull request before merging**. Set **Required approvals** to **0** if you work alone (see "Why not require an approval?").
   - Tick **Require status checks to pass**, and add the checks by name once they have run on a first pull request: *Page matches its template*, *validate-data*, *Review checklist*.
   - Tick **Block force pushes**. Save.
   (Older screens: Settings → Branches → Add branch protection rule, with the same options.)

## Each update, step by step
1. Make your changes on a **new branch**, for example `update-2026-12-01`, not on main. On github.com, when you commit an edit, choose "Create a new branch for this commit and start a pull request".
2. Rebuild before committing: `python3 build.py`, then commit `index.html` with the data.
3. Open the pull request. Within a minute or two, the checks run and the **Review checklist** comment appears.
4. **Optional preview:** open the checklist's run link, download **preview-site** under Artifacts, unzip it, run `python3 -m http.server` in the folder, and open http://localhost:8000.
5. **For each row,** open its source and confirm:
   - the date is the earliest public record;
   - the actor is a government body or official (for responses);
   - the summary says only what the source says.

   Tick the box in the comment. If a row cannot be confirmed, move it to the backlog in a new commit. The comment updates itself: ticks stay on unchanged rows, and an edited row is un-ticked to be checked again.
6. When every box is ticked and all checks are green, press **Squash and merge**.

A typical update of 5 to 20 rows takes 15 to 45 minutes to check by hand, at 1 to 3 minutes a row.

## Why not require an approval?
GitHub **does not let the author of a pull request approve it**. If you require one approval and you are the only person with access, your own pull requests can never be merged, unless you bypass the rule, which defeats it.
- **Working alone:** set Required approvals to 0. The ticked checklist, the passing checks and the merge together form the record.
- **With a colleague:** add them under **Settings → Collaborators** with Write access, and set Required approvals to **1**. They review and press **Approve**; you merge.

## Using an AI agent to help
Helpful, with three rules:
1. **The agent checks, a person decides.** Ask it to open each source and report, for each row, the exact sentence that supports the date, the actor and the summary, with the link, or to say it could not confirm. You read its notes and tick the boxes yourself.
2. **No merge rights.** Do not give the agent a token or account that can merge or change repository settings. The ruleset above also stops anything reaching main without a pull request and passing checks.
3. **Watch for the usual failures:** wrong dates (a later report instead of the earliest one), paywalled or changed pages, and confident summaries of things the source does not say. Asking for the exact quoted sentence makes these easy to spot.

The tracker's footer already credits AI assistance. Keep it accurate: AI helps prepare and pre-check; a person verifies.
