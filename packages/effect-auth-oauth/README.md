# `@kndwin/oauth`

GitHub and Google OAuth providers for `Auth.make({ auth: [...] })`.

```ts
import { Auth } from "@kndwin/server";
import { GitHubProvider, GoogleProvider } from "@kndwin/oauth";

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

Subpaths: `@kndwin/oauth/github`, `@kndwin/oauth/google`.
