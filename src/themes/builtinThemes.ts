export interface BuiltinTheme {
  name: string;
  description: string;
  template_html: string;
}

// Index 0 is seeded as the default theme for new databases.
export const BUILTIN_THEMES: BuiltinTheme[] = [
  {
    name: 'Clean (No Footer)',
    description: 'Same as Clean but without the footer — pure content, no unsubscribe note.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#374151;font-size:15px;line-height:1.7}
  .outer{padding:40px 16px}
  .card{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);overflow:hidden}
  .body{padding:40px 48px}
  p{margin:0 0 16px}
  h1{font-size:1.875em;font-weight:700;margin:0 0 16px;color:#111827;line-height:1.25}
  h2{font-size:1.375em;font-weight:700;margin:28px 0 12px;color:#111827;line-height:1.3}
  h3{font-size:1.15em;font-weight:600;margin:22px 0 10px;color:#111827}
  h4,h5,h6{font-size:1em;font-weight:600;margin:18px 0 8px;color:#111827}
  ul,ol{margin:0 0 16px;padding-left:28px}
  li{margin:4px 0}
  li p{margin:0}
  blockquote{margin:0 0 16px;padding:12px 20px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;background:#f9fafb;border-radius:0 6px 6px 0}
  blockquote p{margin:0}
  pre{margin:0 0 16px;padding:16px 20px;background:#f3f4f6;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;border:1px solid #e5e7eb}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:0.875em;color:#111827;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
  pre code{background:none;padding:0;font-size:inherit;color:inherit}
  hr{border:none;border-top:1px solid #e5e7eb;margin:28px 0}
  a{color:#4f46e5;text-decoration:underline}
  a:hover{color:#3730a3}
  table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px}
  th{padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;text-align:left;color:#374151}
  td{padding:10px 14px;border:1px solid #e5e7eb;color:#374151}
  img{max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:6px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
</style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="body">{{content}}</div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: 'Clean',
    description: 'White card on light gray background with subtle shadow and indigo links. The classic newsletter look.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#374151;font-size:15px;line-height:1.7}
  .outer{padding:40px 16px}
  .card{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);overflow:hidden}
  .body{padding:40px 48px}
  p{margin:0 0 16px}
  h1{font-size:1.875em;font-weight:700;margin:0 0 16px;color:#111827;line-height:1.25}
  h2{font-size:1.375em;font-weight:700;margin:28px 0 12px;color:#111827;line-height:1.3}
  h3{font-size:1.15em;font-weight:600;margin:22px 0 10px;color:#111827}
  h4,h5,h6{font-size:1em;font-weight:600;margin:18px 0 8px;color:#111827}
  ul,ol{margin:0 0 16px;padding-left:28px}
  li{margin:4px 0}
  li p{margin:0}
  blockquote{margin:0 0 16px;padding:12px 20px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;background:#f9fafb;border-radius:0 6px 6px 0}
  blockquote p{margin:0}
  pre{margin:0 0 16px;padding:16px 20px;background:#f3f4f6;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;border:1px solid #e5e7eb}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:0.875em;color:#111827;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
  pre code{background:none;padding:0;font-size:inherit;color:inherit}
  hr{border:none;border-top:1px solid #e5e7eb;margin:28px 0}
  a{color:#4f46e5;text-decoration:underline}
  a:hover{color:#3730a3}
  table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px}
  th{padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;text-align:left;color:#374151}
  td{padding:10px 14px;border:1px solid #e5e7eb;color:#374151}
  img{max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:6px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
  .footer{padding:24px 48px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center}
  .footer p{margin:0;font-size:12px;color:#9ca3af}
</style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="body">{{content}}</div>
      <div class="footer"><p>You received this email because you subscribed to our newsletter.</p></div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: 'Modern',
    description: 'White background with an indigo-to-purple gradient top bar, bold typography, and purple accents.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e1b4b;font-size:16px;line-height:1.75}
  .accent-bar{height:5px;background:linear-gradient(90deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%)}
  .wrap{max-width:600px;margin:0 auto;padding:48px 32px}
  p{margin:0 0 18px}
  h1{font-size:2.25em;font-weight:800;margin:0 0 20px;color:#0f0a2e;line-height:1.15;letter-spacing:-0.02em}
  h2{font-size:1.5em;font-weight:700;margin:36px 0 14px;color:#1e1b4b;line-height:1.25;letter-spacing:-0.01em}
  h3{font-size:1.2em;font-weight:700;margin:28px 0 10px;color:#1e1b4b}
  h4,h5,h6{font-size:1em;font-weight:700;margin:20px 0 8px;color:#1e1b4b}
  ul,ol{margin:0 0 18px;padding-left:28px}
  li{margin:5px 0}
  li p{margin:0}
  blockquote{margin:0 0 18px;padding:16px 24px;border-left:4px solid #7c3aed;color:#4c1d95;background:#f5f3ff;border-radius:0 8px 8px 0;font-style:normal;font-weight:500}
  blockquote p{margin:0}
  pre{margin:0 0 18px;padding:18px 22px;background:#1e1b4b;border-radius:10px;overflow-x:auto;font-size:13px;line-height:1.65;color:#e9d5ff}
  code{background:#ede9fe;padding:2px 7px;border-radius:4px;font-size:0.875em;color:#5b21b6;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
  pre code{background:none;padding:0;font-size:inherit;color:#e9d5ff}
  hr{border:none;border-top:2px solid #ede9fe;margin:32px 0}
  a{color:#7c3aed;text-decoration:none;border-bottom:1px solid #c4b5fd}
  a:hover{color:#5b21b6;border-bottom-color:#7c3aed}
  table{width:100%;border-collapse:collapse;margin:0 0 18px;font-size:14px}
  th{padding:10px 14px;border:1px solid #ddd6fe;background:#f5f3ff;font-weight:700;text-align:left;color:#1e1b4b}
  td{padding:10px 14px;border:1px solid #ddd6fe;color:#1e1b4b}
  img{max-width:100%;height:auto;display:block;margin:0 0 18px;border-radius:8px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="wrap">{{content}}</div>
</body>
</html>`,
  },
  {
    name: 'Editorial',
    description: 'Warm cream background, Georgia serif font, bold black top border. Elegant newspaper feel.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#faf9f7;font-family:Georgia,'Times New Roman',Times,serif;color:#1c1917;font-size:17px;line-height:1.8}
  .wrap{max-width:580px;margin:0 auto;padding:56px 32px}
  .top-rule{border-top:3px solid #1c1917;margin-bottom:40px;padding-top:16px}
  .top-rule .label{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#78716c}
  p{margin:0 0 18px;text-align:justify}
  h1{font-size:2.5em;font-weight:700;margin:0 0 20px;color:#0c0a09;line-height:1.15;font-style:italic;letter-spacing:-0.02em}
  h2{font-size:1.5em;font-weight:700;margin:36px 0 14px;color:#0c0a09;line-height:1.25;border-bottom:1px solid #d6d3d1;padding-bottom:8px}
  h3{font-size:1.2em;font-weight:700;margin:28px 0 10px;color:#0c0a09;font-style:italic}
  h4,h5,h6{font-size:1em;font-weight:700;margin:20px 0 8px;color:#0c0a09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:0.05em;font-size:0.8em}
  ul,ol{margin:0 0 18px;padding-left:28px}
  li{margin:4px 0}
  li p{margin:0;text-align:left}
  blockquote{margin:28px 0;padding:0 0 0 24px;border-left:3px solid #1c1917;color:#44403c;font-style:italic;font-size:1.1em}
  blockquote p{margin:0;text-align:left}
  pre{margin:0 0 18px;padding:18px 22px;background:#f5f5f4;border-radius:0;overflow-x:auto;font-size:13px;line-height:1.65;border:1px solid #e7e5e4;font-family:'SFMono-Regular',Consolas,monospace}
  code{background:#f5f5f4;padding:2px 6px;border-radius:2px;font-size:0.875em;color:#1c1917;font-family:'SFMono-Regular',Consolas,monospace}
  pre code{background:none;padding:0}
  hr{border:none;border-top:1px solid #1c1917;margin:36px auto;width:120px}
  a{color:#1c1917;text-decoration:underline}
  a:hover{color:#44403c}
  table{width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  th{padding:10px 14px;border-bottom:2px solid #1c1917;border-top:2px solid #1c1917;font-weight:700;text-align:left}
  td{padding:10px 14px;border-bottom:1px solid #d6d3d1}
  img{max-width:100%;height:auto;display:block;margin:0 0 18px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
  .footer{margin-top:48px;padding-top:24px;border-top:1px solid #d6d3d1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#a8a29e;text-align:center}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top-rule"><span class="label">Newsletter</span></div>
    {{content}}
    <div class="footer"><p>You received this because you subscribed to our newsletter.</p></div>
  </div>
</body>
</html>`,
  },
  {
    name: 'Dark',
    description: 'Deep navy background with a slate card, white text, and indigo accents. Perfect for dark-mode audiences.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#e2e8f0;font-size:15px;line-height:1.75}
  .outer{padding:40px 16px}
  .card{max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;box-shadow:0 4px 24px rgba(0,0,0,0.4)}
  .header-bar{height:3px;background:linear-gradient(90deg,#4f46e5,#818cf8)}
  .body{padding:40px 48px}
  p{margin:0 0 16px;color:#cbd5e1}
  h1{font-size:1.875em;font-weight:700;margin:0 0 16px;color:#f1f5f9;line-height:1.25}
  h2{font-size:1.375em;font-weight:700;margin:28px 0 12px;color:#f1f5f9;line-height:1.3}
  h3{font-size:1.15em;font-weight:600;margin:22px 0 10px;color:#e2e8f0}
  h4,h5,h6{font-size:1em;font-weight:600;margin:18px 0 8px;color:#e2e8f0}
  ul,ol{margin:0 0 16px;padding-left:28px;color:#cbd5e1}
  li{margin:4px 0}
  li p{margin:0}
  blockquote{margin:0 0 16px;padding:12px 20px;border-left:4px solid #4f46e5;color:#94a3b8;background:#0f172a;border-radius:0 6px 6px 0}
  blockquote p{margin:0;color:#94a3b8}
  pre{margin:0 0 16px;padding:16px 20px;background:#0f172a;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.65;border:1px solid #1e293b}
  code{background:#0f172a;padding:2px 6px;border-radius:4px;font-size:0.875em;color:#818cf8;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;border:1px solid #334155}
  pre code{background:none;padding:0;border:none;color:#a5b4fc}
  hr{border:none;border-top:1px solid #334155;margin:28px 0}
  a{color:#818cf8;text-decoration:underline}
  a:hover{color:#a5b4fc}
  table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px}
  th{padding:10px 14px;border:1px solid #334155;background:#0f172a;font-weight:600;text-align:left;color:#e2e8f0}
  td{padding:10px 14px;border:1px solid #334155;color:#cbd5e1}
  img{max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:6px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
  .footer{padding:24px 48px;background:#0f172a;border-top:1px solid #334155;text-align:center}
  .footer p{margin:0;font-size:12px;color:#475569}
</style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="header-bar"></div>
      <div class="body">{{content}}</div>
      <div class="footer"><p>You received this email because you subscribed to our newsletter.</p></div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    name: 'Minimal',
    description: 'Pure white background, no card, maximum whitespace, ultra-clean sans-serif with thin gray separators.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111111;font-size:16px;line-height:1.8}
  .wrap{max-width:520px;margin:0 auto;padding:64px 24px}
  p{margin:0 0 20px}
  h1{font-size:2em;font-weight:700;margin:0 0 24px;color:#000000;line-height:1.2;letter-spacing:-0.025em}
  h2{font-size:1.35em;font-weight:700;margin:40px 0 16px;color:#000000;line-height:1.3}
  h3{font-size:1.1em;font-weight:700;margin:32px 0 12px;color:#000000}
  h4,h5,h6{font-size:0.95em;font-weight:700;margin:24px 0 10px;color:#000000;text-transform:uppercase;letter-spacing:0.06em}
  ul,ol{margin:0 0 20px;padding-left:24px}
  li{margin:5px 0}
  li p{margin:0}
  blockquote{margin:0 0 20px;padding:0 0 0 20px;border-left:2px solid #e0e0e0;color:#555555;font-style:normal}
  blockquote p{margin:0}
  pre{margin:0 0 20px;padding:20px;background:#f8f8f8;overflow-x:auto;font-size:13px;line-height:1.65;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8}
  code{background:#f3f3f3;padding:2px 6px;font-size:0.875em;color:#111111;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
  pre code{background:none;padding:0}
  hr{border:none;border-top:1px solid #e8e8e8;margin:40px 0}
  a{color:#000000;text-decoration:underline;text-underline-offset:3px}
  a:hover{text-decoration-thickness:2px}
  table{width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px}
  th{padding:10px 0;border-bottom:2px solid #111111;font-weight:700;text-align:left}
  td{padding:10px 0;border-bottom:1px solid #e8e8e8}
  img{max-width:100%;height:auto;display:block;margin:0 0 20px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
  .footer{margin-top:56px;padding-top:24px;border-top:1px solid #e8e8e8;font-size:12px;color:#999999}
  .footer p{margin:0}
</style>
</head>
<body>
  <div class="wrap">
    {{content}}
    <div class="footer"><p>You received this because you subscribed to our newsletter.</p></div>
  </div>
</body>
</html>`,
  },
  {
    name: 'Newsletter',
    description: 'Indigo header band with subject title, white card body, and newsletter footer. Traditional newsletter layout.',
    template_html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#374151;font-size:15px;line-height:1.75}
  .outer{padding:32px 16px 48px}
  .card{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(79,70,229,0.12),0 8px 32px rgba(79,70,229,0.08)}
  .header{background:#4f46e5;padding:40px 48px 36px;background:linear-gradient(135deg,#4338ca 0%,#4f46e5 60%,#6366f1 100%)}
  .header .label{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:12px}
  .header h1{margin:0 0 8px;font-size:1.75em;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em}
  .header .subtitle{margin:0;font-size:14px;color:rgba(255,255,255,0.75);font-weight:400}
  .body{padding:40px 48px}
  p{margin:0 0 16px}
  h1{font-size:1.75em;font-weight:700;margin:0 0 14px;color:#111827;line-height:1.25}
  h2{font-size:1.3em;font-weight:700;margin:28px 0 12px;color:#111827;line-height:1.3;padding-bottom:8px;border-bottom:2px solid #eef2ff}
  h3{font-size:1.1em;font-weight:600;margin:22px 0 8px;color:#1e40af}
  h4,h5,h6{font-size:0.95em;font-weight:600;margin:18px 0 8px;color:#374151;text-transform:uppercase;letter-spacing:0.05em}
  ul,ol{margin:0 0 16px;padding-left:28px}
  li{margin:5px 0}
  li p{margin:0}
  blockquote{margin:0 0 16px;padding:14px 20px;border-left:4px solid #4f46e5;background:#eef2ff;color:#3730a3;border-radius:0 8px 8px 0}
  blockquote p{margin:0}
  pre{margin:0 0 16px;padding:16px 20px;background:#1e1b4b;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.65;color:#c7d2fe}
  code{background:#eef2ff;padding:2px 6px;border-radius:4px;font-size:0.875em;color:#4338ca;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
  pre code{background:none;padding:0;color:#c7d2fe}
  hr{border:none;border-top:1px solid #e5e7eb;margin:28px 0}
  a{color:#4f46e5;text-decoration:underline}
  a:hover{color:#3730a3}
  table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px}
  th{padding:10px 14px;border:1px solid #e5e7eb;background:#eef2ff;font-weight:600;text-align:left;color:#1e40af}
  td{padding:10px 14px;border:1px solid #e5e7eb}
  img{max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:6px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
  .footer{padding:24px 48px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center}
  .footer p{margin:0 0 6px;font-size:12px;color:#9ca3af}
  .footer a{color:#6b7280;font-size:12px}
</style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="header">
        <div class="label">Newsletter</div>
        <h1>{{subject}}</h1>
        <p class="subtitle">Your weekly update — thank you for reading.</p>
      </div>
      <div class="body">{{content}}</div>
      <div class="footer">
        <p>You received this email because you subscribed to our newsletter.</p>
        <a href="#">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
];
