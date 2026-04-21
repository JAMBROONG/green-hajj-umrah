const fs = require('fs');
let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// cleanup duplicates
content = content.replace(
`  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)`,
`  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)`);

fs.writeFileSync('src/app/profile/page.tsx', content);
