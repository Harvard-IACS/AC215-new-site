export function renderDocument(template, page, content) {
  if (!template.includes('<div id="root"></div>')) throw new Error('Expected one empty app root.');
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return template
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(page.description)}" />`);
}
