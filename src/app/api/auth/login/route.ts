import { NextResponse } from "next/server";

function normalizeOAuthUrl(raw: string | undefined) {
  const fallback = "https://second.me/oauth";
  if (!raw || !raw.trim()) {
    return fallback;
  }

  const normalized = raw.trim().replace(/\/+$/, "");

  // `go.second.me/oauth` is a geo-dispatch page. In this environment it
  // redirects desktop users to `second-me.cn`, which is not reachable.
  // Prefer the stable global OAuth entrypoint unless the user explicitly
  // points elsewhere.
  if (/^https:\/\/go\.second\.me\/oauth$/i.test(normalized)) {
    return fallback;
  }

  return normalized;
}

export async function GET() {
  const clientId = process.env.SECONDME_CLIENT_ID;
  const redirectUri = process.env.SECONDME_REDIRECT_URI;
  const oauthUrl = normalizeOAuthUrl(process.env.SECONDME_OAUTH_URL);

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth 配置缺失，请联系管理员" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  const url = `${oauthUrl}?${params.toString()}`;

  return NextResponse.redirect(url);
}
