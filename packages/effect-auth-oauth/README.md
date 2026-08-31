# `@kndwin/effect-auth-oauth`

GitHub and Google OAuth providers for `Auth.make({ auth: [...] })`.

```ts
import { Auth } from "@kndwin/effect-auth-server";
import { GitHubProvider, GoogleProvider } from "@kndwin/effect-auth-oauth";

Auth.make({
  appUrl: "http://localhost:3000",
  auth: [
    GitHubProvider.define({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider.define({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});
```

Subpaths: `@kndwin/effect-auth-oauth/github`, `@kndwin/effect-auth-oauth/google`.
