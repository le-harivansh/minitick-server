# Minitick Server

This is the server of the minitick application. It takes care of: user registration, user authentication, user authorization, and tasks manipulation.
The SPA of the minitick project can be found [here](https://github.com/le-harivansh/minitick-application).

### Authentication

The authentication mechanism uses http-only secure cookies to store the JWT access-token and refresh-token.

#### Logging in

When the user logs in, the response will contain the following JWTs in http-only cookies:

- `access-token` - Used to authenticate a user with the application;
- `refresh-token` - Used to refresh `access-token`s & `refresh-token`s;
- `password-confirmation-token` - Used to grant authorization to certain routes (`/PATCH user` & `/DELETE user`) that modify the user's data on the server.

##### Access-Token

An access-token is only valid for 15 minutes. This duration can be changed by modifying the `JWT_ACCESS_TOKEN_DURATION` environment variable. The access-token can be refreshed by `POST`ing an empty request - with a valid **refresh-token** - to `/refresh/access-token`. The resulting response will contain a new access-token cookie.

##### Refresh-Token

A refresh-token is valid for upto 1 week. This duration can be changed by modifying the `JWT_REFRESH_TOKEN_DURATION` environment variable. The refresh-token can be refreshed by `POST`ing an empty request - with a valid **refresh-token** - to `/refresh/refresh-token`. The resulting response will contain a new refresh-token cookie.

##### Password-Confirmation-Token

A password-confirmation-token is valid for only 5 minutes. This duration can be changed by modifying the `JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION` environment variable. The password-confirmation-token can be refreshed by `POST`ing an empty request - with a valid **access-token** - to `/refresh/password-confirmation-token`. The resulting response will contain a new password-confirmation-token cookie.

#### Logging out

A user can log-out of the current session or other sessions it has with the application. This is done by passing a `scope` to `/POST logout`.

### Tasks CRUD

A user can `CREATE`, `READ`, `UPDATE`, and `DELETE` any of its own tasks.

### Installation

- Clone the repository,
- Add the required environment variables in a `.env` file (see `.env.example`),
- Setup a mongodb server (see `db.sh`),
- Run `yarn start:dev` (or another script depending on your needs. see `scripts` in `package.json`).

### Test-Driven-Development

TDD was used to develop the application.
