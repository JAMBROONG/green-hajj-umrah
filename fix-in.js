const fs = require('fs');

let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
let snippet = fs.readFileSync('avatar_snippet.txt', 'utf8');

const regex = /  const handleSaveName = async \(\) => {/;

if (regex.test(content)) {
  content = content.replace(regex, snippet + `\n\n  const handleSaveName = async () => {`);
  fs.writeFileSync('src/app/profile/page.tsx', content, 'utf8');
  console.log("Successfully injected handleAvatarUpload");
} else {
  console.log("Failed to find handleSaveName");
}
