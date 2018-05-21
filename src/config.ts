export const MASTODON_HOST = process.env.MASTODON_HOST!
export const MASTODON_TOKEN = process.env.MASTODON_TOKEN!

if (MASTODON_HOST == null) { throw new Error("MASTODON_HOST is required") }
if (MASTODON_TOKEN == null) { throw new Error("MASTODON_TOKEN is required") }
