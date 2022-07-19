# Tasks

- [x] Run the project.

- [x] Review package.json.
- [x] Review README.md.
- [x] Update packages.
- [x] Review code.
- [x] Split e2e tests.
- [x] Regenerate JWT secret (base64/random string).

- [x] Update HttpStatus of POST requests to reflect the correct status; not the default CREATED (201).

- [x] Store the JWT token in an HTTPS-only cookie instead of LocalStorage.
- [x] Rethink what data is stored in the JWT token. Maybe store only the ID of the user.

- [ ] Setup JWT token refreshing. See pg 10 of [RFC6749](https://datatracker.ietf.org/doc/html/rfc6749).
- [ ] Implement logout route (to invalidate refresh tokens).
- [ ] Add ability to revoke refresh tokens (revoking access-tokens is counter-intuitive).

- [x] Rename helpers directory to lib.
- [x] Refactor configuration registration.

- [ ] Implement error codes that are transmitted to the client when an error occurs on the server so that the client knows which errors have occured and responds accordingly. It is difficult and error prone for the client to check which error occured on the server using the error message only. So instead, sending pre-defined error codes will allow the implementation of granular error messages in the client app.

# Issues

- [x] Solidify (?) E2E tests. Look into Jest's --runInBand option if encountering e2e test issues.

### Low priority

- [ ] Extract configuration to its own module.
- [ ] Extract hashing to its own module.
- [ ] Setup .env.example (and commit to repository).
- [ ] Upgrade to yarn berry.
- [ ] De-archive repository, rename it, re-set origin for the project, and push.

#### Irrelevant at the moment

- [ ] Implement 'user' decorator to fetch current user.
