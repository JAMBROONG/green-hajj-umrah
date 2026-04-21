const fs = require('fs');
let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
content = content.replace("    </div>\n    </>\n  )\n}", "    </div>\n  )\n}");
fs.writeFileSync('src/app/profile/page.tsx', content, 'utf8');
