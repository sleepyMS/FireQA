export function commentReplyEmailHtml({
  replierName,
  commentPreview,
  linkUrl,
}: {
  replierName: string;
  commentPreview: string;
  linkUrl: string;
}): string {
  const preview =
    commentPreview.length > 200 ? commentPreview.slice(0, 200) + "…" : commentPreview;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>새 답글 알림</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-top:0;">새 답글이 달렸습니다</h2>
  <p><strong>${replierName}</strong>님이 회원님의 코멘트에 답글을 남겼습니다.</p>
  <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#374151;background:#f9fafb;border-radius:0 4px 4px 0;">
    ${preview}
  </blockquote>
  <p style="margin:24px 0;">
    <a href="${linkUrl}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
      답글 확인하기
    </a>
  </p>
</body>
</html>`;
}
