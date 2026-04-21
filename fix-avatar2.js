const fs = require('fs');

let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

const correctStr = `  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

// Let's replace the whole faulty block safely via regex or exact string match:
// Since there's indentation changes, let's find the exact limits.
const regex = /  const handleSaveName = async \(\) => {\s*const handleAvatarUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => {[\s\S]*?      }\s*}\s*if \(\!editName\.trim\(\)\) {/g;

if (regex.test(content)) {
  console.log("Found block to replace via Regex!");
  content = content.replace(regex, correctStr + `\n    if (!editName.trim()) {`);
  fs.writeFileSync('src/app/profile/page.tsx', content, 'utf8');
} else {
  console.log("Could not find block via Regex either.");
}
