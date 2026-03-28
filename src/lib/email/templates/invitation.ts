export function invitationEmailHtml({
  orgName,
  inviteUrl,
  expiresAt,
}: {
  orgName: string;
  inviteUrl: string;
  expiresAt: Date;
}): string {
  const expiresStr = expiresAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>FireQA 초대</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-top:0;">FireQA에 초대되었습니다</h2>
  <p><strong>${orgName}</strong> 조직에 참여하도록 초대받았습니다.</p>
  <p style="margin:24px 0;">
    <a href="${inviteUrl}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
      초대 수락하기
    </a>
  </p>
  <p style="color:#6b7280;font-size:13px;">이 링크는 ${expiresStr}까지 유효합니다.</p>
  <p style="color:#6b7280;font-size:13px;">초대를 원하지 않으면 이 이메일을 무시하세요.</p>
</body>
</html>`;
}
