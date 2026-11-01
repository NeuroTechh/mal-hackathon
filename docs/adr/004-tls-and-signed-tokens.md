# ADR-004: TLS and signed tokens, no service mesh

**Status:** Accepted · **Implementation:** Partial

## Context

Traffic must be encrypted and each caller identified.

## Decision

TLS on every connection, signed tokens for identity, roles checked in the API.

## Alternatives

- Service mesh with mutual TLS between services: strong for many services, but it is a platform to run.
- TLS and signed tokens: **chosen.**

## Reasons

With one API and one database there is little service-to-service traffic for a mesh to protect.

## Consequences

Less to operate. The cost: if services multiply, identity between them has to be revisited.

## Reconsider when

The API is split into several services that call each other.

## In this repository

There is no mesh, and roles are checked in the API. Identity is not finished: outside production, the `X-Demo-Role` header selects a fixed demo user, and Better Auth sessions are the only other route. The routes in `workflows.ts` authorise on the demo role alone, so they do not work for a real session yet. TLS is left to deployment; local runs use HTTP, and non-production Android builds allow cleartext (`app/app.config.ts`).
