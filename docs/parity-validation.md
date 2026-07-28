# Core Extraction Parity Validation

This document records the final in-repository parity coverage for the core
extraction. The automated suite validates the current implementation and the
legacy behaviors stated in the extraction plan; it does not claim to have
compared against an unavailable external checkout or database.

## Automated coverage

| Behavior                                                          | Coverage                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fresh installation and first-run login-to-registration navigation | `tests/register-bootstrap.setup.ts`, `tests/demo.spec.ts`                                  |
| Login, logout, invitations, and sessions                          | `tests/login.spec.ts`, `tests/register.spec.ts`, `tests/admin.spec.ts`                     |
| Account and Loki preference validation and preservation           | `tests/preferences.spec.ts`, `tests/register.spec.ts`                                      |
| Privacy enforcement, acceptance, and account deletion             | `tests/privacy.spec.ts`, `tests/preferences.spec.ts`                                       |
| Generic and Loki-specific administration                          | `tests/admin.spec.ts`                                                                      |
| Read-only restrictions                                            | `tests/admin.spec.ts`, `tests/demo.spec.ts`, `tests/logbook-transfer.spec.ts`              |
| HTML cache isolation, invalidation, and response headers          | `tests/html-cache.spec.ts`                                                                 |
| Footer identity and application-owned links                       | `tests/privacy.spec.ts`, `tests/home.spec.ts`                                              |
| Fingerprinted assets, public assets, and service worker behavior  | `tests/asset-caching.spec.ts`, `tests/jump-from-image.spec.ts`, `tests/mobile-nav.spec.ts` |
| Worker, Node, and executable builds and executable startup        | `pn test`, including `test:executable`; `pn test:fork`                                     |
| Drizzle schema paths and clean migration initialization           | `tests/repository-paths.spec.ts`, `pn test:fork`                                           |
| Replacement application without core edits or Loki surface        | `pn test:fork`                                                                             |

The credential-free Drizzle check imports both configuration modules with
placeholder remote credentials, verifies that they share the same schema and
output paths, verifies that the schema exists, and imports the complete
application schema. A real remote migration is deliberately not attempted
without Cloudflare credentials.

## Manual upgrade comparison

A byte-for-byte or behavioral comparison with `main` requires a pre-extraction
checkout and database, neither of which can be manufactured from this working
tree. Before release, perform this reproducible upgrade check with an ordinary
backup copy:

1. Check out the pre-extraction `main` revision in a separate directory.
2. Start it against a fresh database, create the first administrator through
   `/login`, create and consume an invitation, create a second session, update
   both account and Loki preferences, accept the privacy policy, and add sample
   logbook data.
3. Stop the old process and make a filesystem copy of the database. Never run
   the comparison against the only copy.
4. Start the extracted build against the copied database using the same runtime
   (Worker/D1, Node/SQLite, or executable/SQLite). Run the normal migration
   command for that runtime first.
5. Verify login and logout, both existing sessions, invitation state, both
   preference forms, privacy enforcement, core and Loki admin pages, read-only
   writes, cached and uncached response headers, footer links, static assets,
   service worker installation, and account deletion.
6. Repeat step 4 for each deployed runtime. For remote D1, first export the
   database, then run `pn db:migrate:remote` with valid Cloudflare credentials.
   For local D1 use `pn db:migrate`; for SQLite use
   `pn db:migrate:sqlite` after placing the copy at the configured default path,
   or start the Node/executable runtime with
   `--sqlite-dir <directory-containing-loki.sqlite>`; startup applies the
   migrations before serving requests.

Any observed difference must be fixed or approved and recorded before release.
There are currently no intentional user-visible differences documented for the
extraction.
