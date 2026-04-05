export function commentMentionEmailHtml({
  mentionerName,
  commentPreview,
  linkUrl,
}: {
  mentionerName: string;
  commentPreview: string;
  linkUrl: string;
}): string {
  const preview =
    commentPreview.length > 200 ? commentPreview.slice(0, 200) + "\u2026" : commentPreview;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>멘션 알림</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-top:0;">코멘트에서 멘션되었습니다</h2>
  <p><strong>${mentionerName}</strong>님이 코멘트에서 회원님을 멘션했습니다.</p>
  <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#374151;background:#f9fafb;border-radius:0 4px 4px 0;">
    ${preview}
  </blockquote>
  <p style="margin:24px 0;">
    <a href="${linkUrl}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
      코멘트 확인하기
    </a>
  </p>
</body>
</html>`;
}
