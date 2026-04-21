const fs = require('fs');
let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// 1. Add state variables
content = content.replace(
  "const [displayName, setDisplayName] = useState('')",
  "const [displayName, setDisplayName] = useState('')\n  const [userAvatar, setUserAvatar] = useState<string | null>(null)\n  const [uploadingAvatar, setUploadingAvatar] = useState(false)"
);

// 2. Add properties to fetchUserData
content = content.replace(
  "setDisplayName(profileData.profile?.full_name || session?.user?.name || '')",
  "setDisplayName(profileData.profile?.full_name || session?.user?.name || '')\n          setUserAvatar(profileData.profile?.metadata?.avatar_url || null)"
);

// 3. Add handleAvatarUpload
const snippet = fs.readFileSync('avatar_snippet.txt', 'utf8');
content = content.replace(
  "const handleSaveName = async () => {",
  snippet + "\n\n  const handleSaveName = async () => {"
);

// 4. Update Header DOM to render Avatar & trigger upload
const headerImgOld = `<div className="w-16 h-16 bg-white/30 border-2 border-white/50 rounded-full flex items-center justify-center text-2xl font-bold">
                  {(displayName || session?.user?.name || 'U')[0].toUpperCase()}
                </div>`;

const headerImgNew = `<div className="relative w-16 h-16 bg-white/30 border-2 border-white/50 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (displayName || session?.user?.name || 'U')[0].toUpperCase()
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0">
                      <FaEdit className="text-white text-sm" />
                    </div>
                  )}
                </div>`;

content = content.replace(headerImgOld, headerImgNew);

fs.writeFileSync('src/app/profile/page.tsx', content);
