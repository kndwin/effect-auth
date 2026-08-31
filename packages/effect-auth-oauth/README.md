# `@effect-auth/oauth`

GitHub and Google OAuth providers for `Auth.make({ auth: [...] })`.

```ts
import { Auth } from "@effect-auth/server";
import { GitHubProvider, GoogleProvider } from "@effect-auth/oauth";

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

Subpaths: `@effect-auth/oauth/github`, `@effect-auth/oauth/google`.
