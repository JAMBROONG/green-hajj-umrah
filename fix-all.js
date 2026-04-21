const fs = require('fs');
let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// 1. Fix the semicolon bug
const oldStateLines = `  const [userPhone, setUserPhone] = useState('')
  const [displayName, setDisplayName] = useState('')    const [userAvatar, setUserAvatar] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [showAvatarMenu, setShowAvatarMenu] = useState(false)
    const [showViewAvatar, setShowViewAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {`;
const newStateLines = `  const [userPhone, setUserPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {`;

content = content.replace(oldStateLines, newStateLines);

// 2. Fix handleAvatarUpload being inside handleSaveName
const badHandleSaveName = `  const handleSaveName = async () => {
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`;

const fixedHandleSaveName = `  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Ensure it's an image
    if (!file.type.startsWith('image/')) {
      showError('Pilih file gambar yang valid')
      return
    }

    setUploadingAvatar(true)
    
    try {
      // Read file and resize with canvas
      const base64Avatar = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
          const img = new Image()
          img.src = event.target?.result as string
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const MAX_WIDTH = 256
            const MAX_HEIGHT = 256
            let width = img.width
            let height = img.height

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width
                width = MAX_WIDTH
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height
                height = MAX_HEIGHT
              }
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, width, height)
            
            // compress to webp or jpeg
            resolve(canvas.toDataURL('image/jpeg', 0.8))
          }
          img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
      })

      const response = await fetch('/api/auth/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: base64Avatar }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserAvatar(base64Avatar)
        showSuccess('Foto profil berhasil diperbarui')
      } else {
        const data = await response.json()
        showError(data.error || 'Gagal memperbarui foto profil')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showError('Terjadi kesalahan saat mengunggah foto')
    } finally {
      setUploadingAvatar(false)
      // Reset input value so same file can be uploaded again if needed
      if (e.target) e.target.value = ''
    }
  }

  const handleSaveName = async () => {`;

content = content.replace(badHandleSaveName, `  const handleSaveName = async () => { /* TEMP */ `);

// Because we replaced badHandleSaveName with TEMP, we need to find the close brace of the original handleAvatarUpload
// It's followed by "if (!editName.trim()) {"
content = content.replace(
`    }
    if (!editName.trim()) {`,
`    if (!editName.trim()) {`
);

// Now replace TEMP with the correct function strings
content = content.replace(`  const handleSaveName = async () => { /* TEMP */ `, fixedHandleSaveName);

// 3. Create a fresh backup just in case
fs.writeFileSync('page.bak2.tsx', content);

fs.writeFileSync('src/app/profile/page.tsx', content);
console.log('Fixed semicolon AND handleAvatarUpload scope');
