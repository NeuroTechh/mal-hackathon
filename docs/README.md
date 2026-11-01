# NeuroTechh documentation

## Reading order

| Document | Question it answers |
| --- | --- |
| [Problem brief](problem-brief.md) | What problem are we solving, for whom, and what counts as success? |
| [Production design](architecture/production-design.md) | What should the full platform look like at scale? |
| [High-level design](architecture/hld.md) | How is the prototype designed? |
| [Low-level design](architecture/lld.md) | How does the confirm flow work in detail? |
| [Decision records](adr/README.md) | Why was each choice made, and what would change it? |
| [As built](architecture/as-built.md) | What does the code do today, and where does it differ from the design? |

Working notes:

- [Implementation notes](implementation.md): available flows, local setup and current simplifications.
- [Testing backlog](testing-backlog.md): the test suites still to write.
- [Hospital images](hospital-images.md): where the bundled clinic images came from.

## When documents disagree

They were written in sequence, and later ones deliberately overturn earlier ones. The production design proposed microservices, Redis locks, Kafka and a ClickHouse audit log. The decision records then replaced each of those with something simpler, keeping the production design as the reference for concerns the prototype leaves out, such as regions, compliance and payments.

| To find out | Trust |
| --- | --- |
| What the code does | [As built](architecture/as-built.md), then the code itself |
| What was decided, and why | [Decision records](adr/README.md) |
| How the prototype was meant to work | [HLD](architecture/hld.md) and [LLD](architecture/lld.md) |
| Where the product could go at scale | [Production design](architecture/production-design.md) |
| What the problem is | [Problem brief](problem-brief.md) |

## Original documents

[`hackathon-submission/`](hackathon-submission/) holds the original files from the MAL Hackathon. They are not edited, and may contain statements that are out of date, such as "no code has been run".

The Markdown versions above changed the originals in these ways:

- Notes marked **As built** and an **In this repository** section on each decision record, comparing them with the code.
- Statements that stopped being true once the code existed were updated, such as "no code has been run" and the status tables.
- The decisions numbered ADR 1 to 4 in the HLD and LLD clashed with ADR-001 to ADR-019, so they now link to the full records.
- The production design was written as a reply to the team; it now reads as a project document.

| Original | Markdown version |
| --- | --- |
| [problem-framing-brief.pdf](hackathon-submission/problem-framing-brief.pdf) | [Problem brief](problem-brief.md) |
| [production-architecture.docx](hackathon-submission/production-architecture.docx) | [Production design](architecture/production-design.md) |
| [high-level-design.pdf](hackathon-submission/high-level-design.pdf) | [High-level design](architecture/hld.md) |
| [low-level-design.pdf](hackathon-submission/low-level-design.pdf) | [Low-level design](architecture/lld.md) |
| [architectural-decision-records.pdf](hackathon-submission/architectural-decision-records.pdf) | [Decision records](adr/README.md) and [walkthroughs](adr/walkthroughs.md) |
