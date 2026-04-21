const fs = require('fs');

let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// 1. Add hook imports
content = content.replace(
  "import { useEffect, useState, Suspense } from 'react'",
  "import { useEffect, useState, Suspense, useRef } from 'react'"
);

// 2. Add state
const oldStateStr = "const [uploadingAvatar, setUploadingAvatar] = useState(false)";
const newStateStr = `const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)`;
content = content.replace(oldStateStr, newStateStr);

// 3. Replace Avatar DOM
const avatarRegex = /<div className="relative w-16 h-16 bg-white\/30 border-2 border-white\/50 rounded-[^>]*>([\s\S]*?)<\/div>\s*<div className="flex-1">/m;
const newAvatarDom = `<div 
                  className="relative w-16 h-16 bg-white/30 border-2 border-white/50 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer group"
                  onClick={() => setShowAvatarMenu(true)}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      setShowAvatarMenu(false);
                      handleAvatarUpload(e);
                    }}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (displayName || session?.user?.name || 'U')[0].toUpperCase()
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0">
                      <FaEdit className="text-white text-sm" />
                    </div>
                  )}
                </div>
                <div className="flex-1">`;
content = content.replace(avatarRegex, newAvatarDom);

// 4. Add modals at the bottom before closing the container
const modalsCode = `
      {/* Avatar Options Modal */}
      {showAvatarMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={() => setShowAvatarMenu(false)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-4 space-y-2" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-2">Foto Profil</h2>
            <div className="flex flex-col gap-2">
              {userAvatar && (
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    setShowViewAvatar(true);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-800 font-medium transition-colors"
                >
                  Lihat Foto
                </button>
              )}
              <button
                onClick={() => {
                  setShowAvatarMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-800 font-medium transition-colors"
              >
                {userAvatar ? 'Ganti Foto' : 'Upload Foto'}
              </button>
              <button
                onClick={() => setShowAvatarMenu(false)}
                className="w-full text-center px-4 py-3 mt-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Avatar Fullscreen Modal */}
      {showViewAvatar && userAvatar && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-5" onClick={() => setShowViewAvatar(false)}>
          <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
            <img src={userAvatar} alt="Profile Full" className="w-full h-full object-contain rounded-xl" />
          </div>
          <button 
            className="absolute top-5 right-5 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
            onClick={() => setShowViewAvatar(false)}
          >
            ✕
          </button>
        </div>
      )}
`;

content = content.replace('      </div>\n    )\n  }\n\n  export default function ProfilePage() {', modalsCode + '\n      </div>\n    )\n  }\n\n  export default function ProfilePage() {');

fs.writeFileSync('src/app/profile/page.tsx', content);
console.log('Profile page patched successfully.');
