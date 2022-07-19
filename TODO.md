# Tasks

- [x] Run the project.

- [x] Review package.json.
- [x] Review README.md.
- [x] Update packages.
- [x] Review code.
- [x] Split e2e tests.
- [x] Regenerate JWT secret (base64/random string).

- [ ] Update HttpStatus of POST requests to reflect the correct status; not the default CREATED (201).

- [ ] Implement 'user' decorator to fetch current user.

- [ ] Store the JWT token in an HTTPS-only cookie instead of LocalStorage.
- [ ] Rethink what data is stored in the JWT token. Maybe store only the ID of the user.
- [ ] Explicitly name authentication guards - do not rely on default names (e.g: local/jwt).

- [ ] Setup JWT token refreshing. See pg 10 of [RFC6749](https://datatracker.ietf.org/doc/html/rfc6749).
- [ ] Implement logout route (to invalidate refresh tokens).
- [ ] Add ability to revoke refresh tokens (revoking access-tokens is counter-intuitive).

- [ ] Move helpers to ./lib.
- [ ] Implement deep objects for configuration.
- [ ] Fix type system for configuration registration.
- [ ] Implement tests for configuration registration.

- [ ] Implement error codes that are transmitted to the client when an error occurs on the server so that the client knows which errors have occured and responds accordingly. It is difficult and error prone for the client to check which error occured on the server using the error message only. So instead, sending pre-defined error codes will allow the implementation of granular error messages in the client app.

# Issues

- [ ] Solidify (?) E2E tests. Look into Jest's --runInBand option if encountering e2e test issues.

### Low priority

- [ ] Extract configuration to its own module.
- [ ] Extract hashing to its own module.
- [ ] Setup .env.example (and commit to repository).
- [ ] Upgrade to yarn berry.
- [ ] De-archive repository, rename it, re-set origin for the project, and push.
