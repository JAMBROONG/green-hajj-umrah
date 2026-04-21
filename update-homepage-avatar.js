const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add state variable
content = content.replace(
  "const userName = session?.user?.name || 'Pengguna';",
  "const userName = session?.user?.name || 'Pengguna';\n  const [userAvatar, setUserAvatar] = useState<string | null>(null);"
);

// 2. Add fetchProfile in useEffect
const useEffectStr = "  useEffect(() => {\n    loadTrips();\n    loadUserStats();";
const fetchProfileStr = `  useEffect(() => {
    loadTrips();
    loadUserStats();
    
    // Load avatar if any
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setUserAvatar(data.profile?.metadata?.avatar_url || null);
        }
      } catch (err) {
        console.error('Failed to load avatar:', err);
      }
    };
    if (session?.user) {
      fetchProfile();
    }`;

content = content.replace(useEffectStr, fetchProfileStr);

// 3. Update DOM inside Greeting
const greetingDOM = `<div className="px-5 pt-10 pb-4">
              <p className="text-xs text-white/80 mb-0.5 drop-shadow">Green Haj &amp; Umrah</p>
              <h1 id="greetingText" className="text-2xl font-bold text-white drop-shadow">
                {greeting},<br />{userName}
              </h1>
            </div>`;

const newGreetingDOM = `<div className="px-5 pt-10 pb-4 flex justify-between items-start">
              <div>
                <p className="text-xs text-white/80 mb-0.5 drop-shadow">Green Haj &amp; Umrah</p>
                <h1 id="greetingText" className="text-2xl font-bold text-white drop-shadow">
                  {greeting},<br />{userName}
                </h1>
              </div>
              <Link 
                href="/profile?tab=account" 
                className="relative w-12 h-12 rounded-full border-2 border-white/50 bg-white/20 flex flex-shrink-0 items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/80 transition-transform active:scale-95 shadow-md mt-1"
                aria-label="Profil Akun"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-lg font-bold drop-shadow-md">
                    {(userName || 'U')[0].toUpperCase()}
                  </span>
                )}
              </Link>
            </div>`;

content = content.replace(greetingDOM, newGreetingDOM);

fs.writeFileSync('src/app/page.tsx', content);
