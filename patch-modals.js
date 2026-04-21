const fs = require('fs');

let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

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

content = content.replace('    </div>\n  )\n}', modalsCode + '\n    </div>\n  )\n}');
fs.writeFileSync('src/app/profile/page.tsx', content);
